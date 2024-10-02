import mosClient from "../1-dal/mos-listeners.js";
import appConfig from "../utilities/app-config.js";
function mosRouter(msg){
    if(msg.mos.roCreate){
        console.log("roCreate recieved");
        //... Proccess event
        sendAck(msg);
    }

}

function sendAck(msg){
    const ack = constructAckMessage(msg);
    mosClient.sendToUpper(ack);
}

function constructAckMessage(msg){
    const message = `<mos>
        <mosID>${appConfig.mosID}</mosID>
        <ncsID>${appConfig.ncsID}</ncsID>
        <messageID>${msg.mos.messageID}</messageID>
        <roAck>
            <roID>${msg.mos.roCreate.roID}</roID>
        </roAck>
    </mos>`;
    console.log("generated ack:", message);
    return message;
}
export default {mosRouter};