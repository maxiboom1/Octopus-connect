import sqlService from "./sql-service.js";
import mosConnector from "../1-dal/mos-connector.js";
import mosCommands from "../utilities/mos-cmds.js";
import itemsHash from "../1-dal/items-hashmap.js";

async function registerStoryItems(story) {
    console.log('New Item Received');
    let ord = 0;
    for(const el of story.item){
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

async function updateStoryItems(story) {
    console.log("Item replace event.")
    let ord = 0;
    for(const el of story.item){
        const item = {
            uid: el.mosExternalMetadata.gfxItem,
            rundown: story.rundown,
            story: story.uid,
            ord:ord
        };
    await sqlService.updateItem(story.rundownStr,item);          
    ord++;
    }
}

export default { registerStoryItems , updateStoryItems};