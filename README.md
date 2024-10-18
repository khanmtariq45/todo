public bool SaveVesselAssignment(string folderAssignmentUid, int folderId, string requestUid, bool deletePreviousAssignments, int createdBy, List<QmsAssignmentRequestVesselModel> records)
{
    bool isSuccess = false;

    DataTable dtFolders = new DataTable();
    dtFolders.Columns.Add("FolderID");

    var newFolderRow = dtFolders.NewRow();
    newFolderRow["FolderID"] = folderId;

    dtFolders.Rows.Add(newFolderRow);

    DataTable dtVessels = new DataTable();
    dtVessels.Columns.Add("VesselID");

    // Add all vessel IDs to the DataTable
    foreach (var rec in records)
    {
        var newRow = dtVessels.NewRow();
        newRow["VesselID"] = rec.VesselId;
        dtVessels.Rows.Add(newRow);
    }

    // Decide if we need to delete previous assignments
    if (deletePreviousAssignments && !records[0].PreviousAssignmentsDeleted)
    {
        // Call the SP with replaceAssignments flag set to true
        if (obj.QMS_Resync_AssignDocToVessel(dtFolders, dtVessels, createdBy) > 0)
        {
            isSuccess = true;
        }
    }
    else
    {
        // Call the SP for assignment creation with replaceAssignments flag set to false
        if (obj.QMS_Create_AssignToVessel(dtFolders, dtVessels, createdBy) > 0)
        {
            isSuccess = true;
        }
    }

    // Update the status based on success or failure
    if (deletePreviousAssignments && !records[0].PreviousAssignmentsDeleted && isSuccess)
    {
        obj.UpdatePreviousAssignmentsDeletedStatus(folderAssignmentUid);
    }

    return isSuccess ? 
        obj.UpdateFolderVesselAssignmentSuccessStatus(folderAssignmentUid) : 
        obj.UpdateFolderVesselAssignmentFailStatus(folderAssignmentUid);
}