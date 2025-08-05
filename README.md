SELECT 
    C.FBM_NUMBER AS [FBM No.],
    CASE WHEN C.ACTIVE = 1 THEN 'Y' ELSE 'N' END AS [Active],
    C.CREATED_ON AS [Date Created],
    CASE 
        WHEN C.FBM_STATUS IN ('DRAFT','REWORK') THEN 'Draft'
        WHEN C.FBM_STATUS = 'PENDINGAPPROVAL' THEN 'Pending Approval'
        WHEN C.FBM_STATUS = 'SENT' THEN 'Sent'
        ELSE C.FBM_STATUS 
    END AS [Status],
    C.DATE_SENT AS [Date Sent],
    C.FOR_USER AS [Domain],
    FSP.NAME AS [Primary Category],
    C.SECONDRY_CATEGORY AS [Secondary Category],
    C.SUBJECT AS [Subject],
    COALESCE(
        STUFF((
            SELECT ', ' + LF.FLEET_NAME 
            FROM fbm_assignment FA 
            INNER JOIN INF_LIB_FLEET LF ON FA.fleet_uid = LF.UID
            WHERE 
                FA.fbm_uid = C.UID 
                AND FA.active_status = 1
            FOR XML PATH('')
        ), 1, 2, ''),
        'None'
    ) AS [Send to fleet]
FROM FBM_MAIN C
LEFT JOIN FBM_LIB_SYSTEMS_PARAMETERS FSP 
    ON FSP.CODE = C.PRIMARY_CATEGORY
ORDER BY C.CREATED_ON DESC;