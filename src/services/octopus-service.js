import mosConnector from "../1-dal/mos-connector.js";
import mosMediaConnector from "../1-dal/mos-media-connector.js";
import sqlService from "./sql-service.js";
import cache from "../1-dal/cache.js";
import ackService from "./ack-service.js";
import logger from "../utilities/logger.js";
import mosCommands from "../utilities/mos-cmds.js";
import appConfig from "../utilities/app-config.js";
import itemsService from "./items-service.js";

// MOS 2.8.5
class OctopusProcessor {
    
    async initialize() {
        logger('Starting Octopus-connect 1.00...');
        await sqlService.initialize();
        await mosConnector.connect();
        await mosMediaConnector.connect();
        mosConnector.sendToClient(mosCommands.roReqAll());
    }
    
    mosRouter(msg, port) {
        // double !! converts expression to boolean - so, 
        // if msg.mos.heartbeat exists - the !! convert it to "true"
        switch (true) {
            case !!msg.mos.heartbeat:
                //logger(port + " heartbeat");
                ackService.sendHeartbeat(port);
                break;
            case !!msg.mos.roListAll:
                logger(port + " received roListAll");
                this.roListAll(msg)
                break;
            case !!msg.mos.roList:
                logger(port + " received roList");
                this.roList(msg)
                break;
            case !!msg.mos.roCreate:
                this.roCreate(msg);
                break;
            case !!msg.mos.roReadyToAir:
                logger(port+ " readyToAir");
                ackService.sendAck(msg.mos.roReadyToAir.roID);
                break;
            case !!msg.mos.roStorySend:
                logger(port+ " storySend: " + JSON.stringify(msg));
                ackService.sendAck(msg.mos.roStorySend.roID);
                break;
            
            case !!msg.mos.roDelete:
                this.roDelete(msg);
                break;     
            
            // ****************** roElementAction complex message with actions ************************
            case !!msg.mos.roElementAction:
                const action = msg.mos.roElementAction["@_operation"];
                console.log("roElementAction: " + action);
                if(action === "MOVE"){
                    this.storyMove(msg);
                } 
                else if(action === "REPLACE"){
                    this.storyReplace(msg);
                } 
                else if(action === "MOVE"){

                } 
                else if(action === "DELETE"){

                } else {
                    console.log("Unknown roElementAction action: " + action);
                    ackService.sendAck(msg.mos.roElementAction.roID);
                }

                ackService.sendAck(msg.mos.roElementAction.roID);
                break;      
            
            default:
                logger('Unknown MOS message: ', true);
                console.log(JSON.stringify(msg));
                const roID = this.findRoID(msg);
                if(roID){ackService.sendAck(roID);}
        }
    }

    // If we receive some unknown MOS object - we will try to find its roID and return acknowledge, to avoid message stuck and reconnection.
    findRoID(obj) {
        if (obj.hasOwnProperty('roID')) {
            return obj.roID; // Return the roID value if found
        }
    
        for (const key in obj) {
            // Check if the key is an object itself (and not an array)
            if (typeof obj[key] === 'object' && obj[key] !== null) {
                const foundRoID = this.findRoID(obj[key]); // Recursively search in child objects
                if (foundRoID !== undefined) {
                    return foundRoID; 
                }
            }
        }
    
        return undefined;
    }
 
    async roListAll(msg) {

        const roArr = [].concat(msg.mos.roListAll.ro); // Normalize ro data

        for(const ro of roArr){
             const rundownStr = ro.roSlug;
             const roID = ro.roID;
             const uid = await sqlService.addDbRundown(rundownStr,roID);
             await cache.initializeRundown(rundownStr,uid, appConfig.production, roID);
        }
        // Now, when cache is updated, hide unwatched rundowns in sql
        await sqlService.hideUnwatchedRundowns();
        
        // Now, loop over all monitored rundowns, and request roReq for each
        for (const ro of roArr) {
            const roID = ro.roID;
            mosConnector.sendToClient(mosCommands.roReq(roID)); 
        }

    }

    async roList(msg){
        const roSlug = msg.mos.roList.roSlug;
        
        // Normalize `story` to always be an array, handling undefined properly (nested ternary)
        const stories = msg.mos.roList.story ? (Array.isArray(msg.mos.roList.story) ? msg.mos.roList.story : [msg.mos.roList.story]) : [];
        let ord = 0;       
        for(const story of stories){
            story.rundownStr = roSlug; //Add rundownStr to story
            story.ord = ord; //Add ord to story
            await this.handleNewStory(story);
            ord++;
        }

    }

    async roCreate(msg){
        const rundownStr = msg.mos.roCreate.roSlug;
        const roID = msg.mos.roCreate.roID;
        
        // Register rundown in DB and cache
        const uid = await sqlService.addDbRundown(rundownStr,roID);
        await cache.initializeRundown(rundownStr,uid, appConfig.production, roID);
        
        //Send ack to NCS
        ackService.sendAck(msg.mos.roCreate.roID);
        logger(`roCreate: New rundown registered  - ${rundownStr}` );
        
        // Send roReq request
        mosConnector.sendToClient(mosCommands.roReq(roID)); 
    }

    async roDelete(msg){
        const {uid,rundownStr} = await cache.getRundownUidAndStrByRoID(msg.mos.roDelete.roID);
        
        // Delete rundown, its stories and items from DB
        await sqlService.deleteDbRundown(uid, rundownStr);
        await sqlService.deleteDbStoriesByRundownID(uid);
        await sqlService.deleteDbItemsByRundownID(uid);
        
        // Delete rundown stories and items from cache
        await cache.deleteRundownFromCache(rundownStr);
        
        //Send ack to NCS
        ackService.sendAck(msg.mos.roDelete.roID);
        logger(`roDelete: ${rundownStr} was completely cleared from anywhere!` );
        
    }

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
        await sqlService.storyLastUpdate(story.uid);

    }
    
    // *************************************** Rundowns Element actions *************************************** // 

    // Its overwrite the whole story and its items, on any change. Possible optimization might be to compare each item before update them.
    async storyReplace(msg){
        const roID = msg.mos.roElementAction.roID;
        let story = msg.mos.roElementAction.element_source.story;
        story.rundownStr = cache.getRundownSlugByStoryID(story.storyID);
        story = await this.constructStory(story);
        story.uid = await cache.getStoryUid(story.rundownStr, story.storyID);
        story.ord = cache.getStoryOrd(story.rundownStr,story.storyID)
        // Updates story in SQL
        await sqlService.modifyDbStory(story);
        
        // Update items in SQL
        await itemsService.registerStoryItems(story);
        
        // Update cached story
        await cache.saveStory(story);

        // Update last updates to story and rundown
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

    // *************************************** Helper/common functions *************************************** // 

    // Adds to story uid, production, normalizing item for array. Story obj must have "rundownStr" prop!
    async constructStory(story){
        const rundownMeta = await cache.getRundownList(story.rundownStr);
        story.item = Array.isArray(story.item) ? story.item : [story.item];
        story.rundown = rundownMeta.uid;
        story.production = rundownMeta.production;
        return story;
    }
     
    async modifyOrd(rundownStr, storyID, storyUid,storyName, ord){
        cache.modifyStoryOrd(rundownStr, storyID, ord);
        await sqlService.modifyBbStoryOrd(rundownStr, storyUid, storyName, ord); 
    }
    
}


const octopusService = new OctopusProcessor();

export default octopusService;