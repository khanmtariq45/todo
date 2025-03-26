private void SaveFolderVesselAssignments()
{
    QmsAutoSyncConfiguration settings;

    while (true)
    {
        try
        {
            settings = objQms.getConfigDetails();
            _logLevel = settings.LogLevel;
            UDFLib.LogDebug("SaveFolderVesselAssignments", "Getting pending assignment requests", _logLevel);
            var requests = objQms.GetPendingAssignmentRequests(settings.ProcessingBatchSize);
            UDFLib.LogDebug("SaveFolderVesselAssignments", "Got " + requests.Count + " assignment requests", _logLevel);

            if (requests.Count == 0)
            {
                break;
            }

            foreach (var req in requests)
            {
                try
                {
                    UDFLib.LogDebug("SaveFolderVesselAssignments", "Getting vessel assignment requests for request: " + req.Uid, _logLevel);
                    var vesselAssignmentRequests = objQms.GetPendingVesselAssignmentsRequests(req.Uid);
                    UDFLib.LogDebug("SaveFolderVesselAssignments", "Got " + vesselAssignmentRequests.Count + " vessel assignment requests", settings.LogLevel);

                    if (vesselAssignmentRequests.Count > 0)
                    {
                        var opt = new ParallelOptions() { MaxDegreeOfParallelism = settings.AutoAssignProcessingParallelismDegree };
                        
                        try
                        {
                            Parallel.ForEach(vesselAssignmentRequests, opt, assignReq =>
                            {
                                try
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
                                }
                                catch (Exception ex)
                                {
                                    UDFLib.LogError("SaveFolderVesselAssignments", 
                                        $"Error processing assignment (Vessel: {assignReq.Key.Item2}, Folder: {assignReq.Key.Item1}): {ex.Message}", ex);
                                }
                            });
                        }
                        catch (AggregateException ae)
                        {
                            foreach (var ex in ae.InnerExceptions)
                            {
                                UDFLib.LogError("SaveFolderVesselAssignments", 
                                    $"Parallel processing error for request {req.Uid}: {ex.Message}", ex);
                            }
                        }
                    }

                    UDFLib.LogDebug("SaveFolderVesselAssignments", "Updating request " + req.Uid + " status to WaitingForSync", _logLevel);
                    objQms.UpdateAssignmentRequestStatus(req.Uid,
                        QMSEnums.QmsVesselAssignmentRequestStatusEnum.WaitingForSync);
                }
                catch (Exception ex)
                {
                    UDFLib.LogError("SaveFolderVesselAssignments", 
                        $"Error processing request {req.Uid}: {ex.Message}", ex);
                }
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
        catch (Exception ex)
        {
            UDFLib.LogError("SaveFolderVesselAssignments", $"Error in main processing loop: {ex.Message}", ex);
            Thread.Sleep(1000); // Wait before retrying after error
        }
    }
}