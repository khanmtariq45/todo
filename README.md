/****** Object:  StoredProcedure [dbo].[inf_log_write]    Script Date: 26/10/2023 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

            /* 
            <description>: stored procedure for saving exception log in "inf_log" table
            */
    
           CREATE OR ALTER PROCEDURE [dbo].[inf_log_write] (
    
            @module_code	varchar(100)			--  Module Code
           ,@function_code  varchar(100)			--	Function Code
           ,@method		    varchar(200)			--	Name of the DB Objects which is throwing error
           ,@log_level		tinyint					--	Log Level
           ,@log_data		varchar(max)			--	Transaction Data
           ,@log_message	varchar(max)			--	Error Message or Error Status
           ,@api	        varchar(30)	= 'sql'		--  Api by default will be sql
           ,@user_id        int			= null		--  User Id
           ,@location_id	int   		= null		--  Execution identifier for example: Vessel Id
           )

            AS
            BEGIN
            SET NOCOUNT ON
            BEGIN TRY

			if @location_id is null
		    select top 1 @location_id = Vessel_ID from LIB_VESSELS where INSTALLATION =1
		    
			declare @os_hostname varchar(200) =null , @os_freemem int = null , @os_loadavg varchar(200) = null

			select @os_hostname = CONVERT (varchar,(select SERVERPROPERTY('SERVERNAME') AS 'Instance'))

			select @os_freemem =  available_physical_memory_kb/1024 FROM sys.dm_os_sys_memory

			select @os_loadavg = (

				select avg(CPU_Usage) from (
				 SELECT TOP(30) SQLProcessUtilization AS 'CPU_Usage', ROW_NUMBER() OVER(ORDER BY (SELECT NULL)) AS 'row_number'
				   FROM ( 
				         SELECT 
				           record.value('(./Record/@id)[1]', 'int') AS record_id,
				           record.value('(./Record/SchedulerMonitorEvent/SystemHealth/SystemIdle)[1]', 'int') AS [SystemIdle],
				           record.value('(./Record/SchedulerMonitorEvent/SystemHealth/ProcessUtilization)[1]', 'int') AS [SQLProcessUtilization], 
				           [timestamp] 
				         FROM ( 
				              SELECT [timestamp], CONVERT(xml, record) AS [record] 
				              FROM sys.dm_os_ring_buffers 
				              WHERE ring_buffer_type = N'RING_BUFFER_SCHEDULER_MONITOR' 
				              AND record LIKE '%<SystemHealth>%'
				              ) AS x 
				        ) AS y
				 ) AS z
			)
               insert into inf_log (uid,module_code,function_code,method,log_level,log_data,log_message,date_of_creation,api,user_id,location_id,os_hostname,os_freemem,os_loadavg)
               values (newid(),@module_code,@function_code,@method,@log_level,@log_data,@log_message,getdate(),@api,@user_id,@location_id,@os_hostname,@os_freemem,@os_loadavg)
            END TRY
            BEGIN CATCH
            END CATCH
            END









            insert into inf_log (uid, module_code, function_code, api, method, log_data,log_level, location_id,log_message, date_of_creation, user_id)
    --             values (newid(), 'J2_PURC', NULL, 'sql', 'PURC_SP_Ins_RFQ_quote_price', 'Exception occurred in SP', 0, 0, CONCAT('Failed! StepID = ', @vStepID,', ', ERROR_MESSAGE(),',parameters:-'+@param+''), getdate(), 1)
