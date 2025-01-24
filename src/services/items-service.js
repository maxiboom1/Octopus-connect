import sqlService from "./sql-service.js";
import mosConnector from "../1-dal/mos-connector.js";
import mosCommands from "../utilities/mos-cmds.js";
import itemsHash from "../1-dal/items-hashmap.js";
import appConfig from "../utilities/app-config.js";
import logger from "../utilities/logger.js";

const { debugMode, debugFunctions } = appConfig;

async function registerItems(story, options = { itemsToAdd: [] }) {

    const { rundown, uid: storyUid } = story;
    let ord = 0;

    for (const el of story.item) {
        const { gfxItem } = el.mosExternalMetadata;

        if (options.itemsToAdd.length > 0 && !options.itemsToAdd.includes(gfxItem)) {
            ord++;
            continue;
        }

        const item = constructItem(gfxItem, rundown, storyUid, ord);

        if (itemsHash.isUsed(item.uid)) {
            await handleDuplicateItem(item, story, el, ord);
        } else {
            await createNewItem(item, story.rundownStr);
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
    logHandler(`Saving duplicate item ${assertedUid}, and send mosItemReplace to NRCS`);
}

async function createNewItem(item, rundownStr) {
    const result = await sqlService.updateItem(rundownStr, item);

    if (result) {
        itemsHash.registerItem(item.uid);
        logHandler(`New Item ${item.uid} created`);
    } else {
        logHandler(`OPPPS.. Item ${item.uid} doesn't exists in SQL`);
    }
}

function constructItem(gfxItem, rundown, storyUid, ord) {
    return { uid: gfxItem, rundown, story: storyUid, ord };
}

function logHandler(message) {
    if (debugMode) logger(`Items service: ` + message);
}

export default { registerItems };

