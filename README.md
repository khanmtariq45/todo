DECLARE @FilePath varchar(250);
DECLARE @FileName varchar(50);
DECLARE @VesselID INT;

-- Declare a cursor to iterate over the document IDs for the current vessel
DECLARE SyncList CURSOR FOR
SELECT DISTINCT lf.filePath, va.vessel_ID 
FROM QMSdtlsFile_Log lf
INNER JOIN QMS_DTL_Vessel_Assignment va ON va.Document_ID = lf.id
INNER JOIN qms_file_vessel_sync_ledger led ON led.vessel_assignment_id = va.id
WHERE va.Active_Status = 1 AND lf.NodeType = 0 AND led.status IN ('r', 'f', 'p');

OPEN SyncList;
FETCH NEXT FROM SyncList INTO @FilePath, @VesselID;

WHILE @@FETCH_STATUS = 0
BEGIN
	
	DECLARE @SlashIndex int = CHARINDEX('/', REVERSE(@FilePath));
    SET @FileName = SUBSTRING(@FilePath, LEN(@FilePath) - @SlashIndex + 2, @SlashIndex + 1);
    EXEC SYNC_INS_DataLog_Attachments @FileName, @VesselID;

    FETCH NEXT FROM SyncList INTO @FilePath, @VesselID;
END

CLOSE SyncList;
DEALLOCATE SyncList;
