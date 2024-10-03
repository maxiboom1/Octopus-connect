import mosConnector from "../1-dal/mos-connector.js";
import appConfig from "../utilities/app-config.js";

function mosRouter(msg, port){
    console.log(port,msg);
    if(msg.mos.heartbeat){
        sendHeartbeat();
        
    }

}

function sendAck(msg){
    const ack = constructAckMessage(msg);
    mosConnector.sendToListener(ack);
    mosConnector.sendToClient(ack);
}

function constructAckMessage(msg){
    const message = `<mos>
        <mosID>${appConfig.mosID}</mosID>
        <ncsID>${appConfig.ncsID}</ncsID>
        <messageID>1</messageID>
        <roAck>
            <roID>${msg.mos.roCreate.roID}</roID>
        </roAck>
    </mos>`;
    console.log("generated ack:", message);
    return message;
}
export default {mosRouter};