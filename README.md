 private void SaveFolderVesselAssignments()
        {
            QmsAutoSyncConfiguration settings;

            while (true)
            {
                settings = objQms.getConfigDetails();
                _logLevel = settings.LogLevel;
                UDFLib.LogDebug("SaveFolderVesselAssignments", "Getting pending assignment requests", _logLevel);
                var requests = objQms.GetPendingAssignmentRequests(settings.ProcessingBatchSize);
                UDFLib.LogDebug("SaveFolderVesselAssignments", "Got " + requests.Count + " assignment requests", _logLevel);

                foreach (var req in requests)
                {
                    UDFLib.LogDebug("SaveFolderVesselAssignments", "Getting vessel assignment requests for request: " + req.Uid, _logLevel);
                    var vesselAssignmentRequests =
                        objQms.GetPendingVesselAssignmentsRequests(req.Uid);
                    UDFLib.LogDebug("SaveFolderVesselAssignments", "Got " + requests.Count + " vessel assignment requests", settings.LogLevel);

                    var opt = new ParallelOptions() { MaxDegreeOfParallelism = settings.AutoAssignProcessingParallelismDegree };
                    Parallel.ForEach(vesselAssignmentRequests, opt, assignReq =>
                    {
                        UDFLib.LogDebug("SaveFolderVesselAssignments", "Saving assignment " + assignReq.Key.Item2
                            + ", folder UID: " + assignReq.Key.Item1 + ", request UID:" + req.Uid, _logLevel);
                        objQms.SaveVesselAssignment(assignReq.Key.Item2, assignReq.Key.Item1,
                            req.Uid, req.DeletePreviousAssignments, req.CreatedBy, assignReq.Value);


                        if (req.AutoSyncFiles)
                        {
                            UDFLib.LogDebug("SaveFolderVesselAssignments", "Adding assignment to ledger " + assignReq.Key.Item2
                            + ", folder UID: " + assignReq.Key.Item1 + ", request UID:" + req.Uid, _logLevel);
                            AddFolderVesselAssignmentsToLedger(assignReq.Key.Item2,
                                assignReq.Key.Item1, req.Uid);
                        }
                    });

                    UDFLib.LogDebug("SaveFolderVesselAssignments", "Updating request " + req.Uid + " status to WaitingForSync", _logLevel);
                    objQms.UpdateAssignmentRequestStatus(req.Uid,
                        QMSEnums.QmsVesselAssignmentRequestStatusEnum.WaitingForSync);
                }

                if (requests.Count < settings.ProcessingBatchSize)
                {
                    break;
                }
                else
                {
                    // A simple protection against CPU overutilization.
                    Thread.Sleep(250);
                }
            }
        }
