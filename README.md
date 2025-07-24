DECLARE @SQL_Script NVARCHAR(MAX);

SET @SQL_Script = N'
CREATE OR ALTER VIEW [dbo].[vw_j2_voyage_report] 
AS
SELECT [RID]            
    ,''V-'' + substring(telegram_reference, 0, charindex(''-'', telegram_reference, (charindex(''-'', telegram_reference, 1)) + 1)) MRVReportType
    ,sts_status
	, case WHEN  ISDATE(UTC) = 1
            THEN CONVERT(DATETIME, utc) end [utc gmt time zone]
    ,[CargoRob]
    ,[vessel_speed]
    ,[CargoOp1]
    ,[CargoOp2]
	,[cargo_commencement_time]
	,[cargo_operations_completion_time]
    ,[Ice_Navigation]
   
	,case when [CargoCarried] is null then null
		  when ISNUMERIC(CargoCarried) = 0 then 0.0
		 else cast(CargoCarried as float) 
		 end [CargoCarried]
    ,[Anchor]
	,[Drifting]
    ,[VALUES_JSON]
    ,[uid]
    ,[Vessel_code]
    ,[Report_type]
    ,[report_date]
    ,''V-'' + substring(telegram_reference,1,len(telegram_reference)-(charindex(''-'',substring(REVERSE(telegram_reference),3,len(telegram_reference)))+2)) as [MRVReportName]
    ,[Voyage]
    ,[FromTelegram_Id]
    ,[ToTelegram_Id]
    ,[Vessel_Id]
    ,[CO2Emission]
    ,[ArrivalPort]
    ,CASE 
        WHEN [TimeOfArrival] IS NOT NULL
            AND ISDATE(UTC) = 1
            THEN CONVERT(DATETIME, utc)
        END AS TimeOfArrival
    ,[DeparturePort]
    ,CASE 
        WHEN [TimeOfDeparture] IS NOT NULL
            AND ISDATE(UTC) = 1
            THEN CONVERT(DATETIME, utc)
        END AS TimeOfDeparture
	,case when [DistanceTravelled] is null or ISNUMERIC(DistanceTravelled) = 0 then 0
		 else cast(DistanceTravelled as float) 
	 end [DistanceTravelled]
	,case when [DistanceTravelled] is null then 0 else 1 end [DistanceTravelledflg] 
    ,[Active_Status]
    ,[Created_By]
    ,[Date_Of_Creation]
    ,[Doc_Complaince]
    ,[Doc_Compliance_SentToOffice]
    ,[Doc_Compliance_SentToCommision]
    ,[Telegram_Date]
    ,[TotalTimeSpent]
    ,[EEOI]
    ,[EEDI]
    ,[CompanyGoal]
    ,[FuelConsPerDist]
    ,[FuelConsPerTransWork]
    ,[CO2EmissionPerDist]
    ,[CO2ConsPerTransWork]
    ,[MRV_VesselInfo_ID]
    ,case when isnumeric(total_cargo_discharged) = 0 
        then case when isnumeric(total_cargo_loaded) = 0 then null 
                    else total_cargo_loaded end 
        else case when cast(total_cargo_discharged as float) < 1.0 then (case when isnumeric(total_cargo_loaded) = 0 then total_cargo_discharged else total_cargo_loaded end ) 
                    else total_cargo_discharged end
     end CargoOperation
    ,total_cargo_loaded
    ,total_cargo_discharged
    ,PORT_ACTIVITY
    ,port_activities
    ,isnull(steaming_time,0) as steaming_time
	,reported_time
	,(case when isnumeric ([Latitude Degree]) = 1 then  [Latitude Degree] else null end) [Latitude Degree]
	,(case when isnumeric ([Latitude Minutes]) = 1 then  [Latitude Minutes] else null end) [Latitude Minutes]
	,[North/South]
	,(case when isnumeric ([Longitude Degree]) = 1 then  [Longitude Degree] else null end) [Longitude Degree]
	,(case when isnumeric ([Longitude Minutes]) = 1 then  [Longitude Minutes] else null end) [Longitude Minutes]
	,[East/West]
	,[off_hire_reasons]
	,[voyage_type] 
	,[Wind Force] 
	,[beaufort_sea_scale]
	,to_port
	,current_port
	,anchorage_location
	,[Reefer 20 ft. Chilled]
	,[Reefer 40 ft. Chilled]
	,[Reefer 20 ft. Frozen]
	,[Reefer 40 ft. Frozen]

