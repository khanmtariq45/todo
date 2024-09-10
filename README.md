 public async recurseTreeMapData(catalogueSubCatalogData, record, parentData, newData, token ,isSelected?){
        try {
            // passing in the record node, get children, recurse until leaf is reached.
            let child = catalogueSubCatalogData.filter(element =>{
                return element.Parent_ID === record.Child_ID;
            })
            if (child.length > 0) {
                if (!newData.children) {
                    newData.children = [];
                }
                for (var i = 0; i < child.length; i++) {
                    const spareRecords = await new PurcSparesBLL().getReqsnSpareCountByMachinery(parentData.vessel_uid, child[i].subcomponent_uid);
                    const spareCounts = spareRecords.count;
                    let spareSupplyItemCount = await new SupplySparesCountBLL().getSupplySpareCountByMachinery(parentData.document_code,child[i].machinery_uid,child[i].subcomponent_uid);
                    if(spareSupplyItemCount > 0 && isSelected === undefined){
                        child[i].is_selectAll = true;
                    } else {
                        child[i].is_selectAll = isSelected;
                    }
                    newData.children.push({
                        data : {
                            DisplayText: child[i].DisplayText,
                            component_description : child[i].component_description,
                            Parent_ID: child[i].Parent_ID,
                            Child_ID: child[i].Child_ID,
                            item_count : spareCounts,
                            level : child[i].level,
                            tag : child [i].tag,
                            system_tag_type : child[i].system_tag_type,
                            vessel_id : child[i].vessel_id,
                            system_code : child[i].system_code,
                            subsystem_code : child[i].subsystem_code,
                            machinery_uid : child[i].machinery_uid,
                            subcomponent_uid : child[i].subcomponent_uid,
                            component_uid : parentData.Child_ID,
                            supply_items_count : spareSupplyItemCount,
                            is_checked: child[i].is_selectAll
                        }
                    });
                    // recursve with current child record
                    this.recurseTreeMapData(catalogueSubCatalogData, child[i], parentData, newData.children[i] ,token);
                }
            }
            return newData;
        } catch (error) {
            throw new Error(`method : recurseTreeMapData class = CatalogueSubCatalogueBLL Error: ${error}`);
        }
}
