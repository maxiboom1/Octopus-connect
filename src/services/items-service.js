import sqlService from "./sql-service.js";
import mosConnector from "../1-dal/mos-connector.js";
import mosCommands from "../utilities/mos-cmds.js";
import itemsHash from "../1-dal/items-hashmap.js";

async function registerStoryItems(story) {
    let ord = 0;
    for(const el of story.item){
        console.log('New Item Received');
        const item = {
            uid: el.mosExternalMetadata.gfxItem,
            rundown: story.rundown,
            story: story.uid,
            ord:ord
        };
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
        
        ord++;
    }
}

async function addNewItem(cachedStory, newStory, itemID) {
    for(const el of newStory.item){
        console.log(el);
    }
}

async function analyzeEvent(story, incomingStory) {
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


// Helper func
function analyzeItems(storyItems, incomingStoryItems) {
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


export default { registerStoryItems , analyzeEvent, addNewItem};


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