FROM (
    SELECT ROW_NUMBER() OVER (
            PARTITION BY vessel_ID ORDER BY report_date ASC
            ) RID
        ,JSON_VALUE(VALUES_JSON, ''$.values.header."telegram_reference"'') telegram_reference
		,JSON_VALUE(VALUES_JSON,''$.values.header."sts_status"'') sts_status
		,JSON_VALUE(values_json, ''$.values.container_cargo_section."$$$reefer_20_ft_chilled"'') [Reefer 20 ft. Chilled] 
		,JSON_VALUE(values_json, ''$.values.container_cargo_section."$$$reefer_40_ft_chilled"'') [Reefer 40 ft. Chilled] 
		,JSON_VALUE(values_json, ''$.values.container_cargo_section."$$$reefer_20_ft_frozen"'')  [Reefer 20 ft. Frozen]
		,JSON_VALUE(values_json, ''$.values.container_cargo_section."$$$reefer_40_ft_frozen"'')  [Reefer 40 ft. Frozen]
		,JSON_VALUE(values_json, ''$.values.distance_and_speed."$$$reported_time"'') reported_time
		,JSON_VALUE(values_json, ''$.values.header.latitude."Degree"'')           ''Latitude Degree''
        ,JSON_VALUE(values_json, ''$.values.header.latitude."Minutes"'')          ''Latitude Minutes''
        ,JSON_VALUE(values_json, ''$.values.header.latitude."Direction"'')        ''North/South''
        ,JSON_VALUE(values_json, ''$.values.header.longitude."Degree"'')          ''Longitude Degree''
        ,JSON_VALUE(values_json, ''$.values.header.longitude."Minutes"'')         ''Longitude Minutes''
        ,JSON_VALUE(values_json, ''$.values.header.longitude."Direction"'')        ''East/West''
		,CASE 
			WHEN JSON_VALUE(values_json, ''$.values.header."$$$off_hire_reasons"'') = ''drydocking'' THEN ''Drydocking''
			WHEN JSON_VALUE(values_json, ''$.values.header."$$$off_hire_reasons"'') = ''emergencies'' THEN ''Emergencies''
			WHEN JSON_VALUE(values_json, ''$.values.header."$$$off_hire_reasons"'') = ''laidups'' THEN ''Laidups''
			WHEN JSON_VALUE(values_json, ''$.values.header."$$$off_hire_reasons"'') = ''operational_deviations_on_instructions'' THEN ''Operational Deviations on Instructions''
			WHEN JSON_VALUE(values_json, ''$.values.header."$$$off_hire_reasons"'') = ''machinery_breakdowns'' THEN ''Machinery Breakdowns''
			WHEN JSON_VALUE(values_json, ''$.values.header."$$$off_hire_reasons"'') = ''others'' THEN ''Others''
		ELSE JSON_VALUE(values_json, ''$.values.header."$$$off_hire_reasons"'')
        END AS off_hire_reasons
		,CASE 
			WHEN JSON_VALUE(values_json, ''$.values.header."$$$voyage_type"'') = ''sts'' THEN ''STS''
			WHEN JSON_VALUE(values_json, ''$.values.header."$$$voyage_type"'') = ''sts_one_way'' THEN ''STS-One way''
			WHEN JSON_VALUE(values_json, ''$.values.header."$$$voyage_type"'') = ''sts_round_trip'' THEN ''STS-Round trip''
			WHEN JSON_VALUE(values_json, ''$.values.header."$$$voyage_type"'') = ''sts_idle'' THEN ''STS-Idle''
			WHEN JSON_VALUE(values_json, ''$.values.header."$$$voyage_type"'') = ''blank'' THEN ''Blank''
			WHEN JSON_VALUE(values_json, ''$.values.header."$$$voyage_type"'') = ''one_way'' THEN ''One Way''
			WHEN JSON_VALUE(values_json, ''$.values.header."$$$voyage_type"'') = ''round_trip'' THEN ''Round Trip''
		ELSE JSON_VALUE(values_json, ''$.values.header."$$$voyage_type"'')
		END AS voyage_type
        ,JSON_VALUE(values_json, ''$.values.conditions."wind_rel_speed"'') ''Wind Force''
		,JSON_VALUE(values_json, ''$.values.conditions."beaufort_sea_scale"'') ''beaufort_sea_scale''
		,JSON_VALUE(values_json, ''$.values.header."$$$to_port"'') to_port
		,JSON_VALUE(values_json, ''$.values.header."$$$port"'') current_port
		,JSON_VALUE(values_json, ''$.values.header."anchorage_location"'') anchorage_location
        ,1 CargoRob
		,JSON_VALUE(VALUES_JSON, ''$.values.cargo_section."cargo_commencement_time"'')''cargo_commencement_time''
		,JSON_VALUE(VALUES_JSON, ''$.values.cargo_section."cargo_operations_completion_time"'') ''cargo_operations_completion_time''
        ,convert(FLOAT, JSON_VALUE(VALUES_JSON, ''$.values.distance_and_speed."average_speed"'')) vessel_speed
        ,coalesce( JSON_VALUE(VALUES_JSON, ''$.values.cargo_section."total_cargo_loaded"''),
                   JSON_VALUE(VALUES_JSON, ''$.values.cargo_section."total_cargo_loaded_mt"''),
                   JSON_VALUE(VALUES_JSON, ''$.values.cargo_section."total_cargo_loaded_bbls"''))CargoOp1					
        ,JSON_VALUE(VALUES_JSON, ''$.values.cargo_section."$$$cargo_total_tn_mt_cargo_section"'') CargoOp2
        ,isnull(JSON_VALUE(VALUES_JSON, ''$.values.header."ice_navigation"''),JSON_VALUE(VALUES_JSON, ''$.values.header."$$$ice_navigation"'')) Ice_Navigation
      
        ,coalesce( JSON_VALUE(VALUES_JSON, ''$.values.cargo_section."total_cargo_loaded"''),
                   JSON_VALUE(VALUES_JSON, ''$.values.cargo_section."total_cargo_loaded_mt"''),
                   JSON_VALUE(VALUES_JSON, ''$.values.cargo_section."total_cargo_loaded_bbls"''))  as total_cargo_loaded
        ,coalesce( JSON_VALUE(VALUES_JSON, ''$.values.cargo_section."total_cargo_discharged"''),
                   JSON_VALUE(VALUES_JSON, ''$.values.cargo_section."total_cargo_discharged_mt"''),
                   JSON_VALUE(VALUES_JSON, ''$.values.cargo_section."total_cargo_discharged_bbls"'')) as total_cargo_discharged
        ,coalesce( JSON_VALUE(VALUES_JSON, ''$.values.cargo_section."$$$cargo_onboard"''),
                   JSON_VALUE(VALUES_JSON, ''$.values.cargo_section."$$$cargo_onboard_mt"''),
                   JSON_VALUE(VALUES_JSON, ''$.values.cargo_section."$$$cargo_onboard_bbls"''),
				   JSON_VALUE(VALUES_JSON, ''$.values.container_cargo_section."$$$total_cargo_carried"'')) as [CargoCarried]
        ,isnull(JSON_VALUE(values_json, ''$.values.distance_and_speed."sts_transfer"''),JSON_VALUE(values_json, ''$.values.distance_and_speed."anchor"'')) Anchor
		,jSON_VALUE(values_json, ''$.values.distance_and_speed."drifting"'') [Drifting]
        ,JSON_VALUE(values_json, ''$.values.distance_and_speed."port_activities"'') as port_activities
        ,Replace(Replace(Replace(JSON_QUERY(values_json, ''$.values.header.port_activity''), ''"'', ''''), ''['', ''''), '']'', '''') PORT_ACTIVITY
        ,JSON_VALUE(VALUES_JSON, ''$.values.distance_and_speed."steaming_time"'') steaming_time
        ,VALUES_JSON
        ,vr.uid
        ,substring(JSON_VALUE(VALUES_JSON, ''$.values.header."telegram_reference"''), 0, charindex(''-'', JSON_VALUE(VALUES_JSON, ''$.values.header."telegram_reference"''), 1)) Vessel_code
        ,Report_type
        ,isnull(vr.report_date, ''1999-01-01'') report_date
        ,JSON_VALUE(values_json, ''$.values.header."$$$vessel"'') [MRVReportName]
        ,JSON_VALUE(values_json, ''$.values.header."voyage_number"'') [Voyage]
        , - 9999 [FromTelegram_Id]
        , - 9999 [ToTelegram_Id]
        ,vr.[Vessel_Id] [Vessel_Id]
        , - 9999 [CO2Emission]
        ,JSON_VALUE(values_json, ''$.values.header."$$$Port_of_Arrival"'') [ArrivalPort]
        ,CASE 
            WHEN isdate(JSON_VALUE(values_json, ''$.values.header."Time_of_Arrival"'')) = 1
                THEN JSON_VALUE(values_json, ''$.values.header."Time_of_Arrival"'')
            END [TimeOfArrival]
        ,JSON_VALUE(values_json, ''$.values.header."port_of_departure"'') [DeparturePort]
        ,CASE 
            WHEN isdate(JSON_VALUE(values_json, ''$.values.header."time_of_unberthing"'')) = 0
                THEN NULL
            ELSE JSON_VALUE(values_json, ''$.values.header."time_of_unberthing"'')
            END [TimeOfDeparture]
        ,JSON_VALUE(VALUES_JSON, ''$.values.distance_and_speed."distance_run"'') DistanceTravelled
        ,vr.[Active_Status] [Active_Status]
        ,
        '''' [Created_By]
        ,created_date [Date_Of_Creation]
        ,0 [Doc_Complaince]
        ,0 [Doc_Compliance_SentToOffice]
        ,0 [Doc_Compliance_SentToCommision]
        ,CASE 
            WHEN isdate(substring(JSON_VALUE(VALUES_JSON, ''$.values.header."telegram_reference"''), charindex(''-'', JSON_VALUE(VALUES_JSON, ''$.values.header."telegram_reference"''), 1) + 1, 8)) = 0
                THEN ''1999-10-10''
            ELSE convert(DATE, substring(JSON_VALUE(VALUES_JSON, ''$.values.header."telegram_reference"''), charindex(''-'', JSON_VALUE(VALUES_JSON, ''$.values.header."telegram_reference"''), 1) + 1, 8))
            END [Telegram_Date]
        ,- 9999 [TotalTimeSpent]
        ,- 9999 [EEOI]
        ,- 9999 [EEDI]
        ,- 9999 [CompanyGoal]
        ,- 9999 [FuelConsPerDist]
        ,- 9999 [FuelConsPerTransWork]
        ,- 9999 [CO2EmissionPerDist]
        ,- 9999 [CO2ConsPerTransWork]
        ,1 [MRV_VesselInfo_ID]
        ,JSON_VALUE(VALUES_JSON, ''$.values.header."utc_gmt_time_zone_row_utc_gmt_col_hour"'') UTC
		
    FROM j2_voyage_report AS vr
    WHERE vr.active_status = 1 and ISJSON(VALUES_JSON) = 1
    ) x 
';

EXEC [inf].[register_script_for_execution] 
    'QMS', 
    'QMS_Document', 
    'DB Change 1055245', 
    'O', 
    @SQL_Script;