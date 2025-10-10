if (userDetails.User_Type !== "ADMIN") {
  const moduleCodes: string[] = Array.from(new Set(deleteRows.map((r) => r.module_code).filter(Boolean)));
  
  if (moduleCodes.length > 0) {
    const placeholders = moduleCodes.map((_, index) => `@${index}`).join(',');
    
    const access = await getManager().query(
      `SELECT Module_Code FROM inf_view_user_all_right 
       WHERE User_ID = @0 
       AND Module_Code IN (${placeholders}) 
       AND Active_Status = 1 
       AND Action = @${moduleCodes.length}`,
      [userId, ...moduleCodes, "DELETE"]
    );

    // Get the module codes that user has delete access to
    const accessibleModules = access.map((row: any) => row.Module_Code);
    
    // Find modules that user doesn't have delete access for
    const inaccessibleModules = moduleCodes.filter(mod => !accessibleModules.includes(mod));
    
    if (inaccessibleModules.length > 0) {
      throw new Error(
        `${userDetails.First_Name} does not have rights to delete documents for modules: ${inaccessibleModules.join(', ')}`
      );
    }
  }
}