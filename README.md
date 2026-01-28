correct syntax of single and double qoute

DECLARE 
@SqlScript nvarchar(max) = 
'
			EXEC [inf].[utils_inf_backup_table] ''JRA_DTL_HAZZARDS_APPROVAL''
			EXEC [inf].[utils_inf_backup_table] ''JRA_LIB_HAZARD_APPROVAL_LEVELS''
			EXEC [inf].[utils_inf_backup_table] ''JRA_LIB_HAZZARDS_APPROVAR''
			EXEC [inf].[utils_inf_backup_table] ''JRA_LIB_WORK_CATEGORY''			
			IF OBJECT_ID(N''dbo.JRA_DTL_HAZZARDS_APPROVAL'', N''U'') IS NOT NULL AND COL_LENGTH(''dbo.JRA_DTL_HAZZARDS_APPROVAL'', ''Approval_Based_On'') IS NULL
            BEGIN
				ALTER TABLE [dbo].[JRA_DTL_HAZZARDS_APPROVAL] 
                ADD [Approval_Based_On] CHAR(1) NOT NULL 
                    CONSTRAINT [DF_JRA_DTL_HAZZARDS_APPROVAL_Approval_Based_On_U] DEFAULT (''U''),
                    CONSTRAINT [CK_JRA_DTL_HAZZARDS_APPROVAL_Approval_Based_On] CHECK ([Approval_Based_On] = ''R'' OR [Approval_Based_On] = ''U'');
            END

            IF OBJECT_ID(N''dbo.JRA_LIB_HAZARD_APPROVAL_LEVELS'', N''U'') IS NOT NULL
            AND COL_LENGTH(''dbo.JRA_LIB_HAZARD_APPROVAL_LEVELS'', ''Approval_Based_On'') IS NULL
            BEGIN
                ALTER TABLE [dbo].[JRA_LIB_HAZARD_APPROVAL_LEVELS] 
                ADD [Approval_Based_On] CHAR(1) NOT NULL 
                    CONSTRAINT [DF_JRA_LIB_HAZARD_APPROVAL_LEVELS_Approval_Based_On_U] DEFAULT (''U''),
                    CONSTRAINT [CK_JRA_LIB_HAZARD_APPROVAL_LEVELS_Approval_Based_On] CHECK ([Approval_Based_On] = ''R'' OR [Approval_Based_On] = ''U'');
            END

            IF OBJECT_ID(N''dbo.JRA_LIB_HAZZARDS_APPROVAR'', N''U'') IS NOT NULL
            AND COL_LENGTH(''dbo.JRA_LIB_HAZZARDS_APPROVAR'', ''Approval_Based_On'') IS NULL
            BEGIN
                ALTER TABLE [dbo].[JRA_LIB_HAZZARDS_APPROVAR] 
                ADD [Approval_Based_On] CHAR(1) NOT NULL 
                    CONSTRAINT [DF_JRA_LIB_HAZZARDS_APPROVAR_Approval_Based_On_U] DEFAULT (''U''),
                    CONSTRAINT [CK_JRA_LIB_HAZZARDS_APPROVAR_Approval_Based_On] CHECK ([Approval_Based_On] = ''R'' OR [Approval_Based_On] = ''U'');
            END

            IF OBJECT_ID(N''dbo.JRA_LIB_WORK_CATEGORY'', N''U'') IS NOT NULL
            AND COL_LENGTH(''dbo.JRA_LIB_WORK_CATEGORY'', ''Approval_Based_On'') IS NULL
            BEGIN
                ALTER TABLE [dbo].[JRA_LIB_WORK_CATEGORY] 
                ADD [Approval_Based_On] CHAR(1) NOT NULL 
                    CONSTRAINT [DF_JRA_LIB_WORK_CATEGORY_Approval_Based_On_U] DEFAULT (''U''),
                    CONSTRAINT [CK_JRA_LIB_WORK_CATEGORY_Approval_Based_On] CHECK ([Approval_Based_On] = ''R'' OR [Approval_Based_On] = ''U'');
            END;


