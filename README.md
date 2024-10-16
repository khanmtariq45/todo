private async loadFileDetails(docIds: string[]): Promise<void> {
  const j2auth = this.documentViewerService.getJ2Auth(this.route.snapshot.queryParams);

  try {
    // Call the API and store the response
    const response = await this.getFilesDetails$(j2auth, docIds).toPromise();
    
    if (response.status === 404) {
      this.notFound = true;
      console.warn('Document not found');
      return;
    }

    const result: IFileInfo[] = [];
    
    if (response) {
      Object.keys(response).forEach((docId: string) => {
        const fileDetailsArray = response[docId];

        if (Array.isArray(fileDetailsArray) && fileDetailsArray.length > 0) {
          fileDetailsArray.forEach((fileDetails: any) => {
            if (!result.some((item) => item.docId === docId)) {
              result.push({
                docId: docId,
                filePath: fileDetails.FilePath,
                fileExtension: fileDetails.Extension,
              });
            }
          });
        }
      });
    }

    // Set the result to the global variable
    this.fileInfo = result;

    console.log(this.fileInfo); // You can use this to debug and check if the global variable is set correctly
  } catch (error) {
    console.error('Error loading file details:', error);
    this.toastService.error({ message: 'Failed to load file details.' });
    throw error;
  }
}