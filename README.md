Pass below script as  @SQL_Script to SP 

EXEC [inf].[register_script_for_execution] 
    'QMS', 
    'QMS_Document', 
    'DB Change 1111', 
    'O', 
    @SQL_Script;

Declare @VesselId int;
Declare @VesselName varchar(200) = 'Niara';
Select @VesselId = Vessel_ID from lib_vessels where Vessel_Name=@VesselName;

DECLARE @script nvarchar(max) = '
			EXEC [inf].[utils_inf_backup_table] ''INF_LIB_Nav_Modules''
			
			EXEC [inf].[utils_inf_backup_table] ''INF_LIB_Screens''

	DELETE from INF_LIB_Nav_Modules where Name = ''Document Viewer''
	IF not exists (SELECT * from INF_LIB_Nav_Modules where Name = ''Document Viewer'')
		BEGIN
        INSERT INTO INF_LIB_Nav_Modules (Module_ID, Project_ID, Screen_ID, Name, Image_Path, Default_Module, Created_By, Date_Of_Creation,Active_Status, Display_Order)
        VALUES((SELECT isnull(Max(Module_ID),0)+1 from INF_LIB_Nav_Modules), (SELECT Project_ID from INF_LIB_Nav_Projects WHERE Name = ''Quality''),  0
        ,''Document Viewer'', NULL,0,1,GETDATE(),1,NULL)
	END
	
	DELETE from INF_LIB_Screens where Screen_Name = ''Document Viewer''
	IF not exists (SELECT * from INF_LIB_Screens where Screen_Name = ''Document Viewer'')
		BEGIN
        insert into INF_LIB_Screens (Screen_ID, Module_ID, Screen_Name, Class_Name, Assembly_Name, Screen_Type, Image_Path, Created_By, Date_Of_Creation, Active_Status)
        values ((SELECT isnull(max(Screen_ID) , 0)+1  from INF_LIB_Screens ),(SELECT Module_ID from INF_LIB_Nav_Modules where name = ''Document Viewer''),
        ''Document Viewer'',''J2Landing.J2LandingPage#/qms/document/D4D44BEEF21627A6466DBBF45608247C'',''J2Landing'',2,NULL,1,GETDATE(),1)
	END

	IF exists (SELECT * from INF_LIB_Nav_Modules where Name = ''Document Viewer'')
    BEGIN
		update INF_LIB_Nav_Modules
		set Screen_ID = (SELECT Screen_ID from INF_LIB_Screens where Screen_Name = ''Document Viewer'')
		where Name = ''Document Viewer''
    END

	    IF Exists(SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N''[dbo].[INF_DTL_Vessel_Rank_Menu_Acess]'') AND type in (N''U''))
       BEGIN
		EXEC [inf].[utils_inf_backup_table] ''INF_DTL_Vessel_Rank_Menu_Acess''
       END
	
	DECLARE @tempCrwRanksId table(CrId int)
    DECLARE @maxMenuId int=0, @screenId int=0
    INSERT INTO @tempCrwRanksId
    SELECT ID from CRW_LIB_Crew_Ranks where Rank_Short_Name in(''MST'',''CPT'',''MSTR'',''C/O'',''C/OFF'',''C/E'',''2/E'',''C/OF'' , ''MST1'') and Active_Status=1
    SELECT @screenId = Screen_ID FROM INF_LIB_Screens where Screen_Name=''Document Viewer''
    DECLARE @RNO1 as INT=0, @RNOPre1 as INT=0,@UpdatedRankID INT=0
    SELECT TOP 1 @RNO1=ROW_NUMBER() OVER(ORDER BY CrId ASC),@UpdatedRankID=CrId FROM @tempCrwRanksId
        WHILE @RNO1 > 0
    BEGIN
    SELECT @maxMenuId= ISNULL(MAX(Menu_ID),0)+1 FROM INF_DTL_Vessel_Rank_Menu_Acess
    IF NOT EXISTS(SELECT Menu_ID FROM INF_DTL_Vessel_Rank_Menu_Acess WHERE Rank_ID=@UpdatedRankID and Screen_ID=@screenId)
      BEGIN
          INSERT INTO  INF_DTL_Vessel_Rank_Menu_Acess (Menu_ID,Vessel_ID,Rank_ID,Screen_ID,Access_Menu,Access_View,Access_Add,Access_Edit,Access_Delete,Access_Approve,
          Created_By,Date_Of_Creation,Modified_By,Date_Of_Modified,Deleted_By,Date_Of_Deleted,Active_Status) -- ,uid)
          VALUES(@maxMenuId,0,@UpdatedRankID,@screenId,1,1,1,1,1,1,
          1,GETDATE(),NULL,NULL,NULL,NULL,1) -- ,newid())
      END
    SET @RNOPre1 =@RNO1
      SET @RNO1=0
      SELECT  TOP 1  @RNO1=RNO , @UpdatedRankID=CrId
      FROM (SELECT ROW_NUMBER() OVER(ORDER BY CrId ASC)as RNO,CrId FROM @tempCrwRanksId )tbl where tbl.RNO > @RNOPre1
    END
';

EXEC [SYNC_SP_DataSynchronizer_DataLog] '', '', '', @VesselId, @script;
