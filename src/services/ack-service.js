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

    constructRoAckMessage(roID) {
        return `<mos><mosID>${this.mosID}</mosID><ncsID>${this.ncsID}</ncsID><messageID>${this.getNextMessageID()}</messageID><roAck><roID>${roID}</roID></roAck></mos>`;
    }

    constructHeartbeatMessage(){
        return `<mos>
            <mosID>${this.mosID}</mosID>
            <ncsID>${this.ncsID}</ncsID>
            <heartbeat>
                <time>${this.formatDateWithMillisAndTimezone()}</time>
            </heartbeat>
        </mos>`;
    }
    // Fucntion that creates timestamp in this format: 2024-10-04T11:03:25,972+03:00
    formatDateWithMillisAndTimezone() {
        const date = new Date();
    
        // Format date in ISO format (YYYY-MM-DDTHH:mm:ss)
        const isoDate = date.toISOString().slice(0, -1); // Remove the trailing 'Z' from ISO string
    
        // Extract the milliseconds
        const milliseconds = String(date.getMilliseconds()).padStart(3, '0');
    
        // Get the timezone offset in minutes and format it (+HH:mm or -HH:mm)
        const timezoneOffset = -date.getTimezoneOffset();
        const offsetHours = String(Math.floor(Math.abs(timezoneOffset) / 60)).padStart(2, '0');
        const offsetMinutes = String(Math.abs(timezoneOffset) % 60).padStart(2, '0');
        const offsetSign = timezoneOffset >= 0 ? '+' : '-';
    
        const formattedOffset = `${offsetSign}${offsetHours}:${offsetMinutes}`;
    
        // Combine the parts to get the desired format
        const formattedDate = `${isoDate.replace(/\.\d+/, '')},${milliseconds}${formattedOffset}`;
    
        return formattedDate;
    }
}

const ackService = new AckService();
export default ackService;