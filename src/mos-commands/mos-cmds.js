import appConfig from "../utilities/app-config.js";

class MosCommands {
    
    constructor() {
        this.mosID = appConfig.mosID.toString(); // Store mosID once onload
        this.ncsID = appConfig.ncsID.toString(); // Store ncsID once onload
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

    roReq (roID){
        return `<mos>
            <mosID>${this.mosID}</mosID>
            <ncsID>${this.ncsID}</ncsID>
            <messageID></messageID>
            <roReq>
                <roID>${roID.toString()}</roID> 
            </roReq>       
        </mos>`;
    }

    mosDelimitedUtf8(){
        const delimiter = Buffer.from([0x3C, 0x2F, 0x6D, 0x6F, 0x73, 0x3E]); // </mos> in UTF-8
        return delimiter;
    }

}

const mosCommands = new MosCommands();
export default mosCommands;