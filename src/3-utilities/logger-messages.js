import logger from "./logger.js";
import appConfig from "./app-config.js";
import getServerIP from "./host-ip.js";

class Messages {

    appLoadedMessage(){
        //mosConnector.sendToClient(mosCommands.reqMachInfo());
        const host = getServerIP();
        console.clear();
        logger(`**********************************************************************`,"blue");
        logger(`[SYSTEM] Octopus-Connect, App Version: ${appConfig.version}, now starting...`,"green");
        logger(`[SYSTEM] Plugin url: http://${host}:${appConfig.pluginPort}/index.html`,"green")
        logger(`**********************************************************************`,"blue");
    }

}

const logMessages = new Messages();

export default logMessages;