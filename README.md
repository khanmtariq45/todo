-- SQL Server:
SELECT * FROM Qmsdtlsfile_log WHERE filepath LIKE 'Documents%' COLLATE SQL_Latin1_General_CP1_CS_AS;
SELECT * FROM Qmsdtlsfile_log WHERE filepath COLLATE Latin1_General_CS_AS LIKE 'Documents%';

-- MySQL/MariaDB:
SELECT * FROM Qmsdtlsfile_log WHERE filepath LIKE BINARY 'Documents%';
SELECT * FROM Qmsdtlsfile_log WHERE filepath LIKE 'Documents%' COLLATE utf8_bin;
SELECT * FROM Qmsdtlsfile_log WHERE filepath REGEXP '^Documents';

-- PostgreSQL:
SELECT * FROM Qmsdtlsfile_log WHERE filepath LIKE 'Documents%' COLLATE "C";
SELECT * FROM Qmsdtlsfile_log WHERE filepath ~ '^Documents';
SELECT * FROM Qmsdtlsfile_log WHERE filepath ~ '^Documents.*';

-- Oracle:
SELECT * FROM Qmsdtlsfile_log WHERE REGEXP_LIKE(filepath, '^Documents');
SELECT * FROM Qmsdtlsfile_log WHERE filepath LIKE 'Documents%' AND filepath = UPPER(filepath);
SELECT * FROM Qmsdtlsfile_log WHERE NLSSORT(filepath, 'NLS_SORT=BINARY') LIKE NLSSORT('Documents%', 'NLS_SORT=BINARY');

-- SQLite:
SELECT * FROM Qmsdtlsfile_log WHERE filepath LIKE 'Documents%' AND filepath GLOB 'Documents*';
SELECT * FROM Qmsdtlsfile_log WHERE filepath REGEXP '^Documents';

-- DB2:
SELECT * FROM Qmsdtlsfile_log WHERE filepath LIKE 'Documents%' AND VARGRAPHIC(filepath) = VARGRAPHIC('Documents%');
SELECT * FROM Qmsdtlsfile_log WHERE LOWER(filepath) LIKE LOWER('Documents%') AND filepath LIKE 'Documents%';

-- Universal approach (works in most databases but may be slower):
SELECT * FROM Qmsdtlsfile_log 
WHERE filepath LIKE 'Documents%' 
  AND SUBSTRING(filepath, 1, 9) = 'Documents';