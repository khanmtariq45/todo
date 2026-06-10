I want to check which recods are going to update and what will be the resulted output after update query 
select
    LEFT(upload_file_path, LEN(upload_file_path) - CHARINDEX('\', REVERSE(upload_file_path)) + 1) 
    + 
    LEFT(
        RIGHT(upload_file_path, CHARINDEX('\', REVERSE(upload_file_path)) - 1),
        NULLIF(CHARINDEX('.', RIGHT(upload_file_path, CHARINDEX('\', REVERSE(upload_file_path)) - 1)) - 1, -1)
    )
    + '.' + file_type
  from inf_uploads
WHERE 
    LEN(RIGHT(upload_file_path, CHARINDEX('\', REVERSE(upload_file_path)) - 1)) 
        - LEN(REPLACE(RIGHT(upload_file_path, CHARINDEX('\', REVERSE(upload_file_path)) - 1), '.', '')) <> 1;


SQL Error [536] [S0004]: An error occurred during the current command (Done status 0). Invalid length parameter passed to the RIGHT function.
