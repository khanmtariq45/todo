CREATE PROCEDURE [dbo].[SP_Update_Menu_Access]
    @VesselName VARCHAR(200),
    @MainMenuName VARCHAR(200),
    @MenuName VARCHAR(200),
    @MenuID VARCHAR(50) -- Assuming it's a string (GUID format)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @VesselId INT;
    SELECT @VesselId = Vessel_ID FROM lib_vessels WHERE Vessel_Name = @VesselName;

    DECLARE @script NVARCHAR(MAX) = '
        EXEC [inf].[utils_inf_backup_table] ''INF_LIB_Nav_Modules'';
        EXEC [inf].[utils_inf_backup_table] ''INF_LIB_Screens'';

        DELETE FROM INF_LIB_Nav_Modules WHERE Name = ''' + @MenuName + ''';
        IF NOT EXISTS (SELECT 1 FROM INF_LIB_Nav_Modules WHERE Name = ''' + @MenuName + ''')
        BEGIN
            INSERT INTO INF_LIB_Nav_Modules (Module_ID, Project_ID, Screen_ID, Name, Image_Path, Default_Module, Created_By, Date_Of_Creation, Active_Status, Display_Order)
            VALUES ((SELECT ISNULL(MAX(Module_ID),0)+1 FROM INF_LIB_Nav_Modules),
                    (SELECT Project_ID FROM INF_LIB_Nav_Projects WHERE Name = ''' + @MainMenuName + '''),  
                    0, ''' + @MenuName + ''', NULL, 0, 1, GETDATE(), 1, NULL);
        END

        DELETE FROM INF_LIB_Screens WHERE Screen_Name = ''' + @MenuName + ''';
        IF NOT EXISTS (SELECT 1 FROM INF_LIB_Screens WHERE Screen_Name = ''' + @MenuName + ''')
        BEGIN
            INSERT INTO INF_LIB_Screens (Screen_ID, Module_ID, Screen_Name, Class_Name, Assembly_Name, Screen_Type, Image_Path, Created_By, Date_Of_Creation, Active_Status)
            VALUES ((SELECT ISNULL(MAX(Screen_ID),0)+1 FROM INF_LIB_Screens),
                    (SELECT Module_ID FROM INF_LIB_Nav_Modules WHERE Name = ''' + @MenuName + '''), 
                    ''' + @MenuName + ''',
                    ''J2Landing.J2LandingPage#/qms/document/' + @MenuID + ''',
                    ''J2Landing'', 2, NULL, 1, GETDATE(), 1);
        END

        IF EXISTS (SELECT 1 FROM INF_LIB_Nav_Modules WHERE Name = ''' + @MenuName + ''')
        BEGIN
            UPDATE INF_LIB_Nav_Modules
            SET Screen_ID = (SELECT Screen_ID FROM INF_LIB_Screens WHERE Screen_Name = ''' + @MenuName + ''')
            WHERE Name = ''' + @MenuName + ''';
        END

        IF EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N''[dbo].[INF_DTL_Vessel_Rank_Menu_Acess]'') AND type = ''U'')
        BEGIN
            EXEC [inf].[utils_inf_backup_table] ''INF_DTL_Vessel_Rank_Menu_Acess'';
        END

        DECLARE @tempCrwRanksId TABLE (CrId INT);
        DECLARE @maxMenuId INT = 0, @screenId INT = 0;
        
        INSERT INTO @tempCrwRanksId
        SELECT ID FROM CRW_LIB_Crew_Ranks WHERE Rank_Short_Name IN (''MST'', ''CPT'', ''MSTR'', ''C/O'', ''C/OFF'', ''C/E'', ''2/E'', ''C/OF'', ''MST1'') AND Active_Status = 1;
        
        SELECT @screenId = Screen_ID FROM INF_LIB_Screens WHERE Screen_Name = ''' + @MenuName + ''';

        DECLARE @RNO1 INT = 0, @RNOPre1 INT = 0, @UpdatedRankID INT = 0;
        SELECT TOP 1 @RNO1 = ROW_NUMBER() OVER (ORDER BY CrId ASC), @UpdatedRankID = CrId FROM @tempCrwRanksId;

        WHILE @RNO1 > 0
        BEGIN
            SELECT @maxMenuId = ISNULL(MAX(Menu_ID),0)+1 FROM INF_DTL_Vessel_Rank_Menu_Acess;
            
            IF NOT EXISTS (SELECT Menu_ID FROM INF_DTL_Vessel_Rank_Menu_Acess WHERE Rank_ID = @UpdatedRankID AND Screen_ID = @screenId)
            BEGIN
                INSERT INTO INF_DTL_Vessel_Rank_Menu_Acess (Menu_ID, Vessel_ID, Rank_ID, Screen_ID, Access_Menu, Access_View, Access_Add, Access_Edit, Access_Delete, Access_Approve,
                                                           Created_By, Date_Of_Creation, Modified_By, Date_Of_Modified, Deleted_By, Date_Of_Deleted, Active_Status)
                VALUES (@maxMenuId, 0, @UpdatedRankID, @screenId, 1, 1, 1, 1, 1, 1, 1, GETDATE(), NULL, NULL, NULL, NULL, 1);
            END

            SET @RNOPre1 = @RNO1;
            SET @RNO1 = 0;
            SELECT TOP 1 @RNO1 = RNO, @UpdatedRankID = CrId
            FROM (SELECT ROW_NUMBER() OVER (ORDER BY CrId ASC) AS RNO, CrId FROM @tempCrwRanksId) tbl
            WHERE tbl.RNO > @RNOPre1;
        END
    ';

    EXEC [SYNC_SP_DataSynchronizer_DataLog] '', '', '', @VesselId, @script;
END;