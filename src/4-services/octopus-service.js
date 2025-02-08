import sqlService from "./sql-service.js";
import cache from "../2-cache/cache.js";
import ackService from "./ack-service.js";
import logger from "../3-utilities/logger.js";
import itemsService from "./items-service.js";
import deleteManager from "../3-utilities/delete-manager.js";
import itemsHash from "../2-cache/items-hashmap.js";

// MOS 2.8.5
class OctopusProcessor {
    
    // Triggered from roList incoming mos message, and from insert event
    async handleNewStory(story) {        
        
        // Add props to story
        story = await this.constructStory(story);

        // Store story in DB, and save assigned uid
        story.uid = await sqlService.addDbStory(story);
        
        // Create a deep copy of the story object
        const storyCopy = this.removeItemsMeta(story)

        // Clear meta form story items, and save story to cache
        await cache.saveStory(storyCopy);
        
        // Save Items of the story to DB
        await itemsService.registerItems(story);

        // Update last updates to story and rundown
        await sqlService.rundownLastUpdate(story.rundownStr);

        logger(`[STORY] Registering new story to {${story.rundownStr}}: {${story.storySlug}}`);
        
    }

    async storyReplace(msg){
        // Process story, add needed props and normalize items.
        const {roID,rundownStr,story} = this.propsExtractor(msg);
        story.rundownStr = rundownStr;
        story.uid = await cache.getStoryUid(rundownStr, story.storyID);
        await this.constructStory(story);
        const cachedStory = await cache.getStory(rundownStr, story.storyID);
        story.ord = cachedStory.ord;
        // Determine event type and handle it
        if (cachedStory.floating !== story.floating) { // Floating status compare
            const action = story.floating ===1 ? "floated": "un-floated";
            await sqlService.modifyDbStory(story);
            logger(`[STORY] Story {${story.storySlug}} has been ${action}`);
        
        } else if (cachedStory.name !== story.storySlug) { // Item slug change event
            await sqlService.modifyDbStory(story);
            logger(`[STORY] Story {${cachedStory.name}} slug changed to {${story.storySlug}}`);
        
        } else if (cachedStory.number !== story.storyNum) {  // Item Num change event     
            await sqlService.modifyDbStory(story);           
            logger(`[STORY] Story {${story.storySlug}} number changed to {${story.storyNum}}`);
        
        } else if (story.item.length > cachedStory.item.length) { // New item event
            const storyItemIds = story.item.map(item => item.itemID);
            const cachedItemIds = cachedStory.item.map(item => item.itemID);
            const itemIdToAdd = storyItemIds.filter(ID => !cachedItemIds.includes(ID));
            await itemsService.registerItems(story, {itemIDArr: itemIdToAdd, replaceEvent:true});
        
        } else if(story.item.length < cachedStory.item.length){ // Item delete event
            const storyGfxItems = story.item.map(item => item.mosExternalMetadata.gfxItem);
            const cachedStoryGfxItems = cachedStory.item.map(item => item.mosExternalMetadata.gfxItem);
            const itemsToDelete = cachedStoryGfxItems.filter(gfxItem => !storyGfxItems.includes(gfxItem));
            
            for (const item of itemsToDelete){
                await deleteManager.deleteItem(item);
                itemsHash.removeItem(item);
                logger(`[STORY] Item {${item}} disabled.`);
            }

        } else { // Reorder item check (fallback case)
            
            logger(`[STORY] Syncing story {${story.storySlug}}`);
            for(const item of story.item){
                await sqlService.updateItemOrd(rundownStr, item.mosExternalMetadata.gfxItem, item.ord);
            }
            
        }  
        
        // Clear story from meta, and update cache
        const storyCopy = this.removeItemsMeta(story)
        await cache.saveStory(storyCopy);
        
        // Update last updates
        await sqlService.rundownLastUpdate(story.rundownStr);
        await sqlService.storyLastUpdate(story.uid);
        ackService.sendAck(roID);
    }

    async storyMove(msg) {
        const roID = msg.mos.roElementAction.roID; // roID
        const rundownStr = cache.getRundownSlugByRoID(roID); // rundownSlug
        const sourceStoryID = msg.mos.roElementAction.element_source.storyID; // Moved story
        const targetStoryID = msg.mos.roElementAction.element_target.storyID; // Target story
        const stories = await cache.getRundown(rundownStr); // Get copy of stories
        
        const sourceStory = stories[sourceStoryID];
        const targetStory = targetStoryID ? stories[targetStoryID] : null;
    
        const sourceOrd = sourceStory.ord;
        const totalStories = Object.keys(stories).length;
        const targetOrd = targetStory ? targetStory.ord : totalStories; // Move to last+1 position if no target
        const movingDown = sourceOrd < targetOrd;
    
        for (const storyID in stories) {
            
            const currentStoryOrd = stories[storyID].ord;
            const storyUid = stories[storyID].uid;
            const storyName = stories[storyID].name;
            
            // Moving down: stories between source and target should decrement
            if (movingDown) {
                if (currentStoryOrd > sourceOrd && currentStoryOrd < targetOrd) {
                    await this.modifyOrd(rundownStr, storyID, storyUid,storyName, currentStoryOrd-1);
                } else if (currentStoryOrd === sourceOrd) {
                    const modifiedOrd = targetStory ? targetOrd - 1 : totalStories - 1;
                    await this.modifyOrd(rundownStr, storyID, storyUid,storyName, modifiedOrd);
                }
            }
            
            // Moving up: stories between target and source should increment
            else {
                if (currentStoryOrd < sourceOrd && currentStoryOrd >= targetOrd) {  
                    await this.modifyOrd(rundownStr, storyID, storyUid,storyName, currentStoryOrd+1);
                } else if (currentStoryOrd === sourceOrd) {   
                    await this.modifyOrd(rundownStr, storyID, storyUid,storyName, targetOrd);
                }
            }

        }
        
        await sqlService.rundownLastUpdate(rundownStr);
        logger(`[STORY] Reorder story {${sourceStory.name}} in {${rundownStr}} rundown` );
        ackService.sendAck(roID);

    }

