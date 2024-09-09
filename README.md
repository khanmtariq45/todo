SELECT
    '0' AS Parent_ID,
    plss.subsystem_description AS DisplayText,
    Cast(plss.subsystem_code AS NVARCHAR(100)) AS Child_ID,
    plss.subsystem_description AS component_description,
    2 AS level,
    1 AS tag,
    0 AS system_tag_type,
    Cast(pls.vessel_code AS NVARCHAR(100)) AS vessel_id,
    Cast(plss.system_code AS NVARCHAR(100)) AS system_code,
    Cast(plss.subsystem_code AS NVARCHAR(50)) AS subsystem_code,
    parc.document_code,
    j2Items.item_count AS item_count,
    (
        CASE
            WHEN j2SupplyItems.supply_items_count IS NULL THEN 0
            ELSE j2SupplyItems.supply_items_count
        END
    ) AS supply_items_count
FROM
    (
        Select
            system_code,
            vessel_code
        from
            purc_lib_systems
        where
            active_status = 1
    ) pls
    INNER JOIN purc_agg_reqsn_component parc ON parc.system_code = pls.system_code
    INNER JOIN purc_lib_subsystems plss ON (
        plss.system_code = pls.system_code
        AND plss.active_status = 1
    )
    INNER JOIN (
        SELECT
            t.system_code,
            t.subsystem_code,
            t.vessel_id,
            t.isservice,
            (
                case
                    when Count(*) is not null then Count(*)
                    else 0
                end
            ) AS item_count
        FROM
            (
                SELECT
                    Cast(pli.system_code AS NVARCHAR(50)) AS system_code,
                    Cast(pli.subsystem_code AS NVARCHAR(50)) AS subsystem_code,
                    cast(pli.Vessel_ID AS NVARCHAR(50)) AS vessel_id,
                    ISNULL(pli.ISService, 0) AS isservice
                FROM
                    purc_lib_items pli
                where
                    Active_Status = 1
            ) t
        GROUP BY
            t.system_code,
            t.subsystem_code,
            t.Vessel_ID,
            t.ISService
    ) j2Items ON (
        j2Items.system_code = plss.system_code
        AND j2Items.subsystem_code = plss.subsystem_code
        AND j2Items.vessel_id = parc.system_vessel_id
        AND j2Items.isservice = parc.is_service_requisition
    )
    LEFT JOIN (
        select
            dsi.document_code,
            dsi.item_system_code AS system_code,
            dsi.item_subsystem_code AS subsystem_code,
            count(*) AS supply_items_count
        from
            purc_dtl_supply_items dsi
        where
            dsi.active_status = 1
            and dsi.Date_Of_Creatation > (GETDATE() - 1000)
            AND dsi.machinery_uid is null
            AND dsi.component_uid is null
            AND dsi.subcomponent_uid is null
            AND dsi.item_uid is null
        group by
            dsi.document_code,
            dsi.item_system_code,
            dsi.item_subsystem_code
    ) j2SupplyItems ON (
        j2SupplyItems.document_code = parc.document_code
        AND j2SupplyItems.system_code = plss.system_code
        AND j2SupplyItems.subsystem_code = plss.subsystem_code
    )
UNION
SELECT
    '0' AS parent_id,
    jplc2.component_name AS displaytext,
    Cast(jplc2.uid AS NVARCHAR (100)) AS child_id,
    jplc2.component_name AS function_description,
    (
        CASE
            WHEN jplc2.parent_component_uid IS NULL THEN 1
            ELSE 2
        END
    ) AS level,
    (
        CASE
            WHEN jplc2.parent_component_uid IS NULL THEN 0
            ELSE 1
        END
    ) AS tag,
    1 AS system_tag_type,
    Cast(jplc2.vessel_uid AS NVARCHAR(100)) AS vessel_id,
    Cast(jplc.uid AS NVARCHAR(100)) AS system_code,
    Cast(jpls.sub_component_uid AS NVARCHAR(100)) AS subsystem_code,
    jplc.document_code,
    jpls.item_count AS item_count,
    (
        CASE
            WHEN j3SupplyItems.supply_items_count IS NULL THEN 0
            ELSE j3SupplyItems.supply_items_count
        END
    ) AS supply_items_count
