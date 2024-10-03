import mosConnector from "../1-dal/mos-connector.js";
import appConfig from "../utilities/app-config.js";
import ackService from "./ack-service.js";

function mosRouter(msg, port){
    console.log(port,msg);
}

function sendAck(msg){
    const ack = ackService.constructAckMessage(msg.mos.roCreate.roID);
    console.log(ack);
    //mosConnector.sendToListener(ack);
    //mosConnector.sendToClient(ack);
}


export default {mosRouter};