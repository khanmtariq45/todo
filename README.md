  private void LedgerRecordsSyncProcess()
        {
            int latestVesselAssignmentId = -1;
            QmsAutoSyncConfiguration config;

            while (true)
            {
                try
                {
                    config = objQms.getConfigDetails();
                    _logLevel = config.LogLevel;
                    UDFLib.LogDebug("LedgerRecordsSyncProcess", "Getting records from ledger", _logLevel);
                    var records = objQms.GetRecordsFromLedger(config.ProcessingBatchSize,
                        latestVesselAssignmentId);
                    UDFLib.LogDebug("LedgerRecordsSyncProcess", "latestVesselAssignmentId is: " + latestVesselAssignmentId, _logLevel);
                    UDFLib.LogDebug("LedgerRecordsSyncProcess", "Got " + records.Count + " ledger records", _logLevel);
                    UDFLib.LogDebug("LedgerRecordsSyncProcess", "QMS config values - SyncToVesselMaxRetries: " + config.SyncToVesselMaxRetries + ", VerificationRequestMaxRetries: " + config.VerificationRequestMaxRetries, _logLevel);

                    if (records.Count != 0)
                    {
                        latestVesselAssignmentId = records[records.Count - 1].VesselAssignId;
                    }

                    var ledgerRecordsDic = objQms.GroupByLedgerRecordsByVessel(records);

                    var opt = new ParallelOptions() { MaxDegreeOfParallelism = config.AutoSyncVesselParalellismDegree };
                    Parallel.ForEach(ledgerRecordsDic, opt, entry =>
                    {
                        UDFLib.LogDebug("LedgerRecordsSyncProcess", "Processing vessel: " + entry.Key + ", number of assignments: " + entry.Value.Count, _logLevel);
                        var syncVerificationRequestBatch = new List<Tuple<FileSyncLedgerRecord, bool>>();

                        var opt1 = new ParallelOptions() { MaxDegreeOfParallelism = config.AutoSyncAssignmentParalellismDegree };
                        Parallel.ForEach(entry.Value, opt1, rec =>
                        {
                            UDFLib.LogTrace("LedgerRecordsSyncProcess", "Processing assignment: " + rec.VesselAssignId
                                + " for file: " + rec.FileId + ", vessel: " + rec.VesselId + " status: " + rec.Status, _logLevel);
                            UDFLib.LogTrace("LedgerRecordsSyncProcess", "RetryCount: " + rec.RetryCount + ", VerificationRequestRetryCount: " + rec.VerificationRequestRetryCount, _logLevel);
                            if (rec.RetryCount < config.SyncToVesselMaxRetries &&
                                rec.VerificationRequestRetryCount < config.VerificationRequestMaxRetries)
                            {
                                if (rec.AssignmentFileVersion != rec.FileVersion)
                                {
                                    rec.FileVersion = rec.AssignmentFileVersion;
                                    rec.RetryCount = 0;
                                    rec.VerificationRequestRetryCount = 0;

                                    //Seting to pending to make sure proper version is saved in the Pending section and synced if not previously synced.
                                    rec.Status = QMSEnums.QmsFileSyncStatusEnum.Pending;
                                    objQms.ResetLedgerRecord(rec.VesselAssignId, (char)rec.Status, rec.AssignmentFileVersion);
                                }

                                switch (rec.Status)
                                {
                                    case QMSEnums.QmsFileSyncStatusEnum.Pending:
                                        // Checking if we already synced the records before.
                                        var newAssigment = !objQms.IsSentToVessel(rec.FileId, rec.VesselId, rec.FileVersion);

                                        objQms.SyncQmsLedgerRecordToVessel(rec.VesselAssignId,
                                            rec.FileId, rec.VesselId, rec.FileVersion, rec.FilePath, newAssigment, true);

                                        break;
                                    case QMSEnums.QmsFileSyncStatusEnum.ConfirmationPending:
                                        if (objQms.CheckDataLogRecordsProcessed(rec.FileId, rec.FileName, rec.VesselId))
                                        {
                                            objQms.updateQmsLedger(rec.VesselAssignId, QMSEnums.QmsFileSyncStatusEnum.SentToVessel, rec.FileVersion);
                                            lock (syncVerificationRequestBatch)
                                            {
                                                syncVerificationRequestBatch.Add(Tuple.Create(rec, false));
                                            }
                                        }
                                        break;
                                    case QMSEnums.QmsFileSyncStatusEnum.SentToVessel:
                                        lock (syncVerificationRequestBatch)
                                        {
                                            syncVerificationRequestBatch.Add(Tuple.Create(rec, true));
                                        }
                                        break;
                                    case QMSEnums.QmsFileSyncStatusEnum.Failed:
                                    case QMSEnums.QmsFileSyncStatusEnum.Retry:
                                        objQms.SyncQmsLedgerRecordToVessel(rec.VesselAssignId,
                                            rec.FileId, rec.VesselId, rec.FileVersion, rec.FilePath, true, false);

                                        lock (syncVerificationRequestBatch)
                                        {
                                            syncVerificationRequestBatch.Add(Tuple.Create(rec, false));
                                        }
                                        break;
                                    case QMSEnums.QmsFileSyncStatusEnum.ConfirmedOnVessel:
                                        break;
                                    default:
                                        break;
                                }
                            }
                            else if (rec.Status != QMSEnums.QmsFileSyncStatusEnum.Failed)
                            {
                                objQms.updateQmsLedger(rec.VesselAssignId, QMSEnums.QmsFileSyncStatusEnum.Failed, rec.FileVersion);
                            }
                        });
                        UDFLib.LogDebug("LedgerRecordsSyncProcess", "Sending verification requests", _logLevel);
                        objQms.SendVerificatioRequestToVessel(syncVerificationRequestBatch,
                            entry.Key, config.SyncToVesselMaxfilesPerVerificationRequest);
                    });

                    UDFLib.LogDebug("LedgerRecordsSyncProcess", "Updating completed assignment requests", _logLevel);
                    // mark all requests that all there records in ledger has been synced or failed and reach to max retried as completed
                    objQms.UpdateAssignmentRequestStatusForCompletedRequests();

                    if (records.Count < config.ProcessingBatchSize)
                    {
                        break;
                    }
                    else
                    {
                        // A simple protection against CPU overutilization.
                        Thread.Sleep(250);
                    }
                }
                catch(Exception ex)
                {
                    UDFLib.LogError(ex, _logLevel);
                    Thread.Sleep(250);
                }
            }
        }
