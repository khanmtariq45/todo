-- =============================================
-- Author:		<Reshma>
-- Create date: <17-12-2016>
-- Description:	<To display the Questionnaire details in grid>
-- =============================================
--exec VET_Get_QuestionnaireDetails 2,null,null,null,1,20,1
CREATE OR ALTER PROCEDURE [dbo].[VET_Get_QuestionnaireDetails]
	(
	 @Questionnaire_ID INT	                   -- Questionnaire ID
	,@dtSectionNO LIB_UDTT_IDLIST READONLY     -- List of selected section no 
	,@dtQuestionNo LIB_VTID READONLY           -- List of selected question no   
	,@SearchQuestion VARCHAR(4000) = NULL      -- Search by question
    ,@SORTBY VARCHAR(100) = NULL               -- Column name by which data to be sorted      
	,@SORTDIRECTION TINYINT = NULL             -- Direction in which data to be sorted 'ASC' or 'DESC'         
	,@PAGENUMBER INT = NULL                    -- Page Number of displaying data    
	,@PAGESIZE INT = NULL                      -- Max data to be return   
	,@ISFETCHCOUNT INT OUTPUT                  -- Return Total Count
	)
AS
BEGIN
	
	SET NOCOUNT ON;

     DECLARE  @SQLQUERY NVARCHAR(MAX) = ''
			,@WHERECLAUSE NVARCHAR(MAX) = ''
			,@SELECT_LIST NVARCHAR(MAX) = ''
			,@SORTORDER VARCHAR(10) = 'ASC'
			,@PARAMETERLIST NVARCHAR(MAX) = ''
			,@ORDERCLAUSE NVARCHAR(MAX) = ''
			,@TABLELIST NVARCHAR(MAX) = ''
			
	DECLARE @TABLEOUT TABLE (RCCOUNT INT NULL)

	IF ISNULL(@SORTDIRECTION, 0) = 0
		SET @SORTORDER = 'ASC'
	ELSE
		SET @SORTORDER = 'DESC'

		
	IF (@SORTBY IS NULL OR @SORTBY = 'Question_No')
		BEGIN
			SET @ORDERCLAUSE = '
			ORDER BY
    TRY_CAST(Level_1 AS INT),
    CASE WHEN ISNUMERIC(Level_1) = 0 THEN 
        ASCII(UPPER(Level_1)) * 2 + 
        CASE WHEN Level_1 COLLATE Latin1_General_CS_AS = UPPER(Level_1) THEN 0 ELSE 1 END
    ELSE 0 END,
    
    TRY_CAST(Level_2 AS INT),
    CASE WHEN ISNUMERIC(Level_2) = 0 THEN 
        ASCII(UPPER(Level_2)) * 2 + 
        CASE WHEN Level_2 COLLATE Latin1_General_CS_AS = UPPER(Level_2) THEN 0 ELSE 1 END
    ELSE 0 END,

    TRY_CAST(Level_3 AS INT),
    CASE WHEN ISNUMERIC(Level_3) = 0 THEN 
        ASCII(UPPER(Level_3)) * 2 + 
        CASE WHEN Level_3 COLLATE Latin1_General_CS_AS = UPPER(Level_3) THEN 0 ELSE 1 END
    ELSE 0 END

    ' 
		END
	ELSE
	BEGIN
		SET @ORDERCLAUSE = 'ORDER BY ' + QUOTENAME(@SORTBY) + ' ' + @SORTORDER
	END  
		
		SELECT @PARAMETERLIST = '
		                         @Questionnaire_ID INT
		                        ,@dtSectionNO LIB_UDTT_IDLIST READONLY
								,@dtQuestionNo LIB_VTID READONLY
								,@SearchQuestion VARCHAR(4000) = NULL								
	                            ,@SORTBY VARCHAR(100)
							    ,@SORTDIRECTION TINYINT
							    ,@PAGENUMBER INT
							    ,@PAGESIZE INT			 
							'
	IF (@SearchQuestion IS NOT NULL)
	BEGIN		
	SET @WHERECLAUSE = @WHERECLAUSE + ' AND (VDQ.Question LIKE ''%'' + @SearchQuestion + ''%'')'
	END	
	
	IF EXISTS(SELECT 1 FROM @dtSectionNO)
    BEGIN
	SET @WHERECLAUSE = @WHERECLAUSE + ' AND ( VDQ.Section_No IN( select ID from @dtSectionNO) )'
    END	
    
    IF EXISTS(SELECT 1 FROM @dtQuestionNo)
    BEGIN
	SET @WHERECLAUSE = @WHERECLAUSE + ' AND ( VDQ.Question_ID IN( select VTID from @dtQuestionNo) )'
    END								
	
	SET @SELECT_LIST=' SELECT * FROM ( 
										SELECT CASE WHEN @PAGENUMBER IS NOT NULL THEN ROW_NUMBER() OVER(' + @ORDERCLAUSE + ') ELSE 0 END AS ROWNUM, * FROM
										( 
										  select VDQ.Questionnaire_ID, VDQ.Question_ID,VDQ.Section_No as Section, 
										  CASE WHEN VDQ.Level_1 IS NOT NULL AND VDQ.Level_1 <> '''' THEN VDQ.Level_1 + CASE WHEN VDQ.Level_2 IS NOT NULL AND VDQ.Level_2 <> '''' THEN ''.'' + VDQ.Level_2 ELSE '''' END + CASE WHEN VDQ.Level_3 IS NOT NULL AND VDQ.Level_3 <> '''' THEN ''.'' + VDQ.Level_3 ELSE '''' END ELSE '''' END AS Question_No	 
	, CASE WHEN VDQ.Level_1 is not null THEN  cast(VDQ.Level_1 as varchar(20)) ELSE '''' END AS Level_1,
           CASE WHEN VDQ.Level_2 is not null THEN  cast(VDQ.Level_2 as varchar(20)) ELSE '''' END AS Level_2,
          CASE WHEN VDQ.Level_3 is not null THEN  cast(VDQ.Level_3 as varchar(20)) ELSE '''' END AS Level_3,	
 VDQ.Question as Question,VDQ.Remarks as Remarks '	
	
	SET @TABLELIST =' FROM VET_DTL_Questionnaire VDQ 
	                  INNER JOIN VET_LIB_Questionnaire VLQ ON VLQ.Questionnaire_ID=VDQ.Questionnaire_ID
					  WHERE 1=1 AND VLQ.Questionnaire_ID=@Questionnaire_ID AND VDQ.Active_Status=1
                    '		
   SET @SQLQUERY =@SELECT_LIST+@TABLELIST+@WHERECLAUSE +') FINAL_TABLE ) FINAL_RESULT
					WHERE ROWNUM	between ((ISNULL(@PAGENUMBER,-1) - 1) * ISNULL(@PAGESIZE,1) + 1) AND (ISNULL(@PAGENUMBER,-1) * ISNULL(@PAGESIZE,-1))
					'	
	
	EXEC sp_executesql @SQLQUERY
		,@PARAMETERLIST
		,@Questionnaire_ID 
		,@dtSectionNO 
		,@dtQuestionNo 
		,@SearchQuestion 
        ,@SORTBY 
	    ,@SORTDIRECTION 
	    ,@PAGENUMBER 
	    ,@PAGESIZE 

	IF ISNULL(@ISFETCHCOUNT, 0) = 1
	BEGIN
		SET @SQLQUERY = 'SELECT COUNT(0) ' + @TABLELIST + @WHERECLAUSE

		INSERT INTO @TABLEOUT
		EXEC sp_executesql @SQLQUERY
			,@PARAMETERLIST
			,@Questionnaire_ID 
			,@dtSectionNO 
			,@dtQuestionNo 
			,@SearchQuestion 
			,@SORTBY 
			,@SORTDIRECTION 
			,@PAGENUMBER 
			,@PAGESIZE 

		SELECT @ISFETCHCOUNT = RCCOUNT
		FROM @TABLEOUT
	END							
												
END
