import appConfig from "../utilities/app-config.js";

class MosCommands {
    
    constructor() {
        this.mosID = appConfig.mosID; // Store mosID once onload
        this.ncsID = appConfig.ncsID; // Store ncsID once onload
    }

    reqMachInfo() {
        return `<mos>
            <mosID>${this.mosID}</mosID>
            <ncsID>${this.ncsID}</ncsID>
            <messageID></messageID>
            </reqMachineInfo>
        </mos>`;
    }

    roReqAll() {
        return `<mos>
            <mosID>${this.mosID}</mosID>
            <ncsID>${this.ncsID}</ncsID>
            <messageID></messageID>
            <roReqAll/>   
            </mos>`;
    }   


}

const mosCommands = new MosCommands();
export default mosCommands;