EXEC(''CREATE OR ALTER FUNCTION [dbo].[JRA_GET_PENDING_APPROVAL_LEVEL]     
(         
@Work_Categ_ID int,    
@Assessment_ID int,    
@Vessel_ID int
) RETURNS INT     
AS    
BEGIN    
	DECLARE @Approval_Level INT;
	DECLARE @ApprovalBasedOn NVARCHAR(1) = ''''U''''
  	SELECT @ApprovalBasedOn=Approval_Based_on FROM JRA_LIB_WORK_CATEGORY WHERE Work_Categ_ID=@Work_Categ_ID	

	DECLARE cursor_approval_levels CURSOR LOCAL FOR
	SELECT DISTINCT HAL.Approval_Level
	FROM JRA_LIB_HAZARD_APPROVAL_LEVELS HAL
	INNER JOIN JRA_LIB_HAZZARDS_APPROVAR LHA ON LHA.Aprroval_Level_ID = HAL.Approval_Level_ID AND LHA.Active_Status = 1
	INNER JOIN LIB_User LU ON LU.UserID = LHA.Approvar_Detail_ID AND LU.Active_Status = 1
	WHERE HAL.work_categ_id = @Work_Categ_ID
	AND HAL.[Type] = 1
	AND HAL.Active_Status = 1
	AND HAL.Approval_Level > 0
	ORDER BY HAL.Approval_Level

	OPEN cursor_approval_levels
	FETCH NEXT FROM cursor_approval_levels INTO @Approval_Level

	WHILE @@FETCH_STATUS = 0
	BEGIN
		IF NOT EXISTS (
				SELECT 1
				FROM JRA_DTL_HAZZARDS_APPROVAL HA
				WHERE office_id = 1
					AND Approval_Level = @Approval_Level
					AND work_categ_id = @Work_Categ_ID
					AND Assessment_ID = @Assessment_ID
					AND Vessel_ID = @Vessel_ID
					AND Active_Status = 1
					AND Approval_Based_On=@ApprovalBasedOn	
			)
		BEGIN
			RETURN @Approval_Level;
		END

		FETCH NEXT FROM cursor_approval_levels INTO @Approval_Level
	END

	CLOSE cursor_approval_levels
	DEALLOCATE cursor_approval_levels
	
	RETURN NULL;
END;'')


