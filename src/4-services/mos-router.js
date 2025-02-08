import ackService from "./ack-service.js";
import logger from "../3-utilities/logger.js";
import octopusService from "./octopus-service.js";
import appProcessor from "./app-processor.js";
import findRoID from "../3-utilities/findRoID.js";
import appConfig from "../3-utilities/app-config.js";
import EventEmitter from 'events';

const logMosIncomingMessages = appConfig.debug.showMos;

class MosRouter extends EventEmitter {
    
    async mosMessageProcessor(msg, port) {
    
        if(logMosIncomingMessages){
            logger(`[MOS-DEBUG] {${port}} ${this.color(JSON.stringify(msg),"dimmed")}`); 
        }
        // double !! converts expression to boolean - so, 
        // if msg.mos.heartbeat exists - the !! convert it to "true"
        switch (true) {
            case !!msg.mos.listMachInfo:
                //logger("Octopus is Alive! \nNCS Machine Info: " + JSON.stringify(msg.mos.listMachInfo,null,2));
                break;
            case !!msg.mos.heartbeat:
                ackService.sendHeartbeat(port);
                break;
            case !!msg.mos.roMetadataReplace:
                await appProcessor.roMetadataReplace(msg);
                ackService.sendAck(msg.mos.roMetadataReplace.roID);
                break;         
                  
            case msg.mos.roListAll !== undefined:
                logger(`[MOS] {${this.color("roListAll")}} are received from ${port}`);
                await appProcessor.roListAll(msg)
                break;
            case !!msg.mos.roList:
                logger(`[MOS] {${this.color("roList")}} are received from ${port}`);
                await appProcessor.roList(msg)
                break;
            case !!msg.mos.roCreate:
                logger(`[MOS] {${this.color("roCreate")}} are received from ${port}`);
                await appProcessor.roCreate(msg);
                break;
            case !!msg.mos.roReadyToAir:
                logger(`[MOS] {${this.color("roReadyToAir")}} are received from ${port}`);
                ackService.sendAck(msg.mos.roReadyToAir.roID);
                break;
            case !!msg.mos.roStorySend:
                logger(`[MOS] {${this.color("roStorySend")}} are received from ${port}`);
                ackService.sendAck(msg.mos.roStorySend.roID);
                break;
            case !!msg.mos.roDelete:
                logger(`[MOS] {${this.color("roDelete")}} are received from ${port}`);
                await appProcessor.roDelete(msg);
                break; 
    
            // ****************** roAck handling ************************
            case !!msg.mos.roAck:
                //logger(`[MOS] {${this.color("roAck")}} are received from ${port}`);
                this.emit('roAckMessage', msg);// Emit the message, 
                break; 
            
            // ****************** roElementAction complex message with actions ************************
            case !!msg.mos.roElementAction:
                const action = msg.mos.roElementAction["@_operation"];
    
                if(action === "MOVE"){
                    logger(`[MOS] {${this.color("roElementAction@MOVE")}} are received from ${port}`);
                    await octopusService.storyMove(msg);
                } 
                else if(action === "REPLACE"){
                    logger(`[MOS] {${this.color("roElementAction@REPLACE")}} are received from ${port}`); 
                    await octopusService.storyReplace(msg);
                } 
                else if(action === "INSERT"){
                    logger(`[MOS] {${this.color("roElementAction@INSERT")}} are received from ${port}`);
                    await octopusService.insertStory(msg);
                } 
                else if(action === "DELETE"){
                    logger(`[MOS] {${this.color("roElementAction@DELETE")}} are received from ${port}`);
                    await octopusService.deleteStory(msg);
                } 
                
                else {
                    logger(`[MOS] {${this.color("roElementAction@[!UNKNOWN!]")}} are received from ${port}`,"red");
                    ackService.sendAck(msg.mos.roElementAction.roID);
                }
    
                break;      
            
            default:
                logger(`[MOS] Unknown MOS message: ${JSON.stringify(msg)}`,"red");
                const roID = findRoID(msg);
                if(roID){
                    ackService.sendAck(roID);
                }
        }
        
    
    }

    color(msg, color = "yellow") { // Used to set color to MOS events in console
    
        const c = {
            yellow: "\x1b[33m",
            green: "\x1b[32m",
            dimmed: "\x1b[38;5;244m",
            reset: "\x1b[0m"
        }
        
        if(c[color] === undefined) color = "yellow";
    
        return c[color] + msg + c.reset;
    
    };

}


const mosRouter = new MosRouter();
export default mosRouter;