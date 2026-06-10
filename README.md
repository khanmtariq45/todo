UPDATE inf_upload
SET upload_file_path = 
    LEFT(upload_file_path, LEN(upload_file_path) - CHARINDEX('\', REVERSE(upload_file_path)) + 1) 
    + 
    LEFT(
        RIGHT(upload_file_path, CHARINDEX('\', REVERSE(upload_file_path)) - 1),
        NULLIF(CHARINDEX('.', RIGHT(upload_file_path, CHARINDEX('\', REVERSE(upload_file_path)) - 1)) - 1, -1)
    )
    + '.' + file_type
WHERE 
    LEN(RIGHT(upload_file_path, CHARINDEX('\', REVERSE(upload_file_path)) - 1)) 
        - LEN(REPLACE(RIGHT(upload_file_path, CHARINDEX('\', REVERSE(upload_file_path)) - 1), '.', '')) <> 1;