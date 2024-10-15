import mosConnector from "../1-dal/mos-connector.js";
import mosMediaConnector from "../1-dal/mos-media-connector.js";
import sqlService from "./sql-service.js";
import inewsCache from "../1-dal/inews-cache.js";
import ackService from "./ack-service.js";
import logger from "../utilities/logger.js";
import mosCommands from "../mos-commands/mos-cmds.js";
import appConfig from "../utilities/app-config.js";

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
                this.sendHeartbeat(port);
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
                logger(port+ " roCreate");
                this.sendAck(msg.mos.roCreate.roID);
                break;
            case !!msg.mos.roReadyToAir:
                logger(port+ " readyToAir");
                this.sendAck(msg.mos.roReadyToAir.roID);
                break;
            case !!msg.mos.roStorySend:
                logger(port+ " storySend: " + JSON.stringify(msg));
                this.sendAck(msg.mos.roStorySend.roID);
                break;
            
            // Story Events while not using roElementAction    
            case !!msg.mos.roStoryMove:
                logger(port+ " storyStoryMove");
                this.sendAck(msg.mos.roStoryMove.roID);
                break; 
            case !!msg.mos.roStoryDelete:
                logger(port+ " roStoryDelete");
                this.sendAck(msg.mos.roStoryDelete.roID);
                break;   
            case !!msg.mos.roStoryInsert:
                logger(port+ " storyStoryInsert: " + JSON.stringify(msg));
                this.sendAck(msg.mos.roStoryInsert.roID);
                break;  
            case !!msg.mos.roStoryReplace:
                logger(port+ " roStoryReplace");
                logger(JSON.stringify(msg));
                this.sendAck(msg.mos.roStoryReplace.roID);
                break;   
            case !!msg.mos.roStoryAppend:
                logger(port+ " roStoryAppend");
                this.sendAck(msg.mos.roStoryAppend.roID);
                break;  
            case !!msg.mos.roDelete:
                logger(port+ " RoDelete");
                this.sendAck(msg.mos.roDelete.roID);
                break;     
            case !!msg.mos.roElementAction:
                logger(port + " roElementAction");
                console.log(msg.mos.roElementAction["@_operation"]);
                this.sendAck(msg.mos.roElementAction.roID);
                break;      
            
            default:
                logger('Unknown MOS message: ', true);
                console.log(JSON.stringify(msg));
                const roID = this.findRoID(msg);
                if(roID){this.sendAck(roID);}
        }
    }
    
    sendAck(roID){
        const ack = ackService.constructRoAckMessage(roID);
        mosConnector.sendToListener(ack);
    }
    
    sendHeartbeat(port){
        if(port === "listener"){
            mosConnector.sendToListener(ackService.constructHeartbeatMessage());
        }
        if(port === "media-listener"){
            mosMediaConnector.sendToMediaListener(ackService.constructHeartbeatMessage());
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
        for (let i = 0; i < roIDs.length; i++) {
            const rundownStr = roSlugs[i];
            const roID = roIDs[i];
            const uid = await sqlService.addDbRundown(rundownStr,roID);
            await inewsCache.initializeRundown(rundownStr,uid, appConfig.production, roID);
            //mosConnector.sendToClient(mosCommands.roReq(roIDs[i])); 
        }

        for (let i = 0; i < roIDs.length; i++) {
            const roID = roIDs[i];
            mosConnector.sendToClient(mosCommands.roReq(roID)); 
        }

        await sqlService.hideUnwatchedRundowns();

    }

    async roList(msg){
        //console.log(msg)
        const roSlug = msg.mos.roList.roSlug;
        let ord = 0;
        // Normalize `story` to always be an array
        const stories = Array.isArray(msg.mos.roList.story) ? msg.mos.roList.story : [msg.mos.roList.story];        
        for(const story of stories){
            await this.handleNewStory(roSlug, story, ord);
            ord++;
        }
    }
    
    async handleNewStory(rundownStr,story, ord) {        

        //new story: name, float, number, production,rundown, ord, storyID
        const assertedStoryUid = await sqlService.addDbStory(rundownStr, story, ord);
        
        // Save this story to cache
        // await inewsCache.saveStory(rundownStr, listItem, index);

        // await itemsService.registerStoryItems(rundownStr,listItem);

        // await sqlService.rundownLastUpdate(rundownStr);

        // await sqlService.storyLastUpdate(assertedStoryUid);

    }

}


const octopusService = new OctopusProcessor();

export default octopusService;