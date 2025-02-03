CREATE PROCEDURE [dbo].[QMS_SP_Files_SyncApproval_Search]     
                (                
                  @SerchText    VARCHAR(50)  = NULL                
                  ,@Approval_Status  INT    = NULL                
                  ,@Approved_By   INT    = NULL                 
                  ,@SORTBY    VARCHAR(100) = NULL                
                  ,@SORTDIRECTION   TINYINT   = NULL                
                  ,@PAGENUMBER   INT    = NULL                
                  ,@PAGESIZE    INT    = NULL                
                  ,@DownloadRequired  INT                
                  ,@SizeRange  LIB_PID readonly                
                  ,@ISFETCHCOUNT   INT  OUTPUT    
                )                
                AS                
                                                
                BEGIN                
                  SET NOCOUNT ON;                
                  declare @MaxLimit int = null                
                  select @MaxLimit = Size_KB from INF_LIB_Upload_File_Size_Limit where Attach_Prefix = 'QMS_' and Syncable = 1                
                  if @MaxLimit is null                
                  select @MaxLimit = 450                 
                  select @MaxLimit = @MaxLimit*1024  
                                                
                  DECLARE @SQLQUERY NVARCHAR(MAX)='',@WHERECLAUSE NVARCHAR(MAX)='',@SELECT_LIST NVARCHAR(MAX)='',@SORTORDER VARCHAR(10)='ASC',@PARAMETERLIST NVARCHAR(MAX)='', @TABLELIST NVARCHAR(MAX)='',@WHERECLAUSE1 NVARCHAR(MAX)='', @SQLQUERY1 NVARCHAR(MAX)='',@Office INT                
                                                
                  DECLARE @TABLEOUT TABLE                
                  (                
                  RCCOUNT INT NULL                
                  )                
                                                      
                  IF ISNULL(@SORTDIRECTION, 0) = 0                
                  SET @SORTORDER ='ASC'                
                  ELSE                
                  SET @SORTORDER ='DESC'                
                                                  
                                                
                  IF(@SORTBY IS NULL)                 
                  SET @SORTBY='ID'                
                                                  
                  SELECT @PARAMETERLIST = '@zSerchText   VARCHAR(20)                  
                    ,@zApproval_Status  INT                
                    ,@zApproved_By   INT                 
                    ,@zPAGENUMBER   INT                     
                    ,@zPAGESIZE    INT                  
                    ,@MaxLimit    INT                
                    ,@Office                INT  '                  
                                                  
                                                  
                                                  
                    IF(@SerchText IS NOT NULL)                
                      SET @WHERECLAUSE= @WHERECLAUSE +     
                      ' AND ((QMSdtlsFile_Log.LogFileID LIKE ''%''+ ISNULL(@zSerchText ,QMSdtlsFile_Log.LogFileID) +''%'') ) '
                                                              
                      IF(@Approval_Status = 0 )                
                      BEGIN                
                        SET @WHERECLAUSE1 += @WHERECLAUSE1 + ' (( isnull(SendToOffice,''N'') = ''N'' ) AND SyncID is null ) '
                        SET @Office=0               
                      END                
                      IF(@DownloadRequired = 1 )    
                      BEGIN    
                        SET @WHERECLAUSE +=     
                        'and ( 1=0  '        
                        if exists(select 1 from @SizeRange where PID = 0)        
                        SET @WHERECLAUSE +=      
                        ' or ( Round(CAST(isnull(QMSdtlsFile_Log.Size,0) AS dec(12,2))/CAST(1024 AS dec(12,2)),2) <= cast((20480/1024) as dec(12,2)) )'                  
                        if exists(select 1 from @SizeRange where PID = 1)        
                        SET @WHERECLAUSE +=      
                        'or ( Round(CAST(isnull(QMSdtlsFile_Log.Size,0) AS dec(12,2))/CAST(1024 AS dec(12,2)),2) >= cast((20480/1024) as dec(12,2)) and     
                        Round(CAST(isnull(QMSdtlsFile_Log.Size,0) AS dec(12,2))/CAST(1024 AS dec(12,2)),2) <= cast((30720/1024) as dec(12,2)) )'        
                        if exists(select 1 from @SizeRange where PID = 2)        
                        SET @WHERECLAUSE +=  ' or ( Round(CAST(isnull(QMSdtlsFile_Log.Size,0) AS dec(12,2))/CAST(1024 AS dec(  12,2)),2) >= cast    
                        ((30720/1024) as dec(12,2)) and     
                        Round(CAST(isnull(QMSdtlsFile_Log.Size,0) AS dec(12,2))/CAST(1024 AS dec(12,2)),2) <= cast((51200/1024) as dec(12,2)) )'         
                        if exists(select 1 from @SizeRange where PID = 3)    
						SET @WHERECLAUSE +=  ' or (    
                        Round(CAST(isnull(QMSdtlsFile_Log.Size,0) AS dec(12,2))/CAST(1024 AS dec(12,2)),2) >= cast((51200/1024) as dec(12,2)) and     
                        Round(CAST(isnull(QMSdtlsFile_Log.Size,0) AS dec(12,2))/CAST(1024 AS dec(12,2)),2) <= cast((102400/1024) as dec(12,2)) )'               
                                      
                        if exists(select 1 from @SizeRange where PID = 4)        
                        SET @WHERECLAUSE +=  ' or ( Round(CAST(isnull(QMSdtlsFile_Log.Size,0) AS dec(12,2))/CAST(1024 AS dec(12,2)),2) >=     
                        cast((102400/1024) as dec(12,2)) and     
                        Round(CAST(isnull(QMSdtlsFile_Log.Size,0) AS dec(12,2))/CAST(1024 AS dec(12,2)),2) <= cast((460800/1024) as dec(12,2)) )'                 
                        if exists(select 1 from @SizeRange where PID = 5)        
                        SET @WHERECLAUSE +=  ' or  ( Round(CAST(isnull(QMSdtlsFile_Log.Size,0) AS dec(12,2))/CAST(1024 AS dec(12,2)),2) >     
                        cast((460800/1024) as   dec(12,2)))'     SET @WHERECLAUSE += ' ) ' 
                      END                 
                                                
                      IF(@Approval_Status=0)                
                      BEGIN              
                        SET @SELECT_LIST = 'select * from (               
                        select ID, LogFileID,LOGManual1,FilePath,LOGManual2,Version,NodeType,LogDate,SendToOffice,DwdReq,Size,SyncID,            
                        CASE WHEN @zPAGENUMBER IS NOT NULL THEN ROW_NUMBER() OVER(ORDER BY '+ @SORTBY +' '+ @SORTORDER +') ELSE 0 END AS           
                        ROWNUM from(            
                        SELECT distinct ID, LogFileID,LOGManual1,FilePath,LOGManual2,            
                            Version,                      
                        NodeType,LogDate,SendToOffice,DwdReq,Size         
                        ,SyncID FROM (               
                            SELECT  * FROM              
                            (              
                            SELECT               
                            distinct(QMSdtlsFile_Log.ID) as ID              
                            ,QMSdtlsFile_Log.LogFileID               
                            ,QMSdtlsFile_Log.LOGManual1               
                            ,QMSdtlsFile_Log.FilePath              
                            ,QMSdtlsFile_Log.LOGManual2                       
                            ,QMSdtlsFile_Log.Version              
                            ,QMSdtlsFile_Log.NodeType                
                            ,QMSdtlsFile_Log.Date_Of_Creatation as LogDate              
                            ,'' as Operation_Type              
                            ,'' as FOIID       
                            ,QMSdtlsFile_Log.SendToOffice  
                            ,case when QMSdtlsFile_Log.Size <= @MaxLimit then 0  else 1 end as DwdReq              
                            ,CAST(isnull(QMSdtlsFile_Log.Size,0) AS dec(12,2))/CAST(1024 AS dec(12,2))   as Size              
                            ,CASE WHEN HS.SyncID is not null and HS.FileVersion=QMSdtlsFile_Log.version then HS.SyncID else null end as SyncID              
                            ,CASE WHEN Hs.VesselID is not null  then Hs.VesselID else 0 end as VesselID             
                            '              
                                                      
                        SET @TABLELIST = '  FROM QMSdtlsFile_Log                     
                          LEFT JOIN QMS_Sync_History HS ON HS.FileID=QMSdtlsFile_Log.ID                 
                          LEFT JOIN ( select * from QMSdtlsFile_Log where NODETYPE = 1 ) PLog On QMSdtlsFile_Log.ParentID= PLog.ID                
                          LEFT JOIN  QMS_DTL_Vessel_Assignment QA ON QA.Document_ID=QMSdtlsFile_Log.ID AND QA.Vessel_ID=HS.VesselID  AND QA.FileVersion=HS.FileVersion and QA.Active_Status=1                
						              LEFT JOIN qms_file_vessel_sync_ledger ldgr ON ldgr.vessel_assignment_id = QA.ID AND [status] IN (''p'', ''s'', ''r'')    
							  WHERE 1=1  and QMSdtlsFile_Log.NodeType = 0 AND QMSdtlsFile_Log.Active_Status=1 AND QMSdtlsFile_Log.FilePath is not null              
                          and ldgr.vessel_assignment_id is null
                          and QMSdtlsFile_Log.ID not in (          
                                    
                        select S.QMSID QMSID from QMS_FILE_APPROVAL s           
                        inner join (            
                          select MAX(LevelID) LevelID, QMSID from QMS_FILE_APPROVAL           
                          where Active_Status=1           
                          group by QMSID  having MAx(LevelID) is not null ) a on s.QMSID = a.QMSID and s.LevelID = a.LevelID          
                        INNER JOIN (          
                          SELECT  ApprovalStatus,Version,QMSID,LevelID,approve_By FROM QMS_FILE_APPROVAL WHERE Active_Status=1  AND QMSID =QMSdtlsFile_Log.ID           
                          )b ON B.QMSID=S.QMSID and b.LevelID=a.LevelID           
                        INNER JOIN lib_user u on u.userID=b.approve_By        
                          where u.Active_Status=1 and b.ApprovalStatus = 0 or b.Version is  null  and S.Active_Status = 1 and S.Parent_ID is not null              
                          )'              
                                              
                        SET @SQLQUERY =@SELECT_LIST+@TABLELIST+ @WHERECLAUSE +            
                                              
                        ') FINAL_TABLE where '+ @WHERECLAUSE1 +             
                        ' and ( Version>=(isnull((select  max(t1.FileVersion) as maxVersion from QMS_Sync_History t1     
                        where t1.FileID=FINAL_TABLE.ID group by t1.FileID),0)))'+'             
                                              
                        )res group by ID, LogFileID,LOGManual1,FilePath,LOGManual2,Version,NodeType,LogDate,SendToOffice,DwdReq,Size,SyncID           
                        )  FINAL_RESULT) FINAL_RESULT1             
                        WHERE ROWNUM between ((ISNULL(@zPAGENUMBER,-1) - 1) * ISNULL(@zPAGESIZE,1) + 1) AND (ISNULL(@zPAGENUMBER,-1) * ISNULL(@zPAGESIZE,-1))           
                        '           
                      END           
                      ELSE IF(@Approval_Status=1)                
                      BEGIN                
                        SET @SELECT_LIST = 'SELECT ID, LogFileID,LOGManual1,FilePath,LOGManual2,Version,NodeType,LogDate,SendToOffice,DwdReq,Size,SyncId,    
                        ROWNUM FROM (                 
                            SELECT CASE WHEN @zPAGENUMBER IS NOT NULL THEN ROW_NUMBER() OVER(ORDER BY '+ @SORTBY +' '+ @SORTORDER +')     
                            ELSE 0 END AS ROWNUM ,* FROM    
                            (                
                            SELECT                 
                            distinct(QMSdtlsFile_Log.ID) as ID                
                            ,QMSdtlsFile_Log.LogFileID                 
                            ,QMSdtlsFile_Log.LOGManual1                 
                              ,case when FV.FilePath is null then QMSdtlsFile_Log.FilePath else FV.FilePath end as FilePath                   
                            ,QMSdtlsFile_Log.LOGManual2                         
                            ,CASE WHEN SL.FileVersion IS null then QMSdtlsFile_Log.Version else SL.FileVersion end as Version                 
                            ,QMSdtlsFile_Log.NodeType                  
                            ,CASE WHEN FV.Date_Of_Creatation is null then QMSdtlsFile_Log.Date_Of_Creatation ELSE FV.Date_Of_Creatation end as LogDate                
                            ,'' as Operation_Type                
                            ,'' as FOIID                
                            ,case when QMSdtlsFile_Log.SendToOffice=''N'' THEN SL.Sync_Status else ''Y'' end as SendToOffice   
                            ,SyncId  
                            ,case when QMSdtlsFile_Log.Size <= @MaxLimit then 0  else 1 end as DwdReq                
                            ,CAST(isnull(QMSdtlsFile_Log.Size,0) AS dec(12,2))/CAST(1024 AS dec(12,2))   as Size                
                            '                
                                                
                        SET @TABLELIST = '  FROM QMSdtlsFile_Log                 
                                LEFT JOIN QMS_Sync_log SL ON SL.FileID=QMSdtlsFile_Log.ID                
                                LEFT jOIN QMS_FileVersionInfo FV ON FV.FileID=SL.FileID AND FV.Version=SL.FileVersion  and FV.Active_Status=1             
                                WHERE  QMSdtlsFile_Log.Active_Status=1'                
                        SET @SQLQUERY =@SELECT_LIST+@TABLELIST+ @WHERECLAUSE +') FINAL_TABLE where SendToOffice=''Y'' ) FINAL_RESULT                
                          WHERE ROWNUM between ((ISNULL(@zPAGENUMBER,-1) - 1) * ISNULL(@zPAGESIZE,1) + 1) AND (ISNULL(@zPAGENUMBER,-1) * ISNULL(@zPAGESIZE,-1)) '                
                      END                       
                                                  
                      EXEC sp_executesql @SQLQUERY,@PARAMETERLIST,@SerchText                  
                            ,@Approval_Status                   
                              ,@Approved_By                      
                            ,@PAGENUMBER                        
                            ,@PAGESIZE                 
                            ,@MaxLimit                
                            ,@Office                
                                                    
                      IF  ISNULL(@ISFETCHCOUNT,0) =1                
                      BEGIN                
                        IF(@Approval_Status=0)                
                        BEGIN                
                          SET @SELECT_LIST = 'select * from (               
                          select ID, LogFileID,LOGManual1,FilePath,LOGManual2,Version,NodeType,LogDate,SendToOffice,DwdReq,Size,SyncID,            
                          CASE WHEN @zPAGENUMBER IS NOT NULL THEN ROW_NUMBER() OVER(ORDER BY '+ @SORTBY +' '+ @SORTORDER +') ELSE 0 END AS           
                          ROWNUM from(            
                          SELECT distinct ID, LogFileID,LOGManual1,FilePath,LOGManual2,            
                              Version,            
                          NodeType,LogDate,SendToOffice,DwdReq,Size        
                          ,SyncID FROM (               
                              SELECT  * FROM              
                              (              
                              SELECT               
                              distinct(QMSdtlsFile_Log.ID) as ID              
                              ,QMSdtlsFile_Log.LogFileID               
                              ,QMSdtlsFile_Log.LOGManual1               
                              ,QMSdtlsFile_Log.FilePath              
                              ,QMSdtlsFile_Log.LOGManual2                       
                              ,QMSdtlsFile_Log.Version              
                              ,QMSdtlsFile_Log.NodeType                
                              ,QMSdtlsFile_Log.Date_Of_Creatation as LogDate              
                              ,'' as Operation_Type              
                              ,'' as FOIID              
                              ,QMSdtlsFile_Log.SendToOffice  
                              ,case when QMSdtlsFile_Log.Size <= @MaxLimit then 0  else 1 end as DwdReq              
                              ,CAST(isnull(QMSdtlsFile_Log.Size,0) AS dec(12,2))/CAST(1024 AS dec(12,2))   as Size              
                              ,CASE WHEN HS.SyncID is not null and HS.FileVersion=QMSdtlsFile_Log.version then HS.SyncID else null end as SyncID              
                            ,CASE WHEN Hs.VesselID is not null  then Hs.VesselID else 0 end as VesselID'                
                                  
                          SET @TABLELIST ='  FROM QMSdtlsFile_Log                     
                            LEFT JOIN QMS_Sync_History HS ON HS.FileID=QMSdtlsFile_Log.ID                 
                            LEFT JOIN ( select * from QMSdtlsFile_Log where NODETYPE = 1 ) PLog On QMSdtlsFile_Log.ParentID= PLog.ID                
                            LEFT JOIN  QMS_DTL_Vessel_Assignment QA ON QA.Document_ID=QMSdtlsFile_Log.ID AND QA.Vessel_ID=HS.VesselID      
                          AND QA.FileVersion=HS.FileVersion and QA.Active_Status=1   
						  LEFT JOIN qms_file_vessel_sync_ledger ldgr ON ldgr.vessel_assignment_id = QA.ID AND [status] IN (''p'', ''s'', ''r'') 
                            WHERE 1=1  and QMSdtlsFile_Log.NodeType = 0 AND QMSdtlsFile_Log.Active_Status=1 AND QMSdtlsFile_Log.FilePath is not null               
                            and ldgr.vessel_assignment_id is null
                            and QMSdtlsFile_Log.ID not in (          
                          select S.QMSID QMSID from QMS_FILE_APPROVAL s           
                          inner join (            
                            select MAX(LevelID) LevelID, QMSID from QMS_FILE_APPROVAL           
                            where Active_Status=1           
                            group by QMSID  having MAx(LevelID) is not null ) a on s.QMSID = a.QMSID and s.LevelID = a.LevelID          
                          INNER JOIN (          
                            SELECT  ApprovalStatus,Version,QMSID,LevelID,approve_By FROM QMS_FILE_APPROVAL WHERE Active_Status=1  AND QMSID =QMSdtlsFile_Log.ID           
                            )b ON B.QMSID=S.QMSID and b.LevelID=a.LevelID           
                          INNER JOIN lib_user u on u.userID=b.approve_By        
                            where u.Active_Status=1 and  b.ApprovalStatus = 0 or b.Version is  null  and S.Active_Status = 1 and S.Parent_ID is not null              
                          )'                    
                          SET @SQLQUERY1='SELECT COUNT(0)  FROM ('+@SELECT_LIST+@TABLELIST+ @WHERECLAUSE +') FINAL_TABLE where '+ @WHERECLAUSE1 +            
                          'and ( Version>=(isnull((select  max(t1.FileVersion) as maxVersion from QMS_Sync_History t1     
                          where t1.FileID=FINAL_TABLE.ID group by t1.FileID),0)))'+              
                          ')  FINAL_RESULT                
                          group by ID, LogFileID,LOGManual1,FilePath,LOGManual2,Version,NodeType,LogDate,SendToOffice,DwdReq,Size,SyncID           
                          )  FINAL_RESULT) FINAL_RESULT1             
                          '+ ') FINAL_RESULT'                 
                        END             
                                                
                        ELSE IF(@Approval_Status=1)                
                        BEGIN                
                          SET @SELECT_LIST = 'SELECT * FROM (                 
                              SELECT * FROM                
                              (                
                              SELECT                 
                                distinct(QMSdtlsFile_Log.ID) as ID                
                              ,QMSdtlsFile_Log.LogFileID                
                            ,CASE WHEN SL.FileVersion IS null then QMSdtlsFile_Log.Version else SL.FileVersion end as Version                 
                              ,case when FV.FilePath is null then QMSdtlsFile_Log.FilePath else FV.FilePath end as FilePath                   
                            ,case when QMSdtlsFile_Log.SendToOffice=''N''     
                            THEN SL.Sync_Status else ''Y'' end as SendToOffice, SyncId'    
                                                
                        SET @TABLELIST = ' FROM QMSdtlsFile_Log                 
                                  LEFT JOIN QMS_Sync_log SL ON SL.FileID=QMSdtlsFile_Log.ID                
                            LEFT jOIN QMS_FileVersionInfo FV ON FV.FileID=SL.FileID AND     
                            FV.Version=SL.FileVersion  and FV.Active_Status=1           
                                  WHERE  QMSdtlsFile_Log.Active_Status=1'              
                                                
                          SET @SQLQUERY1='SELECT COUNT(0)  FROM ('+@SELECT_LIST+@TABLELIST+ @WHERECLAUSE +') FINAL_TABLE WHERE SendToOffice=''Y'' )     
                          FINAL_RESULT) A'                
                        END                
                                                
                        INSERT INTO @TABLEOUT                
                        EXEC sp_executesql @SQLQUERY1,@PARAMETERLIST,@SerchText ,@Approval_Status ,@Approved_By                      
                            ,@PAGENUMBER                        
                            ,@PAGESIZE                 
                            ,@MaxLimit                
                            ,@Office                     
                                                              
                    SELECT @ISFETCHCOUNT = RCCOUNT FROM @TABLEOUT                
                    END                
                END
