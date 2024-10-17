import mosConnector from "../1-dal/mos-connector.js";
import mosMediaConnector from "../1-dal/mos-media-connector.js";
import sqlService from "./sql-service.js";
import inewsCache from "../1-dal/inews-cache.js";
import ackService from "./ack-service.js";
import logger from "../utilities/logger.js";
import mosCommands from "../utilities/mos-cmds.js";
import appConfig from "../utilities/app-config.js";
import itemsService from "./items-service.js";

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
            
            // Story Events while not using roElementAction    
            case !!msg.mos.roStoryMove:
                logger(port+ " storyStoryMove");
                ackService.sendAck(msg.mos.roStoryMove.roID);
                break; 
            case !!msg.mos.roStoryDelete:
                logger(port+ " roStoryDelete");
                ackService.sendAck(msg.mos.roStoryDelete.roID);
                break;   
            case !!msg.mos.roStoryInsert:
                logger(port+ " storyStoryInsert: " + JSON.stringify(msg));
                ackService.sendAck(msg.mos.roStoryInsert.roID);
                break;  
            case !!msg.mos.roStoryReplace:
                logger(port+ " roStoryReplace");
                logger(JSON.stringify(msg));
                ackService.sendAck(msg.mos.roStoryReplace.roID);
                break;   
            case !!msg.mos.roStoryAppend:
                logger(port+ " roStoryAppend");
                ackService.sendAck(msg.mos.roStoryAppend.roID);
                break;  
            case !!msg.mos.roDelete:
                this.roDelete(msg);
                break;     
            
            case !!msg.mos.roElementAction:
                
                const action = msg.mos.roElementAction["@_operation"];
                if(action === "REPLACE"){
                    this.storyReplace(msg);
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
        const roIDs = [].concat(msg.mos.roListAll.roID); 
        const roSlugs = [].concat(msg.mos.roListAll.roSlug); 
        
        // Loop over all monitored rundowns and register them in SQL and cache
        for (let i = 0; i < roIDs.length; i++) {
            const rundownStr = roSlugs[i];
            const roID = roIDs[i];
            const uid = await sqlService.addDbRundown(rundownStr,roID);
            await inewsCache.initializeRundown(rundownStr,uid, appConfig.production, roID);
        }
        // Now, when cache is updated, hide unwatched rundowns in sql
        await sqlService.hideUnwatchedRundowns();
        
        // Now, loop over all monitored rundowns, and request roReq for each
        for (let i = 0; i < roIDs.length; i++) {
            const roID = roIDs[i];
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
        await inewsCache.initializeRundown(rundownStr,uid, appConfig.production, roID);
        
        //Send ack to NCS
        ackService.sendAck(msg.mos.roCreate.roID);
        logger(`roCreate: New rundown registered  - ${rundownStr}` );
        
        // Send roReq request
        mosConnector.sendToClient(mosCommands.roReq(roID)); 
    }

    async roDelete(msg){
        const {uid,rundownStr} = await inewsCache.getRundownUidAndStrByRoID(msg.mos.roDelete.roID);
        
        // Delete rundown, its stories and items from DB
        await sqlService.deleteDbRundown(uid, rundownStr);
        await sqlService.deleteDbStoriesByRundownID(uid);
        await sqlService.deleteDbItemsByRundownID(uid);
        
        // Delete rundown stories and items from cache
        await inewsCache.deleteRundownFromCache(rundownStr);
        
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
        await inewsCache.saveStory(story);

        // Save Items of the story to DB
        await itemsService.registerStoryItems(story);

        // Update last updates to story and rundown
        await sqlService.rundownLastUpdate(story.rundownStr);
        await sqlService.storyLastUpdate(story.uid);

    }
    // Adds to story uid, production, normalizing item for array
    async constructStory(story){
        const rundownMeta = await inewsCache.getRundownList(story.rundownStr);
        story.item = Array.isArray(story.item) ? story.item : [story.item];
        story.rundown = rundownMeta.uid;
        story.production = rundownMeta.production;
        return story;
    }
    // *************************************** Rundowns Element actions *************************************** // 

    async storyReplace(msg){
        const roID = msg.mos.roElementAction.roID;
        let story = msg.mos.roElementAction.element_source.story;
        story.rundownStr = inewsCache.getRundownSlugByStoryID(story.storyID);
        story = await this.constructStory(story);
        story.uid = await inewsCache.getStoryUid(story.rundownStr, story.storyID);
        // Updates story in SQL
        await sqlService.modifyDbStory(story);
        
        // Update items in SQL
        await itemsService.registerStoryItems(story);
        
        // Update cached story
        await inewsCache.saveStory(story);

        // Update last updates to story and rundown
        await sqlService.rundownLastUpdate(story.rundownStr);
        await sqlService.storyLastUpdate(story.uid);
        
        ackService.sendAck(roID);
    }
}


const octopusService = new OctopusProcessor();

export default octopusService;