drop table if exists #TempIDs
CREATE TABLE #TempIDs (id INT);

WITH RecursiveCTE AS (
    SELECT id, Active_Status
    FROM QMSdtlsFile_Log
    WHERE Active_Status = 0
    
    UNION ALL
    
    SELECT c.id, c.Active_Status
    FROM QMSdtlsFile_Log c
    JOIN RecursiveCTE r ON c.parentId = r.id
    WHERE c.Active_Status = 1
)
INSERT INTO #TempIDs (id)
SELECT id FROM RecursiveCTE where Active_Status = 1;

UPDATE QMSdtlsFile_Log
SET active_status = 0, Date_Of_Deletion = GETDATE(), Deleted_By = 769
WHERE id IN (SELECT id FROM #TempIDs);

DELETE FROM qms.full_text_content 
WHERE document_id IN (SELECT id FROM #TempIDs);

DECLARE @DocID INT;

DECLARE doc_cursor CURSOR FOR
SELECT id FROM #TempIDs

OPEN doc_cursor;

FETCH NEXT FROM doc_cursor INTO @DocID;

WHILE @@FETCH_STATUS = 0
BEGIN
   declare @SQL_UPDATE1 varchar(1000) = FORMATMESSAGE('DELETE FROM qms.full_text_content WHERE document_id=%d', @DocID);
   exec SYNC_SP_DataSynchronizer_DataLog null, null, null, 0, @SQL_UPDATE1

   DECLARE @SQL_UPDATE2 VARCHAR(1000) = FORMATMESSAGE('UPDATE QMSdtlsFile_Log SET active_status = 0, Date_Of_Deletion = GETDATE(), Deleted_By = 769 WHERE id=%d', @DocID);
   EXEC SYNC_SP_DataSynchronizer_DataLog NULL, NULL, NULL, 0, @SQL_UPDATE2;

   FETCH NEXT FROM doc_cursor INTO @DocID;
END

CLOSE doc_cursor;
DEALLOCATE doc_cursor;

DROP TABLE #TempIDs;
