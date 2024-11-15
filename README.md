Sent by you:
I am facing an error 

Some Error occured. Error: Error: Method: saveOrUpdateLinkDocument
Class: LinkedDocumentBLL
Error: QueryFailedError: Error: Transaction (Process ID 110) was deadlocked on lock resources with another process and
has been chosen as the deadlock victim. Rerun the transaction.


while my api is 


exports.post = async function (req: Request, res: Response) {
    let userId;
    try {
        userId = AccessRights.getUserIdFromReq(req);
        let reqObjects = req.body.LinkedDocumentList;
        const result = await Promise.all(reqObjects.map(obj => new LinkedDocumentBLL().saveOrUpdateLinkDocument(obj, userId)));
        if (result) {
            log.info(HttpStaus.OK, req['query'], 'save-page-number', userId, eModuleCode.Infra, eFunctionCode.LinkedDocument);
            res.status(HttpStaus.OK).send(result);
        }
    } catch (error) {
        log.error(error, req['query'], 'save-page-number', userId, eModuleCode.Infra, eFunctionCode.LinkedDocument);
        res.status(HttpStaus.INTERNAL_SERVER_ERROR).send(`Some Error occured. Error: ${error}`);
    }
}


 async saveOrUpdateLinkDocument(objLinkedDocument, userId) {
        try {
            const saveHelpObject = {
                ...objLinkedDocument
            };
            const QMS_Document_Linking = await getManager().findOne(QMS_DocumentLinking, { where: { uid: saveHelpObject.uid} });
            
            if(QMS_Document_Linking) {
                saveHelpObject.date_of_modification = await this.getSystemDateOffset();
                saveHelpObject.modified_by= userId;
            } else {
                saveHelpObject.created_by = userId
            }
            let result = await getManager().save(QMS_DocumentLinking, saveHelpObject);

            return result; 
        } catch (error) {
            throw new Error(`Method: saveOrUpdateLinkDocument \nClass: LinkedDocumentBLL \nError: ${error}`);
        }
    }