EXEC(''CREATE OR ALTER proc [dbo].[JRA_UPD_ASSESSMENT_STATUS]                  
(                  
@Assessment_ID int,                  
@Work_categ_ID int,                  
@Vessel_ID int,                  
@UserID int,                  
@Status varchar(50),                   
@Remark varchar(2000) = null                  
)                  
as                  
begin
declare @TableName nvarchar(500) = null,
@PkCondition nvarchar(500) = null,@Approval_Based_On nvarchar(1)
select @Approval_Based_On = ISNULL(Approval_Based_On, ''''U'''') 
from dbo.JRA_LIB_WORK_CATEGORY where Work_Categ_ID = @Work_Categ_ID        

                  
                  
                  
                  
if @Status = ''''Edit''''        
begin                  
                  
declare @NewMainVersion int = (select ISNULL(MAX(Version)+1,1) from JRA_DTL_RISK_ASSESSMENTS_LOG where Assessment_ID=@Assessment_ID and Vessel_ID=@Vessel_ID )
insert into JRA_DTL_RISK_ASSESSMENTS_LOG                  
(                  
Assessment_ID,                  
Vessel_ID,                  
Vessel_Name,                  
Work_Categ_Value,                  
Work_Category_Name,                  
Current_Assessment_Date,                  
Last_Assessment_Date,                  
Assessment_Status,                   
Created_By,                  
Date_Of_Creation,                   
Modified_By,                  
Date_Of_Modification,                  
Deleted_By,                  
Date_Of_Deletion,                  
Active_Status,                  
Version ,                  
Log_Office_ID                  
)                  
select                   
Assessment_ID,                  
A.Vessel_ID,                  
V.Vessel_Name,                  
W.Work_Categ_Value,                  
W.Work_Category_Name,                  
Current_Assessment_Date,                  
Last_Assessment_Date,                  
Assessment_Status,                   
A.Created_By,                  
A.Date_Of_Creation,                   
A.Modified_By,                  
A.Date_Of_Modification,                  
A.Deleted_By,                  
A.Date_Of_Deletion,                  
A.Active_Status,                  
@NewMainVersion ,                  
1                  
from JRA_DTL_RISK_ASSESSMENTS A                  
Left Join LIB_VESSELS V on A.Vessel_ID = V.Vessel_ID                  
Left Join JRA_LIB_WORK_CATEGORY W on A.Work_Categ_ID = W.Work_Categ_ID                  
where A.Vessel_ID=@Vessel_ID and Assessment_ID=@Assessment_ID                  
                  
set @TableName = ''''JRA_DTL_RISK_ASSESSMENTS_LOG''''                  
set  @PkCondition = ''''Assessment_ID=''''+cast(@Assessment_ID as varchar)+'''' and Vessel_ID=''''+CAST(@Vessel_ID as varchar)+'''' and Version=''''+cast(@NewMainVersion as varchar)+'''' and Log_Office_ID=1''''                 
EXEC SYNC_SP_DataSynch_MultiPK_DataLog @TableName, @PkCondition, @VESSEL_ID                  
                   
                  
                  
                  
declare @AD Table                  
(                  
Assessment_Dtl_ID int,                  
Vessel_ID int,                  
Office_ID int                  
)                  
                  
insert into @AD                  
select Assessment_Dtl_ID,Vessel_ID,Office_ID from JRA_DTL_ASSESSMENT_DETAILS where Assessment_ID=@Assessment_ID and Vessel_ID=@Vessel_ID                  
                  
while exists (select 1 from @AD)                  
begin                  
declare @Assessment_Dtl_IDT int = null,@Vessel_IDT int = null,@Office_IDT int = null                  
select top 1 @Assessment_Dtl_IDT = Assessment_Dtl_ID,@Vessel_IDT=Vessel_ID,@Office_IDT = Office_ID from @AD                  
                  
declare @NewDtlVersion int = (select ISNULL(MAX(Version)+1,1) from JRA_DTL_ASSESSMENT_DETAILS_LOG                  
where Assessment_Dtl_ID=@Assessment_Dtl_IDT and Vessel_ID=@Vessel_IDT and Office_ID=@Office_IDT )                 

      
insert into JRA_DTL_ASSESSMENT_DETAILS_LOG                  
(                  
Assessment_Dtl_ID,                  
Assessment_ID,                  
Vessel_ID,                  
Office_ID,          
Hazard_Description,                  
Control_Measure,                  
Severity,                  
Likelihood,                  
Initial_Risk,                  
Initial_Risk_Color,                  
Additional_Control_Measures,                  
Modified_Risk,                  
Modified_Risk_Color,                  
Created_By,                  
Date_Of_Creation,                  
Modified_By,                  
Date_Of_Modification,                  
Deleted_By,                  
Date_Of_Deletion,                  
Active_Status,                  
Version,                  
Log_Office_ID                   
)                   
select                  
Assessment_Dtl_ID,          
AD.Assessment_ID,                  
AD.Vessel_ID,                  
AD.Office_ID,                  
Hazard_Description,                  
Control_Measure,                  
Severity,                  
Likelihood,                  
Initial_Risk,                  
Initial_Risk_Color,                  
AD.Additional_Control_Measures,                  
Modified_Risk,                  
Modified_Risk_Color,                  
AD.Created_By,                  
AD.Date_Of_Creation,                  
AD.Modified_By,                  
AD.Date_Of_Modification,                  
AD.Deleted_By,                  
AD.Date_Of_Deletion,                  
AD.Active_Status,                
@NewDtlVersion,                  
1                  
from JRA_DTL_ASSESSMENT_DETAILS  AD                  
LEFT JOIN JRA_DTL_RISK_ASSESSMENTS A ON AD.Assessment_ID = A.Assessment_ID                    
LEFT JOIN JRA_LIB_WORK_CATEGORY W ON A.Work_Categ_ID = W.Work_Categ_ID                   
LEFT JOIN JRA_LIB_TYPES Sev on AD.Severity_ID = Sev.Type_ID                    
LEFT JOIN JRA_LIB_TYPES Lik on AD.Severity_ID = Lik.Type_ID                    
LEFT JOIN JRA_LIB_TYPES Rsk on AD.Initial_Risk_Value = Rsk.Type_ID                    
where                   
AD.Assessment_Dtl_ID=@Assessment_Dtl_IDT and  AD.Vessel_ID=@Vessel_IDT and AD.Office_ID=@Office_IDT                  
set @TableName = ''JRA_DTL_ASSESSMENT_DETAILS_LOG''                  
set  @PkCondition = ''Assessment_Dtl_ID=''+cast(@Assessment_Dtl_IDT as varchar)+'' and Vessel_ID=''+CAST(@Vessel_IDT as varchar)+''and Office_ID=''+cast(@Office_IDT as varchar)+'' and Version=''+cast(@NewDtlVersion as varchar)+'' and Log_Office_ID=1''              
 
     
     
EXEC SYNC_SP_DataSynch_MultiPK_DataLog @TableName, @PkCondition, @VESSEL_ID                  
                  
delete top(1) from @AD                   
end                  
 update                   
JRA_DTL_RISK_ASSESSMENTS                  
set                   
Mode=@Status                  
where                   
Assessment_ID=@Assessment_ID and                   
Vessel_ID=@Vessel_ID                  
                  
end                  
declare @New_Approval_Status_ID int = null                  
declare @Mode int = 0                  
                   
if @Status = ''Rework''                  
begin                  
                  
                   
                   
update JRA_DTL_HAZZARDS_APPROVAL set Active_Status = 0 where Assessment_ID=@Assessment_ID and Vessel_ID=@Vessel_ID                   
set @New_Approval_Status_ID   = (select ISNULL(MAX(Approval_Status_ID)+1,1) from JRA_DTL_HAZZARDS_APPROVAL)
insert into JRA_DTL_HAZZARDS_APPROVAL     
(                  
Approval_Status_ID,                  
Vessel_ID,                  
Office_ID,                  
Assessment_ID,                  
Work_Categ_ID,                  
Remark,                  
Approve_By,                  
Date_Of_Approval,                  
Reworked_By,                  
Date_Of_Rework,                   
Approval_Level,                   
Approval_Status,                  
Created_by,                 
Date_Of_Creation,                   
Active_Status,        
Approved_from_vessel,
Approval_Based_On
)                  
values                  
(                  
@New_Approval_Status_ID,                  
@Vessel_ID,                  
1,                  
@Assessment_ID,                  
@Work_categ_ID,                  
@Remark,                  
null,                  
null,                  
@UserID,                  
GETDATE(),                  
null,                  
0,                  
@UserID,                  
GETDATE(),                  
1,        
0,
@Approval_Based_On
)                  
                  
                  
if (select Mode from JRA_DTL_RISK_ASSESSMENTS where Assessment_ID=@Assessment_ID and Vessel_ID=@Vessel_ID and Active_Status = 1) = ''Edit''                  
begin     
set @Mode = 1                  
update JRA_DTL_RISK_ASSESSMENTS set Mode = null,Assessment_Status = @Status where Assessment_ID=@Assessment_ID and Vessel_ID=@Vessel_ID and Active_Status = 1                  
end                  
else                  
begin                  
update JRA_DTL_RISK_ASSESSMENTS set Assessment_Status = @Status where Assessment_ID=@Assessment_ID and Vessel_ID=@Vessel_ID and Active_Status = 1                  
end                  
                  
 
set @TableName = ''JRA_DTL_RISK_ASSESSMENTS''                  
set @PkCondition = ''Assessment_ID=''+CAST(@Assessment_ID as varchar(50))+'' and Vessel_ID=''+cast(@Vessel_ID as varchar)                  
EXEC SYNC_SP_DataSynch_MultiPK_DataLog @TableName, @PkCondition, @VESSEL_ID                  
                   
                   
declare @IDS table(Approval_Status_ID int, Office_ID int )                
insert into @IDS                  
select Approval_Status_ID,Office_ID from JRA_DTL_HAZZARDS_APPROVAL where Assessment_ID=@Assessment_ID and Vessel_ID=@VESSEL_ID 
       
while exists (select 1 from @IDS)                  
begin                  
declare @IDT int = (select top 1 Approval_Status_ID from @IDS)         
DECLARE  @Office_ID int  = (Select Office_ID from @IDS where Approval_Status_ID = @IDT)      
select @IDT, @Office_ID           
set @TableName = ''JRA_DTL_HAZZARDS_APPROVAL''                  
set @PkCondition = ''Approval_Status_ID=''+CAST(@IDT as varchar(50))+'' and Vessel_ID=''+cast(@Vessel_ID as varchar(50))+'' and Office_ID=''''+cast(@Office_ID as varchar(50))                  
EXEC SYNC_SP_DataSynch_MultiPK_DataLog @TableName, @PkCondition, @VESSEL_ID                   
delete from @IDS where Approval_Status_ID = @IDT                 
end                  
                  
                  
                  
                  
                  
end                   
                  
if @Status = ''Approved''                  
begin
	SET @New_Approval_Status_ID = (SELECT  ISNULL(MAX(Approval_Status_ID)+ 1, 1) FROM JRA_DTL_HAZZARDS_APPROVAL);   

	DECLARE @Pending_Approval_Level INT = [dbo].[JRA_GET_PENDING_APPROVAL_LEVEL](@Work_Categ_ID, @Assessment_ID, @Vessel_ID);

	INSERT INTO JRA_DTL_HAZZARDS_APPROVAL
	(
		Approval_Status_ID,
		Vessel_ID,
		Office_ID,
		Assessment_ID,
		Work_Categ_ID,
		Remark,
		Approve_By,
		Date_Of_Approval,
		Approval_Level,
		Approval_Status,
		Created_by,
		Date_Of_Creation,
		Active_Status,
		Approved_from_vessel,
		Approval_Based_On
	)
	VALUES
	(
		@New_Approval_Status_ID,
		@Vessel_ID,
		1,
		@Assessment_ID,
		@Work_categ_ID,
		@Remark,
		@UserID,
		GETDATE(),
		@Pending_Approval_Level,
		1,
		@UserID,
		GETDATE(),
		1,
		0,
		@Approval_Based_On
	);

	declare @verificationType varchar(50) = [dbo].[JRA_GET_VERIFICATION_TYPE](@Work_categ_ID, @Assessment_ID, @Vessel_ID);
	IF @verificationType = ''Office''
	BEGIN
		SET @Status= ''Approval Pending'';
	END
			
	UPDATE JRA_DTL_RISK_ASSESSMENTS
	SET Assessment_Status = @Status, Modified_By = @UserID, Date_Of_Modification = GETDATE()
	WHERE Active_Status = 1 AND Assessment_ID = @Assessment_ID AND Vessel_ID = @Vessel_ID;
 
  set @TableName = ''JRA_DTL_RISK_ASSESSMENTS''                  
  set @PkCondition = ''Assessment_ID=''+CAST(@Assessment_ID as varchar(50))+'' and Vessel_ID=''+cast(@Vessel_ID as varchar)                  
  EXEC SYNC_SP_DataSynch_MultiPK_DataLog @TableName, @PkCondition, @VESSEL_ID                  
  set @TableName = ''JRA_DTL_HAZZARDS_APPROVAL''                  
  set @PkCondition = ''Approval_Status_ID=''+CAST(@New_Approval_Status_ID as varchar(50))+'' and Vessel_ID=''+cast(@Vessel_ID as varchar)+'' and Office_ID=1''                  
  EXEC SYNC_SP_DataSynch_MultiPK_DataLog @TableName, @PkCondition, @VESSEL_ID                   
                  
end

IF @Status = ''Approval Pending''               
BEGIN   
    IF NOT EXISTS (SELECT 1 
                   FROM JRA_LIB_HAZARD_APPROVAL_LEVELS 
                   WHERE Work_Categ_ID = @Work_categ_ID 
                   AND Approval_Level > 0
                   AND Active_Status = 1)
    BEGIN
        SET @Status = ''Approved'';
    END 

    UPDATE JRA_DTL_RISK_ASSESSMENTS              
    SET Assessment_Status = @Status, 
        Modified_By = @UserID, 
        Date_Of_Modification = GETDATE()
    WHERE Assessment_ID = @Assessment_ID 
    AND Vessel_ID = @Vessel_ID  
    AND Active_Status = 1;
END
                 
                   
                   
if @Mode = 1                  
begin                  
declare @Ass_Details table                  
(                  
Assessment_Dtl_ID int,                  
Vessel_ID int,                  
Office_ID int                  
)                  
declare @Assessment_Dtl_ID_T int = null,@Office_ID_T int = null                  
insert into @Ass_Details                  
select Assessment_Dtl_ID,Vessel_ID,Office_ID from JRA_DTL_ASSESSMENT_DETAILS where Vessel_ID=@Vessel_ID and Assessment_ID=@Assessment_ID                  
while exists (select 1 from @Ass_Details)                  
begin                   
select top 1 @Office_ID_T = Office_ID,@Assessment_Dtl_ID_T = Assessment_Dtl_ID   from @Ass_Details             
set @TableName = ''JRA_DTL_ASSESSMENT_DETAILS''                  
set @PkCondition = ''Assessment_Dtl_ID=''+CAST(@Assessment_Dtl_ID_T as varchar(50))+'' and Vessel_ID=''+cast(@Vessel_ID as varchar)+'' and Office_ID=''+cast(@Office_ID_T as varchar)                  
EXEC SYNC_SP_DataSynch_MultiPK_DataLog @TableName, @PkCondition, @VESSEL_ID                    
delete top(1) from @Ass_Details                  
end                   
                  
end                   
                   
                   
                   
end; '')



EXEC(''CREATE OR ALTER FUNCTION [dbo].[JRA_GET_PENDING_APPROVERS]
            (     
            @Assessment_ID int,
            @Vessel_ID int,
            @UserID    int    
            ) RETURNS varchar(500)     
            AS     
            BEGIN     
            declare @Result varchar(500) = '''';
            DECLARE @Approval_Based_On NVARCHAR(1) = ''''U'''',@Assessment_Status varchar(50) = null,@Work_Categ_ID INT, @vStep NVARCHAR(MAX)=''''0''''  
            SELECT @Work_Categ_ID=ra.Work_Categ_Id,@Assessment_Status=Assessment_Status FROM JRA_DTL_RISK_ASSESSMENTS ra Where Assessment_ID=@Assessment_ID and ra.Vessel_ID=@Vessel_ID
            SELECT @Approval_Based_On=Approval_Based_on FROM JRA_LIB_WORK_CATEGORY WHERE Work_Categ_ID=@Work_Categ_ID
            
            DECLARE @Pending_Approval_Level INT = [dbo].[JRA_GET_PENDING_APPROVAL_LEVEL](@Work_Categ_ID, @Assessment_ID, @Vessel_ID);  
            DECLARE @MAX_Approval_Level INT=0;
                IF (@Assessment_Status = ''Approval Pending'')
                BEGIN
                SET @vStep=''1'';
                declare @verificationType Varchar(50) = [dbo].[JRA_GET_VERIFICATION_TYPE](@Work_Categ_ID, @Assessment_ID, @Vessel_ID);

                    IF @verificationType = ''Office''
                    BEGIN            
                        SET @vStep=@vStep+'',2'';
                        SET @MAX_Approval_Level=(SELECT Max(Approval_Level) from JRA_LIB_HAZARD_APPROVAL_LEVELS where Work_Categ_ID=@Work_Categ_ID and Approval_Based_On=@Approval_Based_On and Active_Status=1)
                        IF @Approval_Based_On = ''R''
                        BEGIN
                            SET @vStep=@vStep+'',3'';
                            IF @Pending_Approval_Level IS NOT NULL AND EXISTS (
                                SELECT 1 
                                FROM JRA_LIB_HAZARD_APPROVAL_LEVELS HAL
                                INNER JOIN JRA_LIB_HAZZARDS_APPROVAR LHA ON LHA.Aprroval_Level_ID = HAL.Approval_Level_ID AND LHA.Approval_Based_on=HAL.Approval_Based_on AND LHA.Active_Status = 1
                                INNER JOIN JRA_LIB_WORK_CATEGORY WC ON WC.Work_Categ_ID =HAL.Work_Categ_ID  AND WC.Approval_Based_on=HAL.Approval_Based_on
                                WHERE HAL.Approval_Level = @Pending_Approval_Level 
                                    AND HAL.Work_Categ_ID = @Work_Categ_ID
                                    AND HAL.Active_Status = 1
                            )
                            BEGIN
                                SET @vStep=@vStep+'',4'';
                                SELECT @Result=STUFF((
                                SELECT DISTINCT '', '' + r.role
                                FROM INF_LIB_ROLES r
                                INNER JOIN JRA_LIB_HAZZARDS_APPROVAR LHA ON LHA.Approvar_Detail_ID = r.role_id
                                INNER JOIN JRA_LIB_HAZARD_APPROVAL_LEVELS HAL ON LHA.Aprroval_Level_ID = HAL.Approval_Level_ID AND LHA.Approval_Based_on=HAL.Approval_Based_on AND LHA.Active_Status = 1
                                WHERE r.active_status = 1 and HAL.Approval_Level = @Pending_Approval_Level
                                    AND HAL.Work_Categ_ID = @Work_Categ_ID AND HAL.Approval_Based_On=@Approval_Based_On
                                FOR XML PATH(''''), TYPE
                            ).value(''.'', ''NVARCHAR(MAX)''), 1, 2, '''');
                            IF isnull(@Result,'''')<>''''
                                BEGIN
                                    RETURN isnull(@Result,'''')+ CHAR(13) + CHAR(10) +''(In L''+cast(@Pending_Approval_Level as nvarchar(5)) +'' out of L''+cast(@MAX_Approval_Level as nvarchar(5))+'')'';
                                END
                            ELSE
                                RETURN ''''
                            END
                        END
                        ELSE IF @Approval_Based_On = ''U''
                        BEGIN                
                            SET @vStep=@vStep+'',5'';
                            IF @Pending_Approval_Level IS NOT NULL AND EXISTS (
                                SELECT 1
                                FROM JRA_LIB_HAZARD_APPROVAL_LEVELS HAL
                                INNER JOIN JRA_LIB_HAZZARDS_APPROVAR LHA ON LHA.Aprroval_Level_ID = HAL.Approval_Level_ID AND LHA.Approval_Based_on = HAL.Approval_Based_on AND LHA.Active_Status = 1
                                INNER JOIN JRA_LIB_WORK_CATEGORY WC ON WC.Work_Categ_ID = HAL.Work_Categ_ID  AND WC.Approval_Based_on = HAL.Approval_Based_On
                                WHERE HAL.Approval_Level = @Pending_Approval_Level 
                                    AND HAL.Work_Categ_ID = @Work_Categ_ID
                                    AND HAL.Active_Status = 1
                            )
                            BEGIN
                                SET @vStep=@vStep+'',6'';
                                SELECT @Result=STUFF((
                                SELECT DISTINCT '', '' + isnull(u.first_name,'''')+'' ''+isnull(u.last_name,'''')
                                FROM LIB_USER u
                                INNER JOIN INF_DTL_USER_VESSEL_ASSIGNMENT uva on uva.User_Id=u.userid
                                INNER JOIN JRA_LIB_HAZZARDS_APPROVAR LHA ON LHA.Approvar_Detail_ID = uva.user_id AND uva.Vessel_ID=@Vessel_ID
                                INNER JOIN JRA_LIB_HAZARD_APPROVAL_LEVELS HAL ON LHA.Aprroval_Level_ID = HAL.Approval_Level_ID AND LHA.Approval_Based_on=HAL.Approval_Based_on AND LHA.Active_Status = 1
                                WHERE u.active_status = 1 and uva.active_status=1 and HAL.Approval_Level = @Pending_Approval_Level
                                    AND HAL.Work_Categ_ID = @Work_Categ_ID AND HAL.Approval_Based_On=@Approval_Based_On					
                                FOR XML PATH(''''), TYPE
                            ).value(''.'', ''NVARCHAR(MAX)''), 1, 2, '''');
                            IF isnull(@Result,'''')<>''''
                                BEGIN
                                    RETURN isnull(@Result,'''')+ CHAR(13) + CHAR(10) +''(In L''+cast(@Pending_Approval_Level as nvarchar(5)) +'' out of L''+cast(@MAX_Approval_Level as nvarchar(5))+'')'';
                                END
                            ELSE
                                RETURN ''''
                            END
                        END
                    END
                    ELSE 
                    BEGIN
                    SET @vStep=@vStep+'',7'';
                    SELECT @Result=STUFF((
                                SELECT DISTINCT '', '' + cr.Rank_Short_Name
                                FROM CRW_LIB_Crew_Ranks cr
                                INNER JOIN JRA_LIB_HAZZARDS_APPROVAR LHA ON LHA.Approvar_Detail_ID = cr.id
                                INNER JOIN JRA_LIB_HAZARD_APPROVAL_LEVELS HAL ON LHA.Aprroval_Level_ID = HAL.Approval_Level_ID AND LHA.Approval_Based_on=HAL.Approval_Based_on AND LHA.Active_Status = 1
                                WHERE cr.is_active = 1 AND cr.Active_Status = 1 and HAL.Approval_Level = 0 and HAL.active_status=1 
                                    AND HAL.Work_Categ_ID = @Work_Categ_ID
                                FOR XML PATH(''''), TYPE
                            ).value(''.'', ''NVARCHAR(MAX)''), 1, 2, '''');
                    return isnull(@Result,'''');
                    END
                END
                SET @vStep=@vStep+'','',8'''';                
            return ''''''''
            END;'')


		DECLARE @VesselID INT,@Condition1 NVARCHAR(MAX)='''',@Condition2 NVARCHAR(MAX)='''',@Condition3 NVARCHAR(MAX)='''', @Condition4 NVARCHAR(MAX)='''',
		@OfficeScript1 NVARCHAR(MAX)='''',@OfficeScript2 NVARCHAR(MAX)='''',@OfficeScript3 NVARCHAR(MAX)='''',@OfficeScript4 NVARCHAR(MAX)='''';

		SELECT @VesselID= VESSEL_ID FROM LIB_VESSELS WHERE ACTIVE_STATUS=1 and INSTALLATION=1;		

		SET @Condition1 = ''work_categ_id in (select Work_Categ_ID from JRA_LIB_WORK_CATEGORY where Approval_Based_On=''''''''R'''''''' and active_status=1) AND Vessel_ID='' + CONVERT(VARCHAR(10), @VesselID)+'''''''';
		SET @OfficeScript1=''EXEC sync.sync_records_by_condition ''''JRA_DTL_HAZZARDS_APPROVAL'''',''+ CONVERT(VARCHAR(10), @VesselID)+'',''''''+@Condition1+'''';
		EXEC [SYNC_SP_DataSynchronizer_DataLog] '''', '''', '''', 0, @OfficeScript1

		SET @Condition2 = ''work_categ_id IN (select Work_Categ_ID from JRA_LIB_WORK_CATEGORY where Approval_Based_On=''''''''R'''''''' and active_status=1)'''''';
		SET @OfficeScript2=''EXEC sync.sync_records_by_condition ''''JRA_LIB_HAZARD_APPROVAL_LEVELS'''',''+ CONVERT(VARCHAR(10), @VesselID)+'',''''''+@Condition2+'''';
		EXEC [SYNC_SP_DataSynchronizer_DataLog] '''', '''', '''', 0, @OfficeScript2

		SET @Condition3 = ''Aprroval_Level_ID in (select Approval_Level from JRA_LIB_HAZARD_APPROVAL_LEVELS where work_categ_id IN (select Work_Categ_ID from JRA_LIB_WORK_CATEGORY where Approval_Based_On=''''''''R'''''''' and active_status=1) AND Vessel_ID='' + CONVERT(VARCHAR(10), @VesselID)+'''''''';
		SET @OfficeScript3=''EXEC sync.sync_records_by_condition ''''JRA_LIB_HAZZARDS_APPROVAR'''',''+ CONVERT(VARCHAR(10), @VesselID)+'',''''''+@Condition3+'''';
		EXEC [SYNC_SP_DataSynchronizer_DataLog] '''', '''', '''', 0, @OfficeScript3

		SET @Condition4 = ''work_categ_id IN (select Work_Categ_ID from JRA_LIB_WORK_CATEGORY where Approval_Based_On=''''''''R'''''''' and active_status=1)'''''';
		SET @OfficeScript4=''EXEC sync.sync_records_by_condition ''''JRA_LIB_WORK_CATEGORY'''',''+ CONVERT(VARCHAR(10), @VesselID)+'',''''''+@Condition4+'''';
		EXEC [SYNC_SP_DataSynchronizer_DataLog] '''', '''', '''', 0, @OfficeScript4'


select @SqlScript



