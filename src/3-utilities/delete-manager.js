import cache from "../2-cache/cache.js";
import itemsHash from "../2-cache/items-hashmap.js";
import sqlService from "../4-services/sql-service.js";
import logger from "./logger.js";


class DeleteManager {

    async deleteItemByStoryUid(rundownStr, storyID, storyUid) {  
        try {
            // Get story items ids array
            const itemsIdArr = await cache.getItemsArrByStoryID(rundownStr, storyID);

            // Iterate over the itemsIdArr and remove each item ID from itemsHash concurrently
            await Promise.all(itemsIdArr.map(itemId => itemsHash.removeItem(itemId)));

            // Disable the items in the database
            await sqlService.disableDbItemsByStoryUid(storyUid);

            setTimeout(async () => {
                // If story exists in DB, don't delete items
                if (await cache.isStoryExists(rundownStr, storyID)) {
                    logger(`Story ${storyID} exists, cancel removing items`);
                    return;
                }
                await this.executeDelete(storyUid, itemsIdArr); 
            }, 10000);

        } catch (error) {
            logger(`Error deleting items for story ${storyUid}: ${error.message}`);
        }
    }

    async deleteItem(itemUid){
        
        await sqlService.disableDbItem(itemUid);
        
        itemsHash.removeItem(itemUid);

        setTimeout(async () => {
            // If item in use, cancel delete
            if (itemsHash.isUsed(itemUid)) {
                logger(`Item ${itemUid} exists, cancel scheduled delete`);
                return;
            }
            await this.executeDelete(0,[],{deleteItem:true, itemUid:itemUid}); 
        }, 15000);

    }

    async executeDelete(storyUid,itemsIdArr, options={}) {
        if (options.deleteItem){
            await sqlService.deleteDbItem(options.itemUid);
            logger(`Item [${options.itemUid}] has been removed.`);
            return;
        }
        await sqlService.deleteDbItemsByStoryUid(storyUid);
        logger(`Items [${itemsIdArr}] in story ${storyUid} removed.`);
    }

}

const deleteManager = new DeleteManager();

export default deleteManager;