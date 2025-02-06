import net from 'net';
import appConfig from '../3-utilities/app-config.js';
import parser from '../3-utilities/mos-parser.js';
import mosCommands from '../3-utilities/mos-cmds.js';
import logger from '../3-utilities/logger.js';

class MosConnector {
    
    constructor() {
        this.client = new net.Socket();
        this.server = null;
        this.serverSocket = null; // Store the single active connection for the listener
        this.mosDelimiter = mosCommands.mosDelimitedUtf8();
        this.port = appConfig.rundownPort
    }

    async connect() {
        await this.startClient();
        await this.startServer();
    }
    
    async startClient() {
        return new Promise((resolve, reject) => {
            this.client.removeAllListeners();
            let buffer = Buffer.alloc(0); // Initialize an empty buffer for client data
    
            this.client.connect({ host: appConfig.octopusIpAddr, port: appConfig.rundownPort }, () => {
                logger(`[TCP] MOS client connected to ${appConfig.ncsID} at ${appConfig.octopusIpAddr}:${appConfig.rundownPort}`);
                resolve(); // Resolve when connected
            });
    
            this.client.on('data', (data) => {
                // Append incoming data to the buffer
                buffer = Buffer.concat([buffer, data]);
                let endTagIndex;
    
                // Search for the `</mos>` delimiter in the buffer
                while ((endTagIndex = buffer.indexOf(this.mosDelimiter)) !== -1) {
                    // Extract the complete message up to the end of `</mos>`
                    const completeMessage = Uint8Array.prototype.slice.call(buffer, 0, endTagIndex + this.mosDelimiter.length);
    
                    // Parse the complete message
                    parser.parseMos(completeMessage, `client ${this.port}`);
    
                    // Remove the processed message from the buffer
                    buffer = Uint8Array.prototype.slice.call(buffer, endTagIndex + this.mosDelimiter.length);
                }
            });
    
            this.client.once('close', () => {
                logger('[TCP] MOS client disconnected. Trying to reconnect...',"red");
                this.client.destroy(); // Ensure socket is fully closed
                setTimeout(() => { this.startClient(); }, 5000); // Reconnect logic
            });
    
            this.client.once('error', (err) => {
                logger(`[TCP] Client Error: ${err.message}`, "red");
                if (err.code === 'ETIMEDOUT' || err.code === 'ECONNREFUSED') {
                    logger('[TCP] Reconnecting due to network issue...');
                    this.client.destroy(); // Explicitly close the socket on error
                    setTimeout(() => { this.startClient(); }, 5000); // Attempt to reconnect after timeout
                } else {
                    reject(err); // Reject only if it's not a timeout or connection refused
                }
            });
        });
    }
    
    async startServer() {
        return new Promise((resolve, reject) => {
            this.server = net.createServer((socket) => {
                this.serverSocket = socket;
                let buffer = Buffer.alloc(0);
                
                socket.on('data', (data) => {
                    buffer = Buffer.concat([buffer, data]); // Append incoming data to the buffer
                    let endTagIndex;
                    
                    // Search for the `</mos>` delimiter in the buffer
                    while ((endTagIndex = buffer.indexOf(this.mosDelimiter)) !== -1) {
                        const completeMessage = Uint8Array.prototype.slice.call(buffer, 0, endTagIndex + this.mosDelimiter.length);
                        parser.parseMos(completeMessage, `listener ${this.port}`);
                        buffer = Uint8Array.prototype.slice.call(buffer, endTagIndex + this.mosDelimiter.length);
                    }

                });

                socket.on('close', () => {
                    //logger('[TCP] MOS Server closed', "red");
                    this.serverSocket = null;
                });

                socket.on('error', (err) => {
                    logger(`[TCP] MOS Server error: ${err.message}`,"red");
                });
            }).listen(appConfig.rundownPort, () => {
                //logger(`[TCP] Server started on ${appConfig.rundownPort}`);
                resolve(); // Resolve when the server starts
            });

            this.server.on('error', (err) => {
                logger(`[TCP] Server Error: ${err.message}`,"red");
                reject(err); // Reject if there's an error starting the server
            });
        });
    }

    sendToListener(payload) {
        try {
            if (this.serverSocket) {
                const buffer = Buffer.from(payload);
                this.serverSocket.write(buffer);
            } else {
                //console.error('No active listener connection');
            }
        } catch (error) {
            console.error('Error sending data to listener:', error);
        }
    }

    sendToClient(payload) {
        try {
            if (this.client.readyState === 'open') {
                const buffer = Buffer.from(payload);
                this.client.write(buffer);
            } else {
                console.error('Client not connected');
            }
        } catch (error) {
            console.error('Error sending data to client:', error);
        }
    }
}

const mosConnector = new MosConnector();
export default mosConnector;
