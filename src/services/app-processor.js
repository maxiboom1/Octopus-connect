import mosConnector from "../1-dal/mos-connector.js";
import mosMediaConnector from "../1-dal/mos-media-connector.js";
import sqlService from "./sql-service.js";
import cache from "../1-dal/cache.js";
import ackService from "./ack-service.js";
import logger from "../utilities/logger.js";
import mosCommands from "../utilities/mos-cmds.js";
import appConfig from "../utilities/app-config.js";
import octopusService from "./octopus-service.js";

// MOS 2.8.5
class AppProcessor {
    
    async initialize() {
        logger(`Starting Octopus-Connect ${appConfig.version}`);
        await sqlService.initialize();
        await mosConnector.connect();
        await mosMediaConnector.connect();
        mosConnector.sendToClient(mosCommands.reqMachInfo());
        mosConnector.sendToClient(mosCommands.roReqAll());// Start point - sends roReqAll and server receives roListAll
    }
    
    async roListAll(msg) {
        if (msg.mos.roListAll === ""){
            logger("NCS doesn't have active rundowns.",true);
            return;
        }
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
            await octopusService.handleNewStory(story);
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

    async roMetadataReplace(msg){
        const roID = msg.mos.roMetadataReplace.roID;
        const {rundownStr, uid} = await cache.getRundownUidAndStrByRoID(roID);
        
        if(rundownStr !== msg.mos.roMetadataReplace.roSlug){
            const newRundownStr = msg.mos.roMetadataReplace.roSlug;
            await sqlService.modifyRundownStr(uid, newRundownStr);
            await cache.modifyRundownStr(rundownStr, newRundownStr);
            logger(`RoMetadaReplace: Rundown name changed to ${newRundownStr}`);
        }

        ackService.sendAck(roID);

    }
    
}


const appProcessor = new AppProcessor();

export default appProcessor;