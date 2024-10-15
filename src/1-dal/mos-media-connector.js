import net from 'net';
import appConfig from '../utilities/app-config.js';
import parser from '../utilities/mos-parser.js';
import mosCommands from '../mos-commands/mos-cmds.js';

class MosMediaConnector {
    
    constructor() {
        this.mediaClient = new net.Socket();
        this.mediaServer = null;
        this.mediaServerSocket = null;
        this.mosDelimiter = mosCommands.mosDelimitedUtf8();
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
                console.log(`MOS media client connected to ${appConfig.mediaPort}`);
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
                    parser.parseMos(completeMessage, "media-client");
    
                    // Remove the processed message from the buffer
                    buffer = Uint8Array.prototype.slice.call(buffer, endTagIndex + this.mosDelimiter.length);
                }
            });
    
            this.mediaClient.once('close', () => {
                console.log('MOS media client disconnected. Trying to reconnect...');
                setTimeout(() => { this.startMediaClient(); }, 5000); // Reconnect logic
            });
    
            this.mediaClient.once('error', (err) => {
                console.log(`Media Client Error: ${err.message}`);
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
                        parser.parseMos(completeMessage, "media-listener");
    
                        // Remove the processed message from the buffer
                        buffer = Uint8Array.prototype.slice.call(buffer, endTagIndex + this.mosDelimiter.length);
                    }
                });
    
                socket.on('close', () => {
                    console.log('MOS Media Server closed');
                    this.mediaServerSocket = null;
                });
    
                socket.on('error', (err) => {
                    console.log(`MOS Media Server error: ${err.message}`);
                });
            }).listen(appConfig.mediaPort, () => {
                console.log(`Media Server started on ${appConfig.mediaPort}`);
                resolve(); // Resolve when the server starts
            });
    
            this.mediaServer.on('error', (err) => {
                console.log(`Media Server Error: ${err.message}`);
                reject(err); // Reject if there's an error starting the server
            });
        });
    }
    
    sendToMediaListener(payload) {
        if (this.mediaServerSocket) {
            const buffer = Buffer.from(payload);
            this.mediaServerSocket.write(buffer);
        } else {
            console.error('No active media-listener connection');
        }
    }

    sendToMediaClient(payload) {
        if (this.mediaClient.readyState === 'open') {
            const buffer = Buffer.from(payload);
            this.mediaClient.write(buffer);
            console.log('Data sent to media-client');
        } else {
            console.error('Media-client not connected');
        }
    }
}

const mosMediaConnector = new MosMediaConnector();
export default mosMediaConnector;
