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
            
            var records = objQms.GetRecordsFromLedger(config.ProcessingBatchSize, latestVesselAssignmentId);
            UDFLib.LogDebug("LedgerRecordsSyncProcess", "latestVesselAssignmentId is: " + latestVesselAssignmentId, _logLevel);
            UDFLib.LogDebug("LedgerRecordsSyncProcess", "Got " + records.Count + " ledger records", _logLevel);

            if (records.Count != 0)
            {
                latestVesselAssignmentId = records[records.Count - 1].VesselAssignId;
            }

            var ledgerRecordsDic = objQms.GroupByLedgerRecordsByVessel(records);

            try
            {
                var opt = new ParallelOptions() { MaxDegreeOfParallelism = config.AutoSyncVesselParalellismDegree };
                Parallel.ForEach(ledgerRecordsDic, opt, entry =>
                {
                    try
                    {
                        UDFLib.LogDebug("LedgerRecordsSyncProcess", "Processing vessel: " + entry.Key + ", number of assignments: " + entry.Value.Count, _logLevel);
                        var syncVerificationRequestBatch = new List<Tuple<FileSyncLedgerRecord, bool>>();

                        try
                        {
                            var opt1 = new ParallelOptions() { MaxDegreeOfParallelism = config.AutoSyncAssignmentParalellismDegree };
                            Parallel.ForEach(entry.Value, opt1, rec =>
                            {
                                try
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
                                            rec.Status = QMSEnums.QmsFileSyncStatusEnum.Pending;
                                            objQms.ResetLedgerRecord(rec.VesselAssignId, (char)rec.Status, rec.AssignmentFileVersion);
                                        }

                                        try
                                        {
                                            switch (rec.Status)
                                            {
                                                case QMSEnums.QmsFileSyncStatusEnum.Pending:
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
                                            }
                                        }
                                        catch (Exception statusEx)
                                        {
                                            UDFLib.LogError($"Failed to process status {rec.Status} for assignment {rec.VesselAssignId}", statusEx, _logLevel);
                                        }
                                    }
                                    else if (rec.Status != QMSEnums.QmsFileSyncStatusEnum.Failed)
                                    {
                                        objQms.updateQmsLedger(rec.VesselAssignId, QMSEnums.QmsFileSyncStatusEnum.Failed, rec.FileVersion);
                                    }
                                }
                                catch (Exception recEx)
                                {
                                    UDFLib.LogError($"Failed to process assignment {rec.VesselAssignId}", recEx, _logLevel);
                                }
                            });
                        }
                        catch (AggregateException ae)
                        {
                            foreach (var ex in ae.Flatten().InnerExceptions)
                            {
                                UDFLib.LogError("Parallel assignment processing error", ex, _logLevel);
                            }
                        }

                        try
                        {
                            UDFLib.LogDebug("LedgerRecordsSyncProcess", "Sending verification requests for vessel " + entry.Key, _logLevel);
                            objQms.SendVerificatioRequestToVessel(syncVerificationRequestBatch,
                                entry.Key, config.SyncToVesselMaxfilesPerVerificationRequest);
                        }
                        catch (Exception verificationEx)
                        {
                            UDFLib.LogError($"Failed to send verification requests for vessel {entry.Key}", verificationEx, _logLevel);
                        }
                    }
                    catch (Exception vesselEx)
                    {
                        UDFLib.LogError($"Failed to process vessel {entry.Key}", vesselEx, _logLevel);
                    }
                });
            }
            catch (AggregateException ae)
            {
                foreach (var ex in ae.Flatten().InnerExceptions)
                {
                    UDFLib.LogError("Parallel vessel processing error", ex, _logLevel);
                }
            }

            try
            {
                UDFLib.LogDebug("LedgerRecordsSyncProcess", "Updating completed assignment requests", _logLevel);
                objQms.UpdateAssignmentRequestStatusForCompletedRequests();
            }
            catch (Exception updateEx)
            {
                UDFLib.LogError("Failed to update completed requests", updateEx, _logLevel);
            }

            if (records.Count < config.ProcessingBatchSize)
            {
                break;
            }
            else
            {
                Thread.Sleep(250);
            }
        }
        catch (Exception ex)
        {
            UDFLib.LogError("Main processing error", ex, _logLevel);
            Thread.Sleep(250);
        }
    }
}