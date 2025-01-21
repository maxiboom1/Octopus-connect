import sqlService from "./sql-service.js";
import cache from "../1-dal/cache.js";
import ackService from "./ack-service.js";
import logger from "../utilities/logger.js";
import itemsService from "./items-service.js";

// MOS 2.8.5
class OctopusProcessor {

    async handleNewStory(story) {        

        // Add props to story
        story = await this.constructStory(story);

        // Store story in DB, and save assigned uid
        story.uid = await sqlService.addDbStory(story);
        
        // Save story to cache
        await cache.saveStory(story);

        // Save Items of the story to DB
        await itemsService.registerStoryItems(story);

        // Update last updates to story and rundown
        await sqlService.rundownLastUpdate(story.rundownStr);
        
    }

    // Its overwrite the whole story and its items, on any change. Possible optimization might be to compare each item before update them.
    async storyReplace(msg){
        
        const roID = msg.mos.roElementAction.roID;
        let story = msg.mos.roElementAction.element_source.story;
        story.item = Array.isArray(story.item) ? story.item : [story.item]; // Normalize to array struct
        story.rundownStr = cache.getRundownSlugByStoryID(story.storyID);
        const cachedStory = await cache.getStory(story.rundownStr, story.storyID);
        story = await this.constructStory(story);

        const event = await itemsService.analyzeEvent(cachedStory, story);
        
        // Done and checked
        if(event.message === "story-change"){
            logger(`Story ${cachedStory.name} metadata changed`);
            await sqlService.modifyDbStory(story);
            await cache.modifyStoryProps(story);
        }
        if(event.message === "new-item"){
            logger("Item create event");
            await itemsService.addNewItem(cachedStory,story);
        }
        if(event.message === "remove-item"){
            logger("Item remove event");
            await itemsService.removeItem(cachedStory,story);
        }

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

        ackService.sendAck(roID);
    }

    async insertStory(msg) {
        const roID = msg.mos.roElementAction.roID; // roID
        const rundownStr = cache.getRundownSlugByRoID(roID); // rundownSlug
        const targetStoryID = msg.mos.roElementAction.element_target.storyID;
        const stories = await cache.getRundown(rundownStr); // Get copy of stories
        // In case there are no stories yet in RD
        const targetOrd = (stories[targetStoryID] && stories[targetStoryID].ord) ? stories[targetStoryID].ord: 0;

        // Run over all stories in RD, to sync orders
        for (const storyID in stories) {
            const currentOrd = stories[storyID].ord;
            
            // Bypass all stories above inserted
            if(currentOrd < targetOrd) continue;
            
            // Increase stories ord from target to the end of list
            if(currentOrd >= targetOrd){
                await cache.modifyStoryOrd(rundownStr, storyID, currentOrd+1);
                await sqlService.modifyBbStoryOrd(rundownStr, stories[storyID].uid, stories[storyID].name, currentOrd+1); 
            }

        }
        
        const story = msg.mos.roElementAction.element_source.story; // Inserted story
        
        // Set props to inserted story
        story.ord = targetOrd;
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
                // Add here Delete all story items!
                await cache.deleteStory(rundownStr, sourceStoryID);
                await sqlService.deleteStory(rundownStr, stories[storyID].uid);
            } else { 
                // decrement story id in sql and cache
                await cache.modifyStoryOrd(rundownStr, storyID, currentOrd-1);
                await sqlService.modifyBbStoryOrd(rundownStr, stories[storyID].uid, stories[storyID].name, currentOrd-1); 
            }
        }
        // Delete all items with deleted story uid
        await sqlService.deleteDbItemsByStoryUid(stories[sourceStoryID].uid);
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
        story.rundown = rundownMeta.uid;
        story.production = rundownMeta.production;
        return story;
    }
     
    async modifyOrd(rundownStr, storyID, storyUid,storyName, ord){
        await cache.modifyStoryOrd(rundownStr, storyID, ord);
        await sqlService.modifyBbStoryOrd(rundownStr, storyUid, storyName, ord); 
    }

}


const octopusService = new OctopusProcessor();

export default octopusService;