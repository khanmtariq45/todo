public async Task<bool> Has_UserAccessRight(string ModuleCode, string FunctionCode, string Action, string Token)
{
    string methodName = "BLL_Infra_UserCredentials.Has_UserAccessRight";

    try
    {
        UDFLib.WriteLog(methodName, string.Format("Method called with parameters - ModuleCode: '{0}', FunctionCode: '{1}', Action: '{2}', Token: '{3}'", ModuleCode, FunctionCode, Action, Token));

        if (string.IsNullOrEmpty(Token) || string.IsNullOrEmpty(ModuleCode) || string.IsNullOrEmpty(FunctionCode) || string.IsNullOrEmpty(Action))
        {
            string missingParams = string.Join(", ",
                new string[] {
                    string.IsNullOrEmpty(Token) ? "Token" : null,
                    string.IsNullOrEmpty(ModuleCode) ? "ModuleCode" : null,
                    string.IsNullOrEmpty(FunctionCode) ? "FunctionCode" : null,
                    string.IsNullOrEmpty(Action) ? "Action" : null
                }.Where(x => x != null).ToArray());

            UDFLib.WriteLog(methodName, string.Format("Required parameter(s) missing: {0}. Access denied - returning false.", missingParams));
            return false;
        }

        List<UserAccessRight> userRights = await objDal.Get_UserAccessRightListAsync(Token);

        if (userRights == null)
        {
            UDFLib.WriteLog(methodName, "API returned null user rights list! Access denied - returning false.");
            return false;
        }

        UDFLib.WriteLog(methodName, string.Format("Successfully retrieved {0} user access rights from API.", userRights.Count));

        UserAccessRight matchingRight = userRights.FirstOrDefault(right =>
            string.Equals(right.Module_Code, ModuleCode, StringComparison.OrdinalIgnoreCase) &&
            string.Equals(right.Function_Code, FunctionCode, StringComparison.OrdinalIgnoreCase) &&
            string.Equals(right.Action, Action, StringComparison.OrdinalIgnoreCase)
        );

        if (matchingRight != null)
        {
            UDFLib.WriteLog(methodName, string.Format("Access GRANTED! Found matching access right - User_ID: {0}, Right_Code: '{1}', Valid_On: '{2}'", matchingRight.User_ID, matchingRight.Right_Code, matchingRight.Valid_On));
            return true;
        }
        else
        {
            UDFLib.WriteLog(methodName, string.Format("Access DENIED! No matching access right found for ModuleCode: '{0}', FunctionCode: '{1}', Action: '{2}'", ModuleCode, FunctionCode, Action));
            return false;
        }
    }
    catch (Exception ex)
    {
        UDFLib.WriteExceptionLog(ex);
        return false;
    }
}