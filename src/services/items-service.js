import sqlService from "./sql-service.js";
import mosConnector from "../1-dal/mos-connector.js";
import mosCommands from "../utilities/mos-cmds.js";
import itemsHash from "../1-dal/items-hashmap.js";
import cache from "../1-dal/cache.js";
import appConfig from "../utilities/app-config.js";
import logger from "../utilities/logger.js";

const debugMode = appConfig.debugMode;
const debugFunctions = appConfig.debugFunctions;

async function registerStoryItems(story) {
    
    if (debugFunctions) logHandler(`registerStoryItems`);
    
    for(const el of story.item){
        console.log('New Item Received');
        const item = constructItem(el.mosExternalMetadata.gfxItem, story.rundown, story.uid, story.ord);   
        
        if(itemsHash.isUsed(item.uid)){
            console.log("Hmm. It's Duplicate!");
            
            // Get original item
            const originalItem = await sqlService.getFullItem(item.uid); 
            console.log("Fetching original Item...");
            
            // Copy it to Sql, get new uid 
            const assertedUid = await sqlService.storeNewItem(originalItem);
            console.log("Saving original item as new with id: " + assertedUid);
            
            // Send itemReplace to Host
            mosConnector.sendToClient(mosCommands.mosItemReplace(story,el,assertedUid));
            console.log("Sending mosItemReplace to update Octopus");

        } else {
            itemsHash.registerItem(item.uid);
            await sqlService.updateItem(story.rundownStr,item);
            console.log("Item saved. Items hash is: " + itemsHash.list())
        } 
        
    }
}

async function addNewItem(cachedStory, newStory) {
    
    if (debugFunctions) logHandler(`addNewItem`);
    
    for (let i = 0; i < newStory.item.length; i++) {
        // Step 3: Extract necessary properties
        const newItem = newStory.item[i];
        const newGfxItem = newItem.mosExternalMetadata.gfxItem;
        const newOrd = newItem.ord;

        const cachedItem = cachedStory.item.find(item => item.mosExternalMetadata.gfxItem === newGfxItem);
        
        if (cachedItem) {
            if (cachedItem.ord !== newOrd) {
                await sqlService.updateItemOrd(newStory.rundown, newGfxItem, newOrd);
            }
        } else {
            // Add new item 
            const item = constructItem(newGfxItem, cachedStory.rundown, cachedStory.uid, newOrd); 
            itemsHash.registerItem(item.uid);
            await sqlService.updateItem(newStory.rundownStr,item);
            console.log("Item saved. Items hash is: " + itemsHash.list())
        }
    }

    // Overwrite the whole story in cache (why not?)
    newStory.uid = cachedStory.uid;
    newStory.ord = cachedStory.ord;
    cache.saveStory(newStory);
}

async function removeItem(cachedStory, newStory) {
    if (debugFunctions) logHandler(`removeItem`);

    for (let i = 0; i < cachedStory.item.length; i++) {
        
        const cachedGfxItem = cachedStory.item[i].mosExternalMetadata.gfxItem;
        const cachedOrd = cachedStory.item[i].ord;

        const newItem = newStory.item.find(item => item.mosExternalMetadata.gfxItem === cachedGfxItem);
        // Found the item in incoming story ==> so its not deleted one.
        if (newItem) {
            // Compare cached ord with new ord
            if (newItem.ord !== cachedOrd) {
                await sqlService.updateItemOrd(newStory.rundown, cachedGfxItem, newItem.ord);
            }
        } else {
            // removed item 
            itemsHash.removeItem(cachedGfxItem);
            await sqlService.disableDbItem(cachedGfxItem);
            console.log(`Item ${cachedGfxItem} disabled. Items hash is: ${itemsHash.list()} `);
        }
    }


    // Overwrite the whole story in cache (why not?)
    newStory.uid = cachedStory.uid;
    newStory.ord = cachedStory.ord;
    cache.saveStory(newStory);
}

async function analyzeEvent(story, incomingStory) {
    
    if (debugFunctions) logHandler(`analyzeEvent`);
    
    // Check for story changes
    if (story.name !== incomingStory.storySlug || story.number !== incomingStory.storyNum) {
        return {message: "story-change", data: null};
    }

    // Destructure all relevant arrays from the analyzeItems function
    const { newItemIDs, deletedItemIDs } = analyzeItems(story.item, incomingStory.item);

    // Check for new items
    if (newItemIDs.length > 0) {
        return {message: "new-item", data: newItemIDs};
    }

    // Check for deleted items
    if (deletedItemIDs.length > 0) {
        return {message: "remove-item", data: deletedItemIDs};
    }

    // If no changes detected
    return {message: "no-change-event", data: null};;
}

// Helper functions **************************************************

function analyzeItems(storyItems, incomingStoryItems) {
    
    if (debugFunctions) logHandler(`analyzeItems`);
    
    // Helper function to extract item IDs from an array of items
    const getItemIDs = items => items.map(item => item.itemID);
    
    // Get the IDs of the incoming items
    const incomingItemIDs = getItemIDs(incomingStoryItems);
    
    // Get the IDs of the cached items
    const cachedItemIDs = getItemIDs(storyItems);

    // Filter to find new item IDs that are in incoming items but not in cached items
    const newItemIDs = incomingItemIDs.filter(id => !cachedItemIDs.includes(id));
    
    // Filter to find deleted item IDs that are in cached items but not in incoming items
    const deletedItemIDs = cachedItemIDs.filter(id => !incomingItemIDs.includes(id));

    // Return an object containing all relevant arrays
    return { newItemIDs, deletedItemIDs };
}

function constructItem(gfxItem,rundown,storyUid,ord){
    if (debugFunctions) logHandler(`constructItem`);

    
    return {
        uid: gfxItem,
        rundown: rundown,
        story: storyUid,
        ord:ord
    };
}

function logHandler(message){
    if(debugMode) logger(`Items service: ` + message);
}

export default { registerStoryItems , analyzeEvent, addNewItem, removeItem};


/*
// story
{
  storyID: 11212104,
  storySlug: 'TEST2',
  storyNum: '',
  item: {
    itemID: '1-1',
    itemSlug: 'סטרייפ - ‫Stripe-01',
    objID: '',
    mosID: 'newsarts',
    mosExternalMetadata: { gfxItem: 60914, gfxTemplate: 90194, gfxProduction: 20013 }
  },
  mosExternalMetadata: {
    mosScope: 'story',
    mosSchema: 'octopus://STORY/EXTRA',
    mosPayload: { octext_payloadStoryExtra: [Object] }
  },
  rundownStr: 'Morning 11/19/2024 07:00'
}

// cached story:

{
  uid: '89150',
  storyID: 11212104,
  name: 'TEST2',
  number: '',
  ord: 0,
  production: 2,
  rundown: '10100',
  item: [
    {
      itemID: '1-1',
      itemSlug: 'סטרייפ - ‫Stripe-01',
      objID: '',
      mosID: 'newsarts',
      mosExternalMetadata: [Object]
    }
  ]
}
*/