I have a requirement from client that they need a report of data for which SP is used is given below now please give me a query to generete that report without any filter 
pick the tables and joins from the SP given below and provide me new query for sql then I will copy the data from sql and will paste in excel




Ops Analyst of EPS has requested for data export from backend as there is no export in UI.

Please share the export in below format in an excel file-

1- FBM No.	
2- Active (Y = Active, N = Inactive)
3- Date Created	
4- Status (Draft, Pending Approval or Sent)
5- Date Sent	
6- Domain	
7- Primary Category	
8- Secondary Category	
9- Subject	
10- Send to fleet (A1, A2, B, C1, C2, G, Fleet Office or multiple)



ALTER PROCEDURE [dbo].[FBM_PR_FBMMESSAGE_SEARCH] 
( 
	 @USERID INT = NULL 
	,@FBMNUMBER VARCHAR(100) = NULL 
	,@DEPARTMENT INT = NULL 
	,@FORUSER VARCHAR(100) = NULL 
	,@ACTIVE INT = 0 
	,@PRIMARYCATEGORY INT = NULL 
	,@SECONDRYCATEGORY INT = NULL 
	,@FROMDATE DATETIME = NULL 
	,@TODATE DATETIME = NULL 
	,@YEAR VARCHAR(10) = NULL 
	,@SEARCHTEXTBY VARCHAR(100) = NULL 
	,@ISDEPTSARCHONSENT VARCHAR(10) = NULL 
	,@dtstatus FBM_UDTT_status readonly 
	,@Domain VARCHAR(100) = NULL 
	,@dtFleet FBM_UDTT_FleetList readonly 
	,@dtVessel FBM_UDTT_VesselList readonly 
	,@dtManagementCompany FBM_UDTT_ManagementCompList readonly 
	,@dtOfficeDepartment FBM_UDTT_OfficeDptList readonly 
	,@SORTBY VARCHAR(100) = NULL 
	,@SORTDIRECTION INT = NULL 
	,@PAGENUMBER INT = NULL 
	,@PAGESIZE INT = NULL 
	,@ISFETCHCOUNT INT OUTPUT 
) 
AS 
BEGIN 
	declare @vesselCount int = null, @FleetCount int = null, 
		@ManagementCompanyCount int = null, @OfficeDepartmentCount int = null 
	select @vesselCount = count(vessel) from @dtVessel 
	select @FleetCount = count(Fleet) from @dtFleet 
	select @ManagementCompanyCount = count(ManagementCompany) from @dtManagementCompany 
	select @OfficeDepartmentCount = count(OfficeDept) from @dtOfficeDepartment 
 
	DECLARE @TBL_FOR_USER TABLE 
	( COL_FOR_USER VARCHAR(100) NULL ) 
 
	IF(@FORUSER = 'ALL') 
	BEGIN 
		INSERT INTO @TBL_FOR_USER VALUES ('COMPANY'), ('OFFICE'), ('SHIP') 
	END 
	ELSE IF (@FORUSER = 'COMPANY') 
	BEGIN 
		INSERT INTO @TBL_FOR_USER VALUES ('COMPANY')
	END 
		ELSE IF (@FORUSER = 'OFFICE') 
	BEGIN 
		INSERT INTO @TBL_FOR_USER VALUES ('OFFICE') 
	END 
	ELSE IF (@FORUSER = 'SHIP') 
	BEGIN 
		INSERT INTO @TBL_FOR_USER VALUES('SHIP') 
	END 		
 
	DECLARE @TEMPMESSAGETYPE TABLE 
	( FBMID INT, FLDROWNUMBER BIGINT IDENTITY (1,1) ) 
 
	-- DRAFT 
	IF('DRAFT' = (select status from @dtstatus where status = 'DRAFT') ) 
	BEGIN 
		INSERT INTO @TEMPMESSAGETYPE ( FBMID ) 
			SELECT ID FROM FBM_MAIN 
			WHERE FBM_STATUS IN ('DRAFT' , 'REWORK') 
	END 
	
	-- PENDING APPROVAL 
	IF('PENDINGAPPROVAL' = (select status from @dtstatus where status = 'PENDINGAPPROVAL') ) 
	BEGIN 
		INSERT INTO @TEMPMESSAGETYPE ( FBMID ) 
			SELECT ID FROM FBM_MAIN 
			WHERE FBM_STATUS = 'PENDINGAPPROVAL' 
	END 
	
	-- SENT 
	IF('SENT' = (select status from @dtstatus where status = 'SENT') ) 
 BEGIN 
 
 INSERT INTO @TEMPMESSAGETYPE 
 ( 
 FBMID 
 ) 
 SELECT ID FROM FBM_MAIN 
 WHERE FBM_STATUS = 'SENT' 
 
 END 
	
	DECLARE @CURRUSERDEPT INT 
	SELECT @CURRUSERDEPT = Dep_Code FROM LIB_USER WHERE USERID = @USERID 
	
	IF (@CURRUSERDEPT ! = @DEPARTMENT) 
	BEGIN 	
		SELECT * FROM 
		( 
			SELECT CASE WHEN @PAGENUMBER IS NOT NULL THEN ROW_NUMBER() OVER(ORDER BY C.DATE_SENT DESC) ELSE 0 END AS ROWNUM 
				,C.ID ,C.FBM_NUMBER ,C.DATE_SENT ,C.SUBJECT 
				,C.DEPARTMENT ,C.FOR_USER 
				,ISNULL(REPLACE(C.BODY,CHAR(13),'<br>'),'') as BODY 
				,CASE WHEN C.ATTCHMENTS = 1 THEN 'Y' ELSE 'N' END AS 'ATTCHMENTS' ,C.TOSYNC 
				,CASE WHEN C.ACTIVE = 1 THEN 'Y' ELSE 'N' END AS 'ACTIVE' 
				,C.SECONDRY_CATEGORY ,C.URGENT 
				,C.MADE_INACTIVE_BY ,C.MADE_INACTIVE_ON ,C.CREATED_BY 
				,C.CREATED_ON ,OD.VALUE AS 'DeptName' 
				,FSP.NAME AS 'PRIMARY_CATEGORY' 
				,isnull(DATE_SENT,'') as DATE_SENT1 
				,[dbo].FN_GET_FBM_Attachment_Path(C.ID) AS 'FilePathIfSingle' 
				,(CASE WHEN (SELECT COUNT(1) FROM FBM_READ_INFO WHERE FBM_ID = C.ID) > 0 THEN 1 ELSE 0 END) AS FBM_READ_FLAG 
				,C.FBM_STATUS as 'FBM_STATUS' 
			FROM FBM_MAIN C 
				INNER JOIN INF_LIB_INOFFICE_DEPT OD ON C.DEPARTMENT = OD.ID 
				INNER JOIN FBM_LIB_SYSTEMS_PARAMETERS FSP ON FSP.CODE = C.PRIMARY_CATEGORY 
				INNER JOIN @TEMPMESSAGETYPE T ON T.FBMID = C.ID 
			WHERE 
				C.DEPARTMENT = ISNULL(@DEPARTMENT ,C.DEPARTMENT) 
				AND (isnull(C.FBM_NUMBER,'') LIKE '%' + ISNULL(@FBMNUMBER, isnull(C.FBM_NUMBER,'')) + '%') 
				AND ((C.[SUBJECT] LIKE '%' + ISNULL(@SEARCHTEXTBY,C.SUBJECT) + '%') OR (C.BODY LIKE '%' +ISNULL(@SEARCHTEXTBY,C.BODY)+ '%')) 
				AND (C.ACTIVE = @ACTIVE) 
				AND (
						(@vesselCount = 0 and @FleetCount = 0 
						and @ManagementCompanyCount = 0 and @OfficeDepartmentCount = 0) 
						or exists 
						( select 1 from fbm_assignment FA where c.uid = fbm_uid 
							and FA.active_status = 1 
							and (@vesselCount = 0 OR FA.vessel_uid in (select Vessel from @dtVessel)) 
							and (@FleetCount = 0 OR FA.fleet_uid in (select Fleet from @dtFleet)) 
							and (@ManagementCompanyCount = 0 OR FA.management_company_uid in (select ManagementCompany from @dtManagementCompany)) 
							and (@OfficeDepartmentCount = 0 OR FA.office_department_id in (select OfficeDept from @dtOfficeDepartment)) 
						) 
					) 
				AND (C.PRIMARY_CATEGORY = ISNULL(@PRIMARYCATEGORY,C.PRIMARY_CATEGORY)) 
				AND (C.SECONDRY_CATEGORY = ISNULL(@SECONDRYCATEGORY,C.SECONDRY_CATEGORY)) 
				AND (SUBSTRING(CONVERT(VARCHAR(10), C.CREATED_ON, 101) ,7,4) = ISNULL(@YEAR ,SUBSTRING(CONVERT(VARCHAR(10), C.CREATED_ON, 101) ,7,4))) 				 
				AND (CONVERT(VARCHAR(10), C.DATE_SENT,112) > = CONVERT(VARCHAR(10), @FROMDATE , 112 ) OR @FROMDATE IS NULL) 
				AND (CONVERT(VARCHAR(10), C.DATE_SENT,112) < = CONVERT(VARCHAR(10), @TODATE , 112 ) OR @TODATE IS NULL) 
				AND (ltrim(FOR_USER) in (SELECT COL_FOR_USER FROM @TBL_FOR_USER)) 
			)FINALTABLEITEMS 
		WHERE ROWNUM between ((ISNULL(@PAGENUMBER,-1) - 1) * ISNULL(@PAGESIZE,1) + 1) AND (ISNULL(@PAGENUMBER,-1) * ISNULL(@PAGESIZE,-1)) 
		ORDER BY CONVERT(VARCHAR(150),FINALTABLEITEMS.DATE_SENT ,112) DESC 

		IF ISNULL(@ISFETCHCOUNT,0) = 1 
		BEGIN 
			SELECT @ISFETCHCOUNT = COUNT(C.ID) 
			FROM FBM_MAIN C 
				INNER JOIN INF_LIB_INOFFICE_DEPT OD ON C.DEPARTMENT = OD.ID 
				INNER JOIN FBM_LIB_SYSTEMS_PARAMETERS FSP ON FSP.CODE = C.PRIMARY_CATEGORY 
				INNER JOIN @TEMPMESSAGETYPE T ON T.FBMID = C.ID 
			WHERE 
				C.DEPARTMENT = ISNULL(@DEPARTMENT ,C.DEPARTMENT) 
				AND (isnull(C.FBM_NUMBER,'') LIKE '%' + ISNULL(@FBMNUMBER, isnull(C.FBM_NUMBER,'')) + '%') 
				AND ((C.[SUBJECT] LIKE '%' + ISNULL(@SEARCHTEXTBY,C.SUBJECT) + '%') OR (C.BODY LIKE '%' +ISNULL(@SEARCHTEXTBY,C.BODY)+ '%')) 
				AND (C.ACTIVE = @ACTIVE) 
				AND (
					(@vesselCount = 0 and @FleetCount = 0 
						and @ManagementCompanyCount = 0 and @OfficeDepartmentCount = 0) 
					or exists 
					( select 1 from fbm_assignment FA where c.uid = fbm_uid and FA.active_status = 1 
						and (@vesselCount = 0 OR FA.vessel_uid in (select Vessel from @dtVessel)) 
						and (@FleetCount = 0 OR FA.fleet_uid in (select Fleet from @dtFleet)) 
						and (@ManagementCompanyCount = 0 OR FA.management_company_uid in (select ManagementCompany from @dtManagementCompany)) 
						and (@OfficeDepartmentCount = 0 OR FA.office_department_id in (select OfficeDept from @dtOfficeDepartment)) 
						) 
					) 
				AND (C.PRIMARY_CATEGORY = ISNULL(@PRIMARYCATEGORY,C.PRIMARY_CATEGORY)) 
				AND (C.PRIMARY_CATEGORY = ISNULL(@PRIMARYCATEGORY,C.PRIMARY_CATEGORY)) 
				AND (C.SECONDRY_CATEGORY = ISNULL(@SECONDRYCATEGORY,C.SECONDRY_CATEGORY)) 
				AND (SUBSTRING(CONVERT(VARCHAR(10), C.CREATED_ON, 101) ,7,4) = ISNULL(@YEAR ,SUBSTRING(CONVERT(VARCHAR(10), C.CREATED_ON, 101) ,7,4))) 
				AND (CONVERT(VARCHAR(10), C.DATE_SENT,112) > = CONVERT(VARCHAR(10), @FROMDATE , 112 ) OR @FROMDATE IS NULL) 
				AND (CONVERT(VARCHAR(10), C.DATE_SENT,112) < = CONVERT(VARCHAR(10), @TODATE , 112 ) OR @TODATE IS NULL) 
				AND (ltrim(FOR_USER) in (SELECT COL_FOR_USER FROM @TBL_FOR_USER)) 
		END 
	END 
	ELSE 
	BEGIN 
		SELECT * FROM 
		( 
			SELECT CASE WHEN @PAGENUMBER IS NOT NULL THEN ROW_NUMBER() OVER(ORDER BY C.DATE_SENT DESC) ELSE 0 END AS ROWNUM 
				,C.ID ,C.FBM_NUMBER ,C.DATE_SENT ,C.SUBJECT 
				,C.DEPARTMENT ,C.FOR_USER 
				,ISNULL(REPLACE(C.BODY,CHAR(13),'<br>'),'') as BODY 
				,CASE WHEN C.ATTCHMENTS = 1 THEN 'Y' ELSE 'N' END AS 'ATTCHMENTS' ,C.TOSYNC 
				,CASE WHEN C.ACTIVE = 1 THEN 'Y' ELSE 'N' END AS 'ACTIVE' 
				,C.SECONDRY_CATEGORY ,C.URGENT 
				,C.MADE_INACTIVE_BY ,C.MADE_INACTIVE_ON ,C.CREATED_BY 
				,C.CREATED_ON ,OD.VALUE AS 'DeptName' 
				,FSP.NAME AS 'PRIMARY_CATEGORY' 
				,isnull(DATE_SENT,'') as DATE_SENT1 
				,[dbo].FN_GET_FBM_Attachment_Path(C.ID) AS 'FilePathIfSingle' 
				,(CASE WHEN (SELECT COUNT(1) FROM FBM_READ_INFO WHERE FBM_ID = C.ID) > 0 THEN 1 ELSE 0 END) AS FBM_READ_FLAG 
				,C.FBM_STATUS as 'FBM_STATUS' 
			FROM FBM_MAIN C 
				INNER JOIN INF_LIB_INOFFICE_DEPT OD ON C.DEPARTMENT = OD.ID 
				INNER JOIN FBM_LIB_SYSTEMS_PARAMETERS FSP ON FSP.CODE = C.PRIMARY_CATEGORY 
				INNER JOIN @TEMPMESSAGETYPE T ON T.FBMID = C.ID 
			WHERE 
				C.DEPARTMENT = CASE WHEN ((select status from @dtstatus where status = 'SENT') = 'SENT') THEN ISNULL(@DEPARTMENT ,C.DEPARTMENT) 
				WHEN @USERID = 1 THEN C.DEPARTMENT 
				ELSE ISNULL(@DEPARTMENT ,C.DEPARTMENT) END 
				AND (isnull(C.FBM_NUMBER,'') LIKE '%' + ISNULL(@FBMNUMBER, isnull(C.FBM_NUMBER,'')) + '%') 
				AND ((C.[SUBJECT] LIKE '%' + ISNULL(@SEARCHTEXTBY,C.SUBJECT) + '%') OR (C.BODY LIKE '%' +ISNULL(@SEARCHTEXTBY,C.BODY)+ '%')) 
				AND (C.ACTIVE = @ACTIVE) 
				AND ( (@vesselCount = 0 and @FleetCount = 0 
					and @ManagementCompanyCount = 0 and @OfficeDepartmentCount = 0) 
						or exists 
						(	select 1 from fbm_assignment FA where c.uid = fbm_uid and FA.active_status = 1 
							and (@vesselCount = 0 OR FA.vessel_uid in (select Vessel from @dtVessel)) 
							and (@FleetCount = 0 OR FA.fleet_uid in (select Fleet from @dtFleet)) 
							and (@ManagementCompanyCount = 0 OR FA.management_company_uid in (select ManagementCompany from @dtManagementCompany)) 
							and (@OfficeDepartmentCount = 0 OR FA.office_department_id in (select OfficeDept from @dtOfficeDepartment)) 
						) 
					) 
				AND (C.PRIMARY_CATEGORY = ISNULL(@PRIMARYCATEGORY,C.PRIMARY_CATEGORY)) 
				AND (C.PRIMARY_CATEGORY = ISNULL(@PRIMARYCATEGORY,C.PRIMARY_CATEGORY)) 
				AND (C.SECONDRY_CATEGORY = ISNULL(@SECONDRYCATEGORY,C.SECONDRY_CATEGORY)) 
				AND (SUBSTRING(CONVERT(VARCHAR(10), C.CREATED_ON, 101) ,7,4) = ISNULL(@YEAR ,SUBSTRING(CONVERT(VARCHAR(10), C.CREATED_ON, 101) ,7,4))) 						
				AND (CONVERT(VARCHAR(10), C.DATE_SENT,112) > = CONVERT(VARCHAR(10), @FROMDATE , 112 ) OR @FROMDATE IS NULL) 
				AND (CONVERT(VARCHAR(10), C.DATE_SENT,112) < = CONVERT(VARCHAR(10), @TODATE , 112 ) OR @TODATE IS NULL) 
				AND (ltrim(FOR_USER) in (SELECT COL_FOR_USER FROM @TBL_FOR_USER)) 
			)FINALTABLEITEMS 
		WHERE ROWNUM between ((ISNULL(@PAGENUMBER,-1) - 1) * ISNULL(@PAGESIZE,1) + 1) AND (ISNULL(@PAGENUMBER,-1) * ISNULL(@PAGESIZE,-1)) 
		ORDER BY CONVERT(VARCHAR(150),FINALTABLEITEMS.DATE_SENT ,112) DESC 
 
		IF ISNULL(@ISFETCHCOUNT,0) = 1 
		BEGIN 
			SELECT @ISFETCHCOUNT = COUNT(C.ID) 
			FROM FBM_MAIN C 
				INNER JOIN INF_LIB_INOFFICE_DEPT OD ON C.DEPARTMENT = OD.ID 
				INNER JOIN FBM_LIB_SYSTEMS_PARAMETERS FSP ON FSP.CODE = C.PRIMARY_CATEGORY 
				INNER JOIN @TEMPMESSAGETYPE T ON T.FBMID = C.ID 
			WHERE 
				C.DEPARTMENT = CASE WHEN 
				(
					(select status from @dtstatus where status = 'SENT') = 'SENT') 
					THEN ISNULL(@DEPARTMENT ,C.DEPARTMENT) 
					
					WHEN @USERID = 1 THEN C.DEPARTMENT 
					ELSE ISNULL(@DEPARTMENT ,C.DEPARTMENT) 
					END 
					AND (isnull(C.FBM_NUMBER,'') LIKE '%' + ISNULL(@FBMNUMBER, isnull(C.FBM_NUMBER,'')) + '%') 
					AND ((C.[SUBJECT] LIKE '%' + ISNULL(@SEARCHTEXTBY,C.SUBJECT) + '%') OR (C.BODY LIKE '%' +ISNULL(@SEARCHTEXTBY,C.BODY)+ '%')) 
					AND (C.ACTIVE = @ACTIVE) 
					AND ( (@vesselCount = 0 and @FleetCount = 0 
							and @ManagementCompanyCount = 0 and @OfficeDepartmentCount = 0) 
							or exists 
							( select 1 from fbm_assignment FA where c.uid = fbm_uid and FA.active_status = 1 
								and (@vesselCount = 0 OR FA.vessel_uid in (select Vessel from @dtVessel)) 
								and (@FleetCount = 0 OR FA.fleet_uid in (select Fleet from @dtFleet)) 
								and (@ManagementCompanyCount = 0 OR FA.management_company_uid in (select ManagementCompany from @dtManagementCompany)) 
								and (@OfficeDepartmentCount = 0 OR FA.office_department_id in (select OfficeDept from @dtOfficeDepartment)) 
								) 
						) 
					AND (C.PRIMARY_CATEGORY = ISNULL(@PRIMARYCATEGORY,C.PRIMARY_CATEGORY)) 
					AND (C.PRIMARY_CATEGORY = ISNULL(@PRIMARYCATEGORY,C.PRIMARY_CATEGORY)) 
					AND (C.SECONDRY_CATEGORY = ISNULL(@SECONDRYCATEGORY,C.SECONDRY_CATEGORY)) 
					AND (SUBSTRING(CONVERT(VARCHAR(10), C.CREATED_ON, 101) ,7,4) = ISNULL(@YEAR ,SUBSTRING(CONVERT(VARCHAR(10), C.CREATED_ON, 101) ,7,4))) 
					AND (CONVERT(VARCHAR(10), C.DATE_SENT,112) > = CONVERT(VARCHAR(10), @FROMDATE , 112 ) OR @FROMDATE IS NULL) 
					AND (CONVERT(VARCHAR(10), C.DATE_SENT,112) < = CONVERT(VARCHAR(10), @TODATE , 112 ) OR @TODATE IS NULL) 
					AND (ltrim(FOR_USER) in (SELECT COL_FOR_USER FROM @TBL_FOR_USER)) 
		END 
	END 
END 