    async insertStory(msg) {

        const {roID,rundownStr,targetStoryID,story} = this.propsExtractor(msg);
        
        // Missing target means the insert story is on last position
        if(targetStoryID === ""){
            const storiesLength = await cache.getRundownLength(rundownStr);            
            story.ord = storiesLength === 0? 0: storiesLength;
        } else {
            const targetOrd = await sqlService.getStoryOrdByStoryID(targetStoryID);
            const storyIDsArr = await cache.getSortedStoriesIdArrByOrd(rundownStr, targetOrd);            

            for(let i = 0; i<storyIDsArr.length; i++){
                const newStoryOrder = targetOrd + i + 1;
                await cache.modifyStoryOrd(rundownStr, storyIDsArr[i], newStoryOrder);
                await sqlService.modifyBbStoryOrdByStoryID(storyIDsArr[i], newStoryOrder);                 
            }

            story.ord = targetOrd;
        }

        story.rundownStr = rundownStr;
        // Store new story and its items
        await this.handleNewStory(story); 
        ackService.sendAck(roID);
    }

    async deleteStory(msg) {
        const roID = msg.mos.roElementAction.roID; // roID
        const rundownStr = cache.getRundownSlugByRoID(roID); // rundownSlug
        const sourceStoryID = msg.mos.roElementAction.element_source.storyID; // Deleted story
        const stories = await cache.getRundown(rundownStr); // Get copy of stories
        const deletedOrd = stories[sourceStoryID].ord;

        // Run over all stories in RD, delete/reorder 
        for (const storyID in stories) {
            const currentOrd = stories[storyID].ord;
            
            if(currentOrd < deletedOrd ) continue;
            
            if(currentOrd === deletedOrd){
                await deleteManager.deleteItemByStoryUid(rundownStr, sourceStoryID ,stories[sourceStoryID].uid);
                await cache.deleteStory(rundownStr, sourceStoryID);
                await sqlService.deleteStory(rundownStr, stories[storyID].uid);
                logger(`[STORY] Story {${stories[storyID].name}} has been deleted, and all included items delete scheduled.`);

            } else { 
                // decrement story id in sql and cache
                await cache.modifyStoryOrd(rundownStr, storyID, currentOrd-1);
                await sqlService.modifyBbStoryOrd(rundownStr, stories[storyID].uid, stories[storyID].name, currentOrd-1); 
            }
        }


        // Update rundown last update
        await sqlService.rundownLastUpdate(rundownStr);
        // Send ack to mos
        ackService.sendAck(roID);
    }

    // *************************************** Helper/common functions *************************************** // 

    // Adds to story uid, production, normalizing item for array. Story obj must have "rundownStr" prop!
    async constructStory(story){
        story.item = Array.isArray(story.item) ? story.item : [story.item];
        
        // Run over items, and assign ord
        for(let i = 0; i<story.item.length; i++){
            story.item[i].ord = i;
        }
        const rundownMeta = await cache.getRundownList(story.rundownStr);
        story.roID = rundownMeta.roID;
        story.rundown = String(rundownMeta.uid);
        story.production = rundownMeta.production;
        story.storySlug = String(story.storySlug);
        story.floating = story.storySlug.endsWith(' [SKIP]') ? 1:0;
        if(story.floating === 1){
            story.storySlug = story.storySlug.slice(0,-7); // Slice the " [SKIP]" from story name
        }
        
        return story;
    }
     
    async modifyOrd(rundownStr, storyID, storyUid,storyName, ord){
        await cache.modifyStoryOrd(rundownStr, storyID, ord);
        await sqlService.modifyBbStoryOrd(rundownStr, storyUid, storyName, ord); 
    }

    propsExtractor(msg){
        const roID = msg.mos.roElementAction.roID; 
        const rundownStr = cache.getRundownSlugByRoID(roID); 
        const targetStoryID = msg.mos.roElementAction.element_target.storyID;
        const story = msg.mos.roElementAction.element_source.story; 
        return {roID,rundownStr,targetStoryID,story}
    }

    removeItemsMeta(story){
        
        const storyCopy = JSON.parse(JSON.stringify(story));
        
        if (storyCopy.item && Array.isArray(storyCopy.item)) {
            storyCopy.item.forEach(item => {
                if (item.mosExternalMetadata) {
                    delete item.mosExternalMetadata.data;
                    delete item.mosExternalMetadata.scripts;
                    delete item.mosExternalMetadata.metadata;
                }
            });
        }
        return storyCopy;
    }


}


const octopusService = new OctopusProcessor();

export default octopusService;