import appConfig from "./app-config.js";

class MosCommands {
    
    constructor() {
        this.mosID = appConfig.mosID.toString(); // Store mosID once onload
        this.ncsID = appConfig.ncsID.toString(); // Store ncsID once onload
        this.messageID = 2000; // Initialize the message ID counter
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

    mosItemReplace(story, el, newUid){
        const msg =  `
            <mos>
                <mosID>${this.mosID}</mosID>
                <ncsID>${this.ncsID}</ncsID>
                <messageID>${this.messageID}</messageID>
                <mosItemReplace>
                    <roID>${story.roID}</roID>
                    <storyID>${story.storyID}</storyID>
                        <item>
                            <itemID>${el.itemID}</itemID>
                            <itemSlug>${el.itemSlug}</itemSlug>
                            <objID></objID>
                            <objAir>READY</objAir>
                            <mosID>${el.mosID}</mosID>
                            <mosExternalMetadata>
                                <gfxItem>${newUid}</gfxItem>
                                <gfxTemplate>${el.mosExternalMetadata.gfxTemplate}</gfxTemplate>
                                <gfxProduction>${el.mosExternalMetadata.gfxProduction}</gfxProduction>
                                <data>${el.mosExternalMetadata.data}</data>
                                <scripts>${el.mosExternalMetadata.scripts}</scripts>
                                <metadata>${el.mosExternalMetadata.metadata}</metadata>
                                <modified>Controller</modified>
                            </mosExternalMetadata>
                        </item>
                </mosItemReplace>
            </mos>`;  
            
            const result = {
                replaceMosMessage: msg,
                messageID: this.messageID,
                storyID: story.storyID
            };
            
            this.messageID++;
            return result;
    }


}

const mosCommands = new MosCommands();
export default mosCommands;

/*
{
      itemID: '1-39',
      itemSlug: 'מגירה 1 - 123',
      objID: 60889,
      mosID: 'newsarts',
      mosExternalMetadata: [Object]
    }
`
*/