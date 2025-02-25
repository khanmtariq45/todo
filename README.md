EXEC [inf].[register_script_for_execution] 
    'QMS', 
    'QMS_Document', 
    'AESM Bug 706153 DB Change 993117: AESM - Multiple Vessels - In QMS, vessel unable to view documents.', 
    'O', 
    @SQL_Script;


    EXEC [inf].[utils_inf_backup_table] 'PURC_DTL_REQSN_Status'

EXEC [inf].[utils_inf_backup_table] 'PURC_DTL_SUPPLY_ITEMS'

INSERT INTO [PURC_DTL_REQSN_Status] (
	[ID]
	,[OFFICE_ID]
	,[VESSEL_CODE]
	,[REQUISITION_CODE]
	,[DOCUMENT_CODE]
	,[REQUISITION_STATUS]
	,[REQUISITION_COMMENTS]
	,[Created_By]
	)VALUES (
	(
		SELECT max(ID) + 1
		FROM PURC_DTL_REQSN_Status
		)
	,0
	,'6304'
	,'UST-ADM-OPEN-0000009/25'
	,'6304250220155258'
	,'NRQ'
	,''
	,1
	)GO


UPDATE PURC_DTL_SUPPLY_ITEMS
SET REQUISITION_CODE = 'UST-ADM-OPEN-0000009/25'
WHERE DOCUMENT_CODE = '6304250220155258'
GO


EXEC [purc].[sync_vessel_to_office_requisition_data] '6304250220155258'
	,'6304'


