To use the stored procedure `[dbo].[inf_log_write]` instead of your current `INSERT` statement, you need to call the procedure and pass the appropriate parameters. Here's how you can do it:

### Original Query:
```sql
insert into inf_log (uid, module_code, function_code, api, method, log_data, log_level, location_id, log_message, date_of_creation, user_id)
values (newid(), 'J2_PURC', NULL, 'sql', 'PURC_SP_Ins_RFQ_quote_price', 'Exception occurred in SP', 0, 0, CONCAT('Failed! StepID = ', @vStepID, ', ', ERROR_MESSAGE(), ',parameters:-'+@param+''), getdate(), 1)
```

### Equivalent Stored Procedure Call:
```sql
DECLARE @vStepID INT = -- your value here
DECLARE @param VARCHAR(MAX) = -- your value here

EXEC [dbo].[inf_log_write]
    @module_code = 'J2_PURC',
    @function_code = NULL, 
    @method = 'PURC_SP_Ins_RFQ_quote_price',
    @log_level = 0,
    @log_data = 'Exception occurred in SP',
    @log_message = CONCAT('Failed! StepID = ', @vStepID, ', ', ERROR_MESSAGE(), ', parameters:-', @param),
    @api = 'sql',
    @user_id = 1,
    @location_id = 0;
```

### Explanation:
- **`@module_code`**: Set to `'J2_PURC'`.
- **`@function_code`**: Set to `NULL` as per your original query.
- **`@method`**: The name of the stored procedure where the error occurred, `'PURC_SP_Ins_RFQ_quote_price'`.
- **`@log_level`**: The log level, `0`, which corresponds to your original query.
- **`@log_data`**: The log message or data, `'Exception occurred in SP'`.
- **`@log_message`**: The concatenated error message including the `@vStepID`, `ERROR_MESSAGE()`, and `@param`.
- **`@api`**: The API used, `'sql'`.
- **`@user_id`**: Set to `1` as per your original query.
- **`@location_id`**: Set to `0`, as it seems you're passing `0` in your original query.

### Considerations:
- Ensure that the parameters like `@vStepID` and `@param` are correctly assigned before calling the stored procedure.
- If you want to handle the default values provided by the stored procedure, you can omit those parameters when calling it.

This approach simplifies the process of logging by centralizing the logic in the stored procedure.