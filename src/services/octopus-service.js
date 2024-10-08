import mosConnector from "../1-dal/mos-connector.js";
import mosMediaConnector from "../1-dal/mos-media-connector.js";
import sqlService from "./sql-service.js";
import ackService from "./ack-service.js";
import logger from "../utilities/logger.js";

class OctopusProcessor {
    
    async initialize() {
        logger('Starting Octopus-connect 1.00...');
        await sqlService.initialize();
        await mosConnector.connect();
        await mosMediaConnector.connect();
        
    }
    
    mosRouter(msg, port) {
        // double !! converts expression to boolean - so, 
        // if msg.mos.heartbeat exists - the !! convert it to "true"
        switch (true) {
            case !!msg.mos.heartbeat:
                //logger(port + " heartbeat");
                this.sendHeartbeat(port);
                break;
            case !!msg.mos.roCreate:
                logger(port+ " roCreate");
                this.sendAck(msg.mos.roCreate.roID);
                break;
            case !!msg.mos.roReadyToAir:
                logger(port+ " readyToAir");
                this.sendAck(msg.mos.roReadyToAir.roID);
                break;
            
            // Story Events
            case !!msg.mos.roStorySend:
                logger(port+ " storySend");
                this.sendAck(msg.mos.roStorySend.roID);
                //logger(JSON.stringify(msg));

                break;
            case !!msg.mos.roStoryMove:
                logger(port+ " storyStoryMove");
                this.sendAck(msg.mos.roStoryMove.roID);
                break; 
            case !!msg.mos.roStoryDelete:
                logger(port+ " roStoryDelete");
                this.sendAck(msg.mos.roStoryDelete.roID);
                break;   
            case !!msg.mos.roStoryInsert:
                logger(port+ " storyStoryInsert");
                logger(JSON.stringify(msg));
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
            default:
                logger('Unknown MOS message: ', msg);
                const roID = findRoID(msg);
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
                const foundRoID = findRoID(obj[key]); // Recursively search in child objects
                if (foundRoID !== undefined) {
                    return foundRoID; 
                }
            }
        }
    
        return undefined;
    }
    
}


const octopusService = new OctopusProcessor();

export default octopusService;