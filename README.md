 ALTER TABLE dbo.QMS_FileVersionInfo ADD ID_temp INT NULL;

  UPDATE dbo.QMS_FileVersionInfo SET ID_temp = ID;

  ALTER TABLE dbo.QMS_FileVersionInfo DROP CONSTRAINT PK_QMS_FileVersionInfo;

  ALTER TABLE dbo.QMS_FileVersionInfo DROP COLUMN ID;

  EXEC sp_rename 'dbo.QMS_FileVersionInfo.ID_temp', 'ID', 'COLUMN';

  ALTER TABLE dbo.QMS_FileVersionInfo ADD CONSTRAINT PK_QMS_FileVersionInfo PRIMARY KEY CLUSTERED (ID ASC) WITH (FILLFACTOR = 80);

Msg 8111, Level 16, State 1, Line 17
Cannot define PRIMARY KEY constraint on nullable column in table 'QMS_FileVersionInfo'.
Msg 1750, Level 16, State 0, Line 17
Could not create constraint or index. See previous errors.
