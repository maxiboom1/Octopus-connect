import appConfig from "./app-config.js";

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
            <reqMachInfo/>
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

    storyReady(roID,storyId){
        return `
            <mos>
                <mosID>${this.mosID}</mosID>
                <ncsID>${this.ncsID}</ncsID>
                <messageID>1</messageID>
                <roCtrl>
                    <roID>${roID}</roID>
                    <storyID>${storyId}</storyID>
                    <itemID></itemID>
                    <command>READY</command>
                </roCtrl>
            </mos>`
    }

}

const mosCommands = new MosCommands();
export default mosCommands;