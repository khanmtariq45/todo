I have an SP 

CREATE OR ALTER PROCEDURE [qms].[SP_Get_QMS_Document_Tree] 
@UserId INT
AS
BEGIN
		drop table if exists #Orphans
		select distinct ParentID into #Orphans from QMSdtlsFile_Log_demo where active_status = 0 or ParentID is not null
		create clustered index CX_#Orphans on #Orphans (ParentID)

        SELECT top 100 va.date_of_Creatation AS dateCreated
            ,va.date_of_Modification AS dateModified
             ,va.filepath AS filterPath
            ,   CASE 
                    WHEN o.ParentID is not null then 1
                    else 0
                END as hasChild
            ,cast(va.ID as varchar(50)) AS id
            ,CASE 
                WHEN va.nodeType = 0
                    THEN 1
                ELSE 0
                END AS isFile
            ,va.logFileId AS name
            ,cast(va.parentid as varchar(50)) AS parentId
            ,CONVERT(DECIMAL(9, 2), CEILING((ISNULL(va.size, 0) / 1024.00) * 100) / 100) AS size
            ,CASE 
                WHEN va.nodeType = 0
                    AND CHARINDEX('.', REVERSE(va.logFileId)) > 0
                    THEN RIGHT(va.logFileId, CHARINDEX('.', REVERSE(va.logFileId)) - 1)
                ELSE 'Folder'
                END AS type
            
        FROM QMSdtlsFile_Log_demo va WITH (NOLOCK)
        left outer join #Orphans o
            on o.ParentID = va.ID
        WHERE va.active_status = 1
        
        ORDER BY va.logfileID;
		drop table if exists #Orphans
end



now client ask me to change filepath which filterpath it should be depend on level of file and path 

level	0	 	1	 	2	 	3
id	0	 	1	 	2	 	3
parentID	null	 	0	 	1	 	2
path	  '	 	\	 	\test1\	 	\test1\test2\
folderName	test	 	test1	 	test2	 	test3
