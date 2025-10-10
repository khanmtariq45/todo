can we use in condition in where cause of nodejs code ?


if (userDetails.User_Type !== "ADMIN") {
        const moduleCodes: string[] = Array.from(new Set(deleteRows.map((r) => r.module_code).filter(Boolean)));

        for (const mod of moduleCodes) {
          const access = await getManager().query(
            `SELECT 1 FROM inf_view_user_all_right WHERE User_ID = @0 AND Module_Code = @1 AND Active_Status = 1 AND Action = @2`,
            [userId, mod, "DELETE"]
          );
          if (!access || access.length === 0) {
            throw new Error(`${userDetails.First_Name} does not have rights to delete documents for module ${mod}`);
          }
        }
      }
