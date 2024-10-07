import mosConnector from "../1-dal/mos-connector.js";
import ackService from "./ack-service.js";

function mosRouter(msg, port) {
    // double !! converts expression to boolean - so, 
    // if msg.mos.heartbeat exists - the !! convert it to "true"
    switch (true) {
        case !!msg.mos.heartbeat:
            console.log(port, "heartbeat");
            sendHeatbeat(port);
            break;
        case !!msg.mos.roCreate:
            console.log(port, "roCreate");
            sendAck(msg.mos.roCreate.roID);
            break;
        case !!msg.mos.roReadyToAir:
            console.log(port, "readyToAir");
            sendAck(msg.mos.roReadyToAir.roID);
            break;
        
        // Story Events
        case !!msg.mos.roStorySend:
            console.log(port, "storySend");
            sendAck(msg.mos.roStorySend.roID);
            break;
        case !!msg.mos.roStoryMove:
            console.log(port, "storyStoryMove");
            sendAck(msg.mos.roStoryMove.roID);
            break; 
        case !!msg.mos.roStoryDelete:
            console.log(port, "roStoryDelete");
            sendAck(msg.mos.roStoryDelete.roID);
            break;   
        case !!msg.mos.roStoryInsert:
            console.log(port, "storyStoryInsert");
            sendAck(msg.mos.roStoryInsert.roID);
            break;  

        case !!msg.mos.roStoryReplace:
            console.log(port, "roStoryReplace");
            sendAck(msg.mos.roStoryReplace.roID);
            break;   
        case !!msg.mos.roStoryAppend:
            console.log(port, "roStoryAppend");
            sendAck(msg.mos.roStoryAppend.roID);
            break;  


        case !!msg.mos.roDelete:
            console.log(port, "RoDelete");
            sendAck(msg.mos.roDelete.roID);
            break;      
        default:
            console.log('Unknown MOS message: ', msg);
            const roID = findRoID(msg);
            if(roID){sendAck(roID);}
    }
}

function sendAck(roID){
    const ack = ackService.constructRoAckMessage(roID);
    mosConnector.sendToListener(ack);
}

function sendHeatbeat(port){
    if(port === "listener"){
        mosConnector.sendToListener(ackService.constructHeartbeatMessage());
    }
    if(port === "media-listener"){
        mosConnector.sendToMediaListener(ackService.constructHeartbeatMessage());
    }
}

// If we recieve some unknown MOS object - we will try to find its roID and return acknoledge, to avoid message stuck and reconnection.
function findRoID(obj) {
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

export default {mosRouter};