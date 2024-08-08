 
 declare @VesselCode  varchar(10) = '91',  
 @RequCode varchar(50)='RUKA-ADM-CWLO-0000215/24-O',  
 @SuppCode varchar(50) = '165742',  
 @Document_code varchar(50) = '91240709130713'
 declare @vStepID varchar;
 SET @vStepID  = '1'
 Declare @param varchar(MAX)   =CONCAT('@VesselCode=',Convert(varchar(10),@VesselCode),
                            ',@RequCode=',Convert(varchar(50),@RequCode),
                            ',@SuppCode=',Convert(varchar(50),@SuppCode),
                            ',@Document_code=',Convert(varchar(50),@Document_code))
 EXEC [dbo].[inf_log_write] 'J2_PURC', NULL, 'PURC_SP_Ins_RFQ_quote_pricez', 0, 'Exception occurred in SP', 
CONCAT('Failed! StepID = ', @vStepID,', ', ERROR_MESSAGE(),',parameters:-'@param'')
'sql', 1, 0;
