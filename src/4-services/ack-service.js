import appConfig from "../3-utilities/app-config.js";
import mosConnector from "../1-dal/mos-connector.js";
import mosMediaConnector from "../1-dal/mos-media-connector.js";
import timeConvertors from "../3-utilities/time-convertors.js";

class AckService {
    
    constructor() {
        this.mosID = appConfig.mosID; // Store static values
        this.ncsID = appConfig.ncsID;
        this.messageID = 1; // Initialize the message ID counter
    }

    getNextMessageID() {
        return this.messageID++;
    }

    sendAck(roID){
        const ack = `<mos>
            <mosID>${this.mosID}</mosID>
            <ncsID>${this.ncsID}</ncsID>
            <messageID>${this.getNextMessageID()}</messageID>
            <roAck>
                <roID>${roID}</roID>
            </roAck>
        </mos>`
        mosConnector.sendToListener(ack);
    }

    sendHeartbeat(port){
        const heartbeat = `<mos>
        <mosID>${this.mosID}</mosID>
        <ncsID>${this.ncsID}</ncsID>
        <heartbeat>
            <time>${timeConvertors.createTick()}</time>
        </heartbeat>
        </mos>`
        
        if(port === "listener"){
            mosConnector.sendToListener(heartbeat);
        }
        if(port === "media-listener"){
            mosMediaConnector.sendToMediaListener(heartbeat);
        }
    }
}

const ackService = new AckService();
export default ackService;