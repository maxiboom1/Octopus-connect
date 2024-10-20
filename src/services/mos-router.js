import ackService from "./ack-service.js";
import logger from "../utilities/logger.js";
import octopusService from "./octopus-service.js";
import mosCommands from "../utilities/mos-cmds.js";

function mosRouter(msg, port) {
    // double !! converts expression to boolean - so, 
    // if msg.mos.heartbeat exists - the !! convert it to "true"
    switch (true) {
        
        case !!msg.mos.heartbeat:
            ackService.sendHeartbeat(port);
            break;
        case !!msg.mos.roMetadataReplace:
            octopusService.roMetadataReplace(msg);
            break;         
              
        case !!msg.mos.roListAll:
            logger(port + " received roListAll");
            octopusService.roListAll(msg)
            break;
        case !!msg.mos.roList:
            logger(port + " received roList");
            octopusService.roList(msg)
            break;
        case !!msg.mos.roCreate:
            octopusService.roCreate(msg);
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
            octopusService.roDelete(msg);
            break; 

        // ****************** roElementAction complex message with actions ************************
        case !!msg.mos.roElementAction:
            const action = msg.mos.roElementAction["@_operation"];

            if(action === "MOVE"){
                octopusService.storyMove(msg);
            } 
            else if(action === "REPLACE"){
                octopusService.storyReplace(msg);
            } 
            else if(action === "INSERT"){
                octopusService.insertStory(msg);
            } 
            else if(action === "DELETE"){
                octopusService.deleteStory(msg);
            } 
            
            else {
                console.log("Unknown roElementAction action: " ,true);
                ackService.sendAck(msg.mos.roElementAction.roID);
            }

            ackService.sendAck(msg.mos.roElementAction.roID);
            break;      
        
        case JSON.stringify(msg) === mosCommands.emptyNCS():
            logger("NCS doesn't have active rundowns.",true);
            break;

        default:
            logger('Unknown MOS message: ', true);
            console.log(JSON.stringify(msg));
            const roID = octopusService.findRoID(msg);
            if(roID){ackService.sendAck(roID);}
    }
}

export default mosRouter;