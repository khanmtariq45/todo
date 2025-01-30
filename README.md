INSERT INTO qms_file_vessel_sync_ledger
        (vessel_assignment_id, date_of_creation, [status], [source], file_version)
    select distinct va.ID, @Today, @Status, @Source, va.FileVersion
    from QMS_DTL_Vessel_Assignment va
    inner join LIB_VESSELS lv on
    va.Vessel_ID = lv.Vessel_ID and lv.Active_Status = 1 and lv.INSTALLATION = 1
    inner join QMSdtlsFile_Log fl ON va.Document_ID = fl.ID AND
    fl.Version = va.FileVersion and fl.Active_Status = 1 and fl.NodeType = 0
    where va.Active_Status = 1 and
        NOT EXISTS (
            select 1
            from qms_file_vessel_sync_ledger l
            where va.ID = l.vessel_assignment_id
        )
