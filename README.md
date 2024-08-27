SELECT DISTINCT 
    V.Vessel_Type AS [value],
    VA.Active_Status 
FROM 
    dbo.LIB_VESSELS V
LEFT JOIN 
    dbo.INF_DTL_USER_VESSEL_ASSIGNMENT VA WITH (NOLOCK) 
    ON V.vessel_ID = VA.vessel_ID 
    AND VA.Active_Status = 1 
    AND VA.User_ID = '658'
LEFT JOIN 
    dbo.INF_DTL_COMPANY_VESSEL DCV WITH (NOLOCK) 
    ON V.vessel_id = DCV.VesselID 
    AND DCV.active_status = 1
LEFT JOIN 
    dbo.inf_lnk_vessel_group_vessels vlink WITH (NOLOCK) 
    ON vlink.vessel_uid = V.uid 
    AND vlink.active_status = 1
LEFT JOIN 
    dbo.inf_lib_vessel_group lvg WITH (NOLOCK) 
    ON lvg.uid = vlink.vessel_group_uid 
    AND lvg.active_status = 1
LEFT JOIN 
    dbo.ASL_Supplier asl WITH (NOLOCK) 
    ON asl.Supplier_Code = V.Vessel_Owner_Code
    AND asl.active_status = 1 
    AND (
        (asl.Supplier_Type = 'OWNER' AND asl.Supplier_Code = V.Vessel_Owner_Code) 
        OR 
        (asl.Supplier_Type = 'OWNER' AND asl.Supplier_Code = DCV.Supplier_Code) 
        OR 
        (asl.Supplier_Type = 'Management Company' AND asl.Supplier_Code = DCV.Supplier_Code)
    )
WHERE 
    V.Active_Status = 1 
    AND V.Vessel_Type IS NOT NULL;