DECLARE @ExecutionScript NVARCHAR(MAX);

-- Define the execution script for the stored procedure
SET @ExecutionScript = N'
EXEC [dbo].[SP_Update_Menu_Access] 
    @VesselName = ''SampleVessel'', 
    @MainMenuName = ''MainMenu'', 
    @MenuName = ''NewMenu'', 
    @MenuID = ''123'';';

-- Register the execution script dynamically
EXEC [inf].[register_script_for_execution] 
    'QMS', 
    'QMS_Document', 
    'DB Change 1111', 
    'O', 
    @ExecutionScript;