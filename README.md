exports.post = async function (req: Request, res: Response) {
    let userId;
    try {
        userId = AccessRights.getUserIdFromReq(req);
        let reqObjects = req.body.LinkedDocumentList;

        // Process each object sequentially to minimize deadlocks
        const results = [];
        for (const obj of reqObjects) {
            const result = await new LinkedDocumentBLL().saveOrUpdateLinkDocument(obj, userId);
            results.push(result);
        }

        log.info(HttpStaus.OK, req['query'], 'save-page-number', userId, eModuleCode.Infra, eFunctionCode.LinkedDocument);
        res.status(HttpStaus.OK).send(results);
    } catch (error) {
        log.error(error, req['query'], 'save-page-number', userId, eModuleCode.Infra, eFunctionCode.LinkedDocument);
        res.status(HttpStaus.INTERNAL_SERVER_ERROR).send(`Some Error occurred. Error: ${error}`);
    }
};