take all valid extensions and compare it now let me explain you the issue we need a script to take one column of a table inf_upload then column is upload_file_path now that column always have text something like that 

\FMS\FMS\FMS_3cf4f7b7-19c4-421b-a52f-00528779da34.pdf


it will not contains . but for extension now if that extension is valid extension then leave that record if extension is not valid then remove the next part of the . and take extension from another column name file_type and append it there could be one scenario and it could have double . like 

\FMS\FMS\FMS_3cf4f7b7-19c4-421b-a52f-00528779da34.pdf.txt consider it as a invalid and remove .pdf.txt and take fresh extension for that as well
