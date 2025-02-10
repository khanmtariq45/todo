exec [inf].[utils_inf_backup_table] 'qms_file_vessel_sync_ledger'

update ledg
	set ledg.retry_count = 0,
    ledg.status = 'p',
    ledg.source = 's',
    ledg.date_of_modification = GETDATE(),
    ledg.last_sync_time = null,
    ledg.verification_request_last_sent_date = null,
    ledg.verification_request_retry_count = 0,
    ledg.metadata_sync_verified = null,
    ledg.file_sync_verified = null,
    ledg.last_error_message = null
 from QMS_DTL_Vessel_Assignment va
	inner join qms_file_vessel_sync_ledger ledg on ledg.vessel_assignment_id = va.ID
	inner join lib_vessels Vessel on Vessel.Vessel_ID = va.Vessel_ID
	where 
	Vessel.Active_Status=1 
  and va.Active_Status=1 
