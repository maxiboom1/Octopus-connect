import appConfig from "../utilities/app-config.js";

class AckService {
    constructor() {
        this.mosID = appConfig.mosID; // Store static values
        this.ncsID = appConfig.ncsID;
        this.messageID = 1; // Initialize the message ID counter
    }

    getNextMessageID() {
        return this.messageID++;
    }

    constructAckMessage(roID) {
        return `<mos>
            <mosID>${this.mosID}</mosID>
            <ncsID>${this.ncsID}</ncsID>
            <messageID>${this.getNextMessageID()}</messageID>
            <roAck>
                <roID>${roID}</roID>
            </roAck>
        </mos>`;
    }
}

const ackService = new AckService();
export default ackService;