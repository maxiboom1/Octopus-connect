import ackService from "./ack-service.js";
import logger from "../utilities/logger.js";
import octopusService from "./octopus-service.js";
import appConfig from "../utilities/app-config.js";
import appProcessor from "./app-processor.js";
import findRoID from "../utilities/findRoID.js";

const debugMode = appConfig.debugMode;

async function mosRouter(msg, port) {
    // double !! converts expression to boolean - so, 
    // if msg.mos.heartbeat exists - the !! convert it to "true"
    switch (true) {
        case !!msg.mos.listMachInfo:
            logHandler("Octopus is Alive! \nNCS Machine Info: " + JSON.stringify(msg.mos.listMachInfo,null,2));
            break;
        case !!msg.mos.heartbeat:
            ackService.sendHeartbeat(port);
            break;
        case !!msg.mos.roMetadataReplace:
            await appProcessor.roMetadataReplace(msg);
            break;         
              
        case msg.mos.roListAll !== undefined:
            logHandler(port + " received roListAll");
            await appProcessor.roListAll(msg)
            break;
        case !!msg.mos.roList:
            logHandler(port + " received roList");
            await appProcessor.roList(msg)
            break;
        case !!msg.mos.roCreate:
            await appProcessor.roCreate(msg);
            break;
        case !!msg.mos.roReadyToAir:
            logHandler(port+ " readyToAir");
            ackService.sendAck(msg.mos.roReadyToAir.roID);
            break;
        case !!msg.mos.roStorySend:
            logHandler(port+ " storySend: " + JSON.stringify(msg));
            ackService.sendAck(msg.mos.roStorySend.roID);
            break;
        
        case !!msg.mos.roDelete:
            await appProcessor.roDelete(msg);
            break; 

        // ****************** roElementAction complex message with actions ************************
        case !!msg.mos.roElementAction:
            const action = msg.mos.roElementAction["@_operation"];

            if(action === "MOVE"){
                logHandler(`roElementAction ==> MOVE`);
                await octopusService.storyMove(msg);
            } 
            else if(action === "REPLACE"){
                logHandler(`roElementAction ==> REPLACE`);
                await octopusService.storyReplace(msg);
            } 
            else if(action === "INSERT"){
                logHandler(`roElementAction ==> INSERT`);
                await octopusService.insertStory(msg);
            } 
            else if(action === "DELETE"){
                logHandler(`roElementAction ==> DELETE`);
                await octopusService.deleteStory(msg);
            } 
            
            else {
                logHandler(`Unknown roElementAction action: ${msg.mos}`);
                ackService.sendAck(msg.mos.roElementAction.roID);
            }

            ackService.sendAck(msg.mos.roElementAction.roID);
            break;      

        default:
            logHandler(`Unknown MOS message: ${JSON.stringify(msg)}`);
            const roID = findRoID(msg);
            if(roID){ackService.sendAck(roID);}
    }
}

function logHandler(message){
    if(debugMode) logger(`Mos-router service: ` + message);
}
export default mosRouter;