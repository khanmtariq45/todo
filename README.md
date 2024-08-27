select distinct VesselTypeID as [value] , Active_Status from (
            select
            VA.Uid as AssignedID ,
                    V.FleetCode ,
                    V.Vessel_Type as VesselTypeID ,
                    V.Vessel_Owner_Code as owner_Code ,
                    aslCompany.Supplier_Code as company_Code,
                    aslmanagement.SUPPLIER_ID,
                    V.uid as vessel_uid,
                    V.Vessel_Flag as VesselFlag_ID,
                    V.Vessel_type,
                    lvg.uid,
                    aslowner.Supplier_Code as ss,
                    VA.Active_Status as Active_Status
             FROM "dbo"."LIB_VESSELS" "v"
             LEFT JOIN "dbo"."INF_DTL_USER_VESSEL_ASSIGNMENT" "VA" with(nolock) ON V.vessel_ID = VA.vessel_ID and va.Active_Status = 1 and "v"."Active_Status" = 1 and User_ID = '658'
             LEFT JOIN "dbo"."INF_DTL_COMPANY_VESSEL" "dcv" with(nolock) ON v.vessel_id = "dcv"."VesselID" and dcv.active_status = 1
             LEFT JOIN "dbo"."inf_lnk_vessel_group_vessels" "vlink" with(nolock) ON "vlink"."vessel_uid" = "v"."uid" and "vlink"."active_status" = 1
             LEFT JOIN "dbo"."inf_lib_vessel_group" "lvg" with(nolock) ON "lvg"."uid" = "vlink"."vessel_group_uid" and "lvg"."active_status" = 1
             LEFT JOIN "dbo"."ASL_Supplier" "aslowner" with(nolock) ON "aslowner"."Supplier_Code" = "v"."Vessel_Owner_Code" and aslOwner.Supplier_Type = 'OWNER' and aslowner.active_status = 1  
             LEFT JOIN "dbo"."ASL_Supplier" "aslCompany" with(nolock) ON dcv.Supplier_Code = aslCompany.Supplier_Code and aslCompany.Supplier_Type = 'OWNER' and aslCompany.Active_status = 1  
             LEFT JOIN "dbo"."ASL_Supplier" "aslmanagement" with(nolock) ON dcv.Supplier_Code = aslmanagement.Supplier_Code and aslmanagement.Supplier_Type = 'Management Company' and aslmanagement.Active_status = 1  
             Where VA.Active_Status = 1)as tempAllise where VesselTypeID is not null
