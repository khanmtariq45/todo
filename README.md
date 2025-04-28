-- 1. Add temp column
ALTER TABLE dbo.QMS_FileVersionInfo ADD ID_temp INT NULL;

-- 2. Copy old ID values
UPDATE dbo.QMS_FileVersionInfo SET ID_temp = ID;

-- 3. Drop old PK constraint
ALTER TABLE dbo.QMS_FileVersionInfo DROP CONSTRAINT PK_QMS_FileVersionInfo;

-- 4. Drop old ID column
ALTER TABLE dbo.QMS_FileVersionInfo DROP COLUMN ID;

-- 5. Rename ID_temp to ID
EXEC sp_rename 'dbo.QMS_FileVersionInfo.ID_temp', 'ID', 'COLUMN';

-- 6. Make new ID column NOT NULL
ALTER TABLE dbo.QMS_FileVersionInfo ALTER COLUMN ID INT NOT NULL;

-- 7. Add Primary Key again
ALTER TABLE dbo.QMS_FileVersionInfo 
ADD CONSTRAINT PK_QMS_FileVersionInfo PRIMARY KEY CLUSTERED (ID ASC) WITH (FILLFACTOR = 80);