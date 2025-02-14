import sqlService from "./sql-service.js";
import mosConnector from "../1-dal/mos-connector.js";
import mosCommands from "../3-utilities/mos-cmds.js";
import itemsHash from "../2-cache/items-hashmap.js";
import logger from "../3-utilities/logger.js";
import mosRouter from "./mos-router.js";


async function registerItems(story, options = { itemIDArr: [], replaceEvent:false }) {
    const { rundown, uid: storyUid, rundownStr } = story;
    let ord = 0;
    for (const el of story.item) {
        const {gfxItem} = el.mosExternalMetadata;
        const itemID = el.itemID;
        
        // If its from replaceEvent, process only items in the list
        if (options.replaceEvent) {
            const indexInAdd = options.itemIDArr.indexOf(itemID);

            if (indexInAdd === -1) {
                await sqlService.updateItemOrd(rundownStr, gfxItem, ord);
                ord++;
                continue; // Skip if not in itemIDArr
            }

            // Remove the itemID from itemIDArr after processing,  to handle case when
            // user copy same item in same story (we get then 2 items with same gfxItem)
            options.itemIDArr.splice(indexInAdd, 1);
        }

        const item = constructItem(el, rundown, storyUid, ord);

        if (itemsHash.isUsed(item.uid)) {
            await handleDuplicateItem(item, story, el, ord);
        } else {
            await createNewItem(item, story,el);
        }
        
        ord++;
    }
}

async function createNewItem(item, story, el) { //Item: {uid, name, production, rundown, story, ord, template, data, scripts}
    
    const result = await sqlService.upsertItem(story.rundownStr, item);
    
    if (result.success) {
        
        itemsHash.registerItem(result.uid); // Register item in hash
        
        // Item was exists in DB ==> Update item
        if(result.event === "update"){
            logger(`[ITEM] New Item {${item.name}} updated in {${story.rundownStr}}`);
        } 

        // Item wasn't exist in DB ==> Restore item
        else if(result.event === "create"){
            //logger(`[ITEM] New Item {${item.name}} restored in {${story.rundownStr}}`);
            await sendMosItemReplace(story, el, result.uid, "NEW ITEM");
        }

    
    } else {
        logger(`[ITEM] OPPPS.. Failed to create/update ${item.uid}. Error details: ${result.error}`, "red");
    }

}

async function handleDuplicateItem(item, story, el, ord) {
    //const originalItem = await sqlService.getFullItem(item.uid);

    const duplicate = {
        name: item.name,
        production: item.production,
        rundown: story.rundown,
        story: story.uid,
        ord,
        template: item.template,
        data: item.data,
        scripts: item.scripts,
    };

    const assertedUid = await sqlService.storeNewDuplicate(duplicate);

    itemsHash.registerItem(assertedUid);

    await sendMosItemReplace(story, el, assertedUid, "DUPLICATE");
   
}

function constructItem(item, rundown, storyUid, ord) {
    return { 
        uid: item.mosExternalMetadata.gfxItem,
        name:item.itemSlug,
        production: item.mosExternalMetadata.gfxProduction,
        rundown, 
        story: storyUid, 
        ord,
        template: item.mosExternalMetadata.gfxTemplate,
        data:item.mosExternalMetadata.data,
        scripts: item.mosExternalMetadata.scripts,
        metadata:item.mosExternalMetadata.metadata
    };
}

async function sendMosItemReplace(story, el, assertedUid, action){
    
    const m = mosCommands.mosItemReplace(story, el, assertedUid); // Returns {item:{},messageID:messageID}
    
    logger(`[ITEM] ${action}: Sending mosItemReplace for item {${assertedUid}}: messageID:{${m.messageID}}`,"blue");

    mosConnector.sendToClient(m.replaceMosMessage);
    
    // Wait for roAck for sended mosItemReplace
    try {
        await waitForRoAck(m.messageID);
    } catch (error) {
        logger(error.message, "red");
    }

}

function waitForRoAck(messageID, timeout = 5000) {
    return new Promise((resolve, reject) => {
        const listener = (msg) => {
            if (msg.mos && msg.mos.roAck && msg.mos.messageID === messageID) {
                mosRouter.off('roAckMessage', listener);
                //logger(`[ITEM] mosItemReplace ack'd for messageID: ${messageID}`, "green");
                resolve();
            }
        };
        
        const timer = setTimeout(() => {
            mosRouter.off('roAckMessage', listener);
            reject(new Error(`[ITEM] Timeout waiting for roAck (messageID: ${messageID})`));
        }, timeout);

        mosRouter.on('roAckMessage', listener);
    });
}

export default { registerItems };
