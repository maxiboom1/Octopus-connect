import sqlService from "./sql-service.js";
import mosConnector from "../1-dal/mos-connector.js";
import mosCommands from "../3-utilities/mos-cmds.js";
import itemsHash from "../2-cache/items-hashmap.js";
import logger from "../3-utilities/logger.js";

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

        const item = constructItem(gfxItem, rundown, storyUid, ord);

        if (itemsHash.isUsed(item.uid)) {
            await handleDuplicateItem(item, story, el, ord);
        } else {
            await createNewItem(item, story.rundownStr, el.itemSlug);
        }
        
        ord++;
    }
}

async function handleDuplicateItem(item, story, el, ord) {
    const originalItem = await sqlService.getFullItem(item.uid);

    const duplicate = {
        name: originalItem.name,
        production: originalItem.production,
        rundown: story.rundown,
        story: story.uid,
        ord,
        template: originalItem.template,
        data: originalItem.data,
        scripts: originalItem.scripts,
    };

    const assertedUid = await sqlService.storeNewDuplicate(duplicate);

    itemsHash.registerItem(assertedUid);

    mosConnector.sendToClient(mosCommands.mosItemReplace(story, el, assertedUid));
    logger(`[ITEM] Saving duplicate item {${assertedUid}}, and send mosItemReplace to NRCS`);
}

async function createNewItem(item, rundownStr,itemSlug) {
    const result = await sqlService.updateItem(rundownStr, item);

    if (result) {
        itemsHash.registerItem(item.uid);
        logger(`[ITEM] New Item {${itemSlug}} created in {${rundownStr}}`);
    } else {
        logger(`[ITEM] OPPPS.. Item ${item.uid} doesn't exists in SQL`, "red");
    }
}

function constructItem(gfxItem, rundown, storyUid, ord) {
    return { uid: gfxItem, rundown, story: storyUid, ord };
}

export default { registerItems };

