import mosConnector from "../1-dal/mos-connector.js";
import mosMediaConnector from "../1-dal/mos-media-connector.js";
import sqlService from "./sql-service.js";
import cache from "../2-cache/cache.js";
import ackService from "./ack-service.js";
import logger from "../3-utilities/logger.js";
import mosCommands from "../3-utilities/mos-cmds.js";
import appConfig from "../3-utilities/app-config.js";
import octopusService from "./octopus-service.js";
import logMessages from "../3-utilities/logger-messages.js";
import itemsHash from "../2-cache/items-hashmap.js";

// MOS 2.8.5
class AppProcessor {
    constructor() {
        this.roQueue = []; // Queue to store rundown IDs
        this.pendingRequest = false; // Flag to track if a request is in progress
    }
    
    async initialize() {
        logMessages.appLoadedMessage();
        await sqlService.initialize();
        await mosConnector.connect();
        await mosMediaConnector.connect();
        mosConnector.sendToClient(mosCommands.roReqAll());// Start point - sends roReqAll and server receives roListAll
    }
    
    async roListAll(msg) {
        if (msg.mos.roListAll === ""){
            logger("[RUNDOWN] NCS doesn't have active rundowns.","red");
            return;
        }
        const roArr = [].concat(msg.mos.roListAll.ro); // Normalize ro data

        for(const ro of roArr){
             const rundownStr = ro.roSlug;
             const roID = ro.roID;
             const production = this.getProdByRundownStr(rundownStr);
             const uid = await sqlService.addDbRundown(rundownStr,roID,production);
             await cache.initializeRundown(rundownStr,uid, production, roID);
             this.roQueue.push(ro.roID); // Add roID to queue
        }
        // Now, when cache is updated, hide unwatched rundowns in sql
        await sqlService.hideUnwatchedRundowns();
        
        // Start processing the queue
        this.processNextRoReq();
        
    }

    async processNextRoReq() {
        if (this.pendingRequest || this.roQueue.length === 0) {
            return; // Exit if a request is already in progress or the queue is empty
        }

        this.pendingRequest = true; // Mark a request as in progress
        const roID = this.roQueue.shift(); // Get the next roID from the queue
        mosConnector.sendToClient(mosCommands.roReq(roID));
    }

    async roList(msg){
        const roSlug = msg.mos.roList.roSlug;

        // Normalize `story` to always be an array, handling undefined properly (nested ternary)
        const stories = msg.mos.roList.story ? (Array.isArray(msg.mos.roList.story) ? msg.mos.roList.story : [msg.mos.roList.story]) : [];
        let ord = 0;       
        for(const story of stories){
            story.rundownStr = roSlug; //Add rundownStr to story
            story.ord = ord; //Add ord to story
            await octopusService.handleNewStory(story);
            
            ord++;
        }
        logger(`[RUNDOWN] Loaded rundown {${roSlug}}`);

        // Mark the current request as complete and process the next roReq
        this.pendingRequest = false;
        this.processNextRoReq();

    }

    async roCreate(msg){
        const rundownStr = msg.mos.roCreate.roSlug;
        const roID = msg.mos.roCreate.roID;
        const production = this.getProdByRundownStr(rundownStr);
        
        // Register rundown in DB and cache
        const uid = await sqlService.addDbRundown(rundownStr,roID,production);
        await cache.initializeRundown(rundownStr,uid, production, roID);
        
        //Send ack to NCS
        ackService.sendAck(msg.mos.roCreate.roID);
        logger(`[RUNDOWN] New rundown registered  - {${rundownStr}}` );
        
        // Send roReq request
        mosConnector.sendToClient(mosCommands.roReq(roID)); 
    }

    async roDelete(msg){
        const {uid,rundownStr} = await cache.getRundownUidAndStrByRoID(msg.mos.roDelete.roID);
        
        // Delete rundown and its stories 
        await sqlService.deleteDbRundown(uid, rundownStr);
        await sqlService.deleteDbStoriesByRundownID(uid);
        
        //Delete item when user unmonitors rundown
        await this.deleteItemsOnUnmonitor(uid);

        
        // Delete rundown stories and items from cache
        await cache.deleteRundownFromCache(rundownStr);
        
        //Send ack to NCS
        ackService.sendAck(msg.mos.roDelete.roID);
        logger(`[RUNDOWN] {${rundownStr}} was deleted from anywhere!` );
        
    }

    async roMetadataReplace(msg){
        const roID = msg.mos.roMetadataReplace.roID;
        const {rundownStr, uid} = await cache.getRundownUidAndStrByRoID(roID);
        
        if(rundownStr !== msg.mos.roMetadataReplace.roSlug){
            const newRundownStr = msg.mos.roMetadataReplace.roSlug;
            await sqlService.modifyRundownStr(uid, newRundownStr);
            await cache.modifyRundownStr(rundownStr, newRundownStr);
            logger(`[RUNDOWN] Rundown name changed to {${newRundownStr}}`);
        }
    }

    getProdByRundownStr(rundownStr) {
        const p = appConfig.rundowns;
        for (const key in p) {
            if (rundownStr.includes(key)) {
                return p[key];
            }
        }
        return p["default"];
    }
    
    async deleteItemsOnUnmonitor(rundownId){
        
        if(appConfig.keepSqlItems) return;
        
        // Get items uid array, that related to rundownId
        const itemsId = await sqlService.getItemsIdArrByRundownId(rundownId);
        // Clear hash for those items
        for(const id of itemsId){
            itemsHash.removeItem(id);
        }
        await sqlService.deleteDbItemsByRundownID(rundownId);
    }

}


const appProcessor = new AppProcessor();

export default appProcessor;