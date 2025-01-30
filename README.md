select LevelID,Approve_By,Active_Status,ApprovalStatus from   
 QMS_FILE_APPROVAL where   
 QMSID=@fileID and  Active_Status=1 
 order by version desc,LevelID desc