FROM
    (
        SELECT
            jplc1.uid,
            jplc1.parent_component_uid,
            jplc1.component_name,
            jplc1.vessel_uid,
            pdrr.machinery_uid,
            pdrr.document_code
        FROM
            (
                select
                    *
                from
                    j3_pms_lib_component
                where
                    vessel_uid is not null
                    and active_status = 1
                    AND parent_component_uid IS NULL
                    AND (
                        is_deleted is null
                        or is_deleted = 0
                    )
            ) jplc1
            INNER JOIN (
                select pdr.document_code,
                pdr.machinery_uid
                from
                    purc_dtl_reqsn pdr
                where
                    pdr.LINE_TYPE = 'R'
                    and pdr.Active_Status = 1
                    and pdr.machinery_uid is not null
            ) pdrr ON pdrr.machinery_uid = jplc1.uid
    ) jplc
    INNER JOIN j3_pms_lib_component jplc2 ON jplc2.parent_component_uid = jplc.uid
    INNER JOIN (
        SELECT
            t.machinery As machinery_uid,
            jplc.uid AS component_uid,
            t.lib_component_uid AS sub_component_uid,
            t.item_count,
            pdrr.document_code,
            t.vessel_uid
        FROM
            (
                select
                    jpls.machinery,
                    jpls.lib_component_uid,
                    count(jpls.uid) as item_count,
                    jpls.vessel_uid
                from
                    j3_pms_lib_spare jpls
                group by
                    jpls.machinery,
                    jpls.lib_component_uid,
                    jpls.vessel_uid
            ) t
            inner join (
                SELECT
                    w.uid,
                    w.component_uid,
                    w.vessel_uid
                FROM
                    (
                        select
                            ROW_NUMBER() OVER (
                                PARTITION BY plc.component_uid,
                                plc.vessel_uid
                                order by
                                    plc.component_uid ASC,
                                    plc.uid ASC
                            ) AS cuid_row_number,
                            plc.uid,
                            plc.component_uid,
                            vessel_uid
                        from
                            j3_pms_lib_component plc
                        where
                            plc.vessel_uid is not null
                            and plc.parent_component_uid is not null
                    ) w
                where
                    w.cuid_row_number = 1
            ) jplc on jplc.component_uid = t.lib_component_uid
            and jplc.vessel_uid = t.vessel_uid
            INNER JOIN (
                select
                    pdr.document_code,
                    pdr.machinery_uid
                from
                    purc_dtl_reqsn pdr
                where
                    pdr.LINE_TYPE = 'R'
                    and pdr.active_status = 1
                    and pdr.machinery_uid is not null
            ) pdrr ON pdrr.machinery_uid = t.machinery
        where
            jplc.vessel_uid is not null
    ) jpls ON jpls.machinery_uid = jplc.machinery_uid
    AND jpls.component_uid = jplc2.uid
    AND jpls.document_code = jplc.document_code
    LEFT JOIN (
        select
            dsi.document_code,
            dsi.machinery_uid,
            dsi.component_uid,
            count(*) AS supply_items_count
        from
            purc_dtl_supply_items dsi
        where
            dsi.active_status = 1
            and dsi.Date_Of_Creatation > (GETDATE() - 1000)
            AND dsi.machinery_uid is not null
            AND dsi.component_uid is not null
            AND dsi.subcomponent_uid is not null
            AND dsi.item_uid is not null
        group by
            dsi.document_code,
            dsi.machinery_uid,
            dsi.component_uid
    ) j3SupplyItems ON (
        j3SupplyItems.document_code = jplc.document_code
        AND j3SupplyItems.machinery_uid = jplc.machinery_uid
        AND j3SupplyItems.component_uid = jplc2.uid
    )
