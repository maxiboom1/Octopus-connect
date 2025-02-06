import net from 'net';
import appConfig from '../3-utilities/app-config.js';
import parser from '../3-utilities/mos-parser.js';
import mosCommands from '../3-utilities/mos-cmds.js';
import logger from '../3-utilities/logger.js';

class MosMediaConnector {
    
    constructor() {
        this.mediaClient = new net.Socket();
        this.mediaServer = null;
        this.mediaServerSocket = null;
        this.mosDelimiter = mosCommands.mosDelimitedUtf8();
        this.port = appConfig.mediaPort;
    }

    async connect() {
        await this.startMediaClient();
        await this.startMediaServer(); // Ensure that the server starts before proceeding
    }

    async startMediaClient() {
        return new Promise((resolve, reject) => {
            this.mediaClient.removeAllListeners();
            let buffer = Buffer.alloc(0); // Initialize an empty buffer for media client data
    
            this.mediaClient.connect({ host: appConfig.octopusIpAddr, port: appConfig.mediaPort }, () => {
                logger(`[TCP] MOS media client connected to ${appConfig.ncsID} at ${appConfig.octopusIpAddr}:${appConfig.mediaPort}`);
                resolve(); // Resolve when connected
            });
    
            this.mediaClient.on('data', (data) => {
                // Append incoming data to the buffer
                buffer = Buffer.concat([buffer, data]);
                let endTagIndex;
    
                // Search for the `</mos>` delimiter in the buffer
                while ((endTagIndex = buffer.indexOf(this.mosDelimiter)) !== -1) {
                    // Extract the complete message up to the end of `</mos>`
                    const completeMessage = Uint8Array.prototype.slice.call(buffer, 0, endTagIndex + this.mosDelimiter.length);
    
                    // Parse the complete message
                    parser.parseMos(completeMessage, `media-client ${this.port}`);
    
                    // Remove the processed message from the buffer
                    buffer = Uint8Array.prototype.slice.call(buffer, endTagIndex + this.mosDelimiter.length);
                }
            });
    
            this.mediaClient.once('close', () => {
                logger('[TCP_MEDIA] MOS media client disconnected. Trying to reconnect...',"red");
                setTimeout(() => { this.startMediaClient(); }, 5000); // Reconnect logic
            });
    
            this.mediaClient.once('error', (err) => {
                logger(`[TCP_MEDIA] Media Client Error: ${err.message}`,"red");
                if (err.code === 'ETIMEDOUT' || err.code === 'ECONNREFUSED') {
                    logger('[TCP_MEDIA] Reconnecting due to network issue...',"red");
                    setTimeout(() => { this.startClient(); }, 5000); // Attempt to reconnect after timeout
                }
                reject(err); // Reject if there's an error
            });
        });
    }
    
    async startMediaServer() {
        return new Promise((resolve, reject) => {
            this.mediaServer = net.createServer((socket) => {
                this.mediaServerSocket = socket;
                let buffer = Buffer.alloc(0); // Initialize an empty buffer for media server data
    
                socket.on('data', (data) => {
                    // Append incoming data to the buffer
                    buffer = Buffer.concat([buffer, data]);
                    let endTagIndex;
    
                    // Search for the `</mos>` delimiter in the buffer
                    while ((endTagIndex = buffer.indexOf(this.mosDelimiter)) !== -1) {
                        // Extract the complete message up to the end of `</mos>`
                        const completeMessage = Uint8Array.prototype.slice.call(buffer, 0, endTagIndex + this.mosDelimiter.length);
    
                        // Parse the complete message
                        parser.parseMos(completeMessage, `media-listener ${this.port}`);
    
                        // Remove the processed message from the buffer
                        buffer = Uint8Array.prototype.slice.call(buffer, endTagIndex + this.mosDelimiter.length);
                    }
                });
    
                socket.on('close', () => {
                    logger('[TCP_MEDIA] MOS Media Server closed',"red");
                    this.mediaServerSocket = null;
                });
    
                socket.on('error', (err) => {
                    logger(`[TCP_MEDIA] MOS Media Server error: ${err.message}`,"red");
                });
            }).listen(appConfig.mediaPort, () => {
                //logger(`[TCP_MEDIA] Media Server started on ${appConfig.mediaPort}`);
                resolve(); // Resolve when the server starts
            });
    
            this.mediaServer.on('error', (err) => {
                logger(`[TCP_MEDIA] Media Server Error: ${err.message}`,"red");
                reject(err); // Reject if there's an error starting the server
            });
        });
    }
    
    sendToMediaListener(payload) {
        if (this.mediaServerSocket) {
            const buffer = Buffer.from(payload);
            this.mediaServerSocket.write(buffer);
        } else {
            logger('[TCP_MEDIA] No active media-listener connection',"red");
        }
    }

    sendToMediaClient(payload) {
        if (this.mediaClient.readyState === 'open') {
            const buffer = Buffer.from(payload);
            this.mediaClient.write(buffer);
            logger('[TCP_MEDIA] Data sent to media-client');
        } else {
            logger('[TCP_MEDIA] Media-client not connected',"red");
        }
    }
}

const mosMediaConnector = new MosMediaConnector();
export default mosMediaConnector;
