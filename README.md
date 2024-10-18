     public bool SaveVesselAssignment(string folderAssignmentUid, int folderId, string requestUid, bool deletePreviousAssignments, int createdBy, List<QmsAssignmentRequestVesselModel> records)
        {
            bool isSuccess = false;

            DataTable dtFolders = new DataTable();
            dtFolders.Columns.Add("FolderID");

            var newFolderRow = dtFolders.NewRow();
            newFolderRow["FolderID"] = folderId;

            dtFolders.Rows.Add(newFolderRow);

            var synchronizationObject = new Object();

            var targetVesselIdentifiers = new HashSet<int>();

            foreach (var rec in records)
            {
                targetVesselIdentifiers.Add(rec.VesselId);
            }

            var vesselExecution = new Action<int, bool>((vesselId, replaceAssignments) =>
            {
                DataTable dtVessels = new DataTable();
                dtVessels.Columns.Add("VesselID");

                var newRow = dtVessels.NewRow();
                newRow["VesselID"] = vesselId;
                dtVessels.Rows.Add(newRow);

                if (replaceAssignments)
                {
                    if (obj.QMS_Resync_AssignDocToVessel(dtFolders, dtVessels, createdBy) > 0)
                    {
                        lock (synchronizationObject)
                        {
                            isSuccess |= true;
                        }
                    }
                }
                else
                {
                    if (obj.QMS_Create_AssignToVessel(dtFolders, dtVessels, createdBy) > 0)
                    {
                        lock (synchronizationObject)
                        {
                            isSuccess |= true;
                        }
                    }
                }
            });

            if (deletePreviousAssignments && !records[0].PreviousAssignmentsDeleted)
            {
                vesselExecution(records[0].VesselId, true);
                targetVesselIdentifiers.Remove(records[0].VesselId);
            }

            var settings = getConfigDetails();
            var parallelismOptions = new ParallelOptions() { MaxDegreeOfParallelism = settings.AssignmentVesselProcessingParallelismDegree };

            Parallel.ForEach(targetVesselIdentifiers, parallelismOptions, currentVesselId =>
            {
                vesselExecution(currentVesselId, false);
            });

            if (deletePreviousAssignments && !records[0].PreviousAssignmentsDeleted && isSuccess)
            {
                obj.UpdatePreviousAssignmentsDeletedStatus(folderAssignmentUid);
            }

            return isSuccess? obj.UpdateFolderVesselAssignmentSuccessStatus(folderAssignmentUid): 
                obj.UpdateFolderVesselAssignmentFailStatus(folderAssignmentUid);
        }
