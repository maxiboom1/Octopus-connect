import net from 'net';
import appConfig from '../utilities/app-config.js';
import parser from '../utilities/mos-parser.js';

class MosConnector {
    constructor() {
        this.client = new net.Socket();
        this.server = null;
        this.serverSocket = null; // Store the single active connection for the listener
    }
    
    async connect() {
        await this.initiateConnection();
        await this.startServer();
    }

    initiateConnection() {
        return new Promise((resolve, reject) => {
            this.client.removeAllListeners();

            this.client.connect({ host: appConfig.octopusIpAddr, port: appConfig.rundownPort }, () => {
                console.log(`MOS client connected to ${appConfig.rundownPort}`);
                resolve(); // Resolve when connected
            });

            this.client.on('data', (data) => {
                console.log('Received response from client');
                parser.parseMos(data, "client");
            });

            this.client.once('close', () => {
                console.log('MOS client disconnected. Trying to reconnect...');
                setTimeout(() => { this.initiateConnection(); }, 5000);
            });

            this.client.once('error', (err) => {
                console.log(`Client Error: ${err.message}`);
                reject(err); // Reject if there's an error
            });
        });
    }

    startServer() {
        return new Promise((resolve, reject) => {
            this.server = net.createServer((socket) => {
                this.serverSocket = socket;
                let messageBuffer = Buffer.alloc(0);
                let timer = null;

                const processBuffer = () => {
                    if (timer) clearTimeout(timer);
                    timer = setTimeout(() => {
                        if (messageBuffer.length > 0) {
                            parser.parseMos(messageBuffer, "listener");
                            messageBuffer = Buffer.alloc(0);
                        }
                    }, 50);
                };

                socket.on('data', (data) => {
                    messageBuffer = Buffer.concat([messageBuffer, data]);
                    processBuffer();
                });

                socket.on('close', () => {
                    console.log('MOS Server closed');
                    this.serverSocket = null;
                });

                socket.on('error', (err) => {
                    console.log(`MOS Server error: ${err.message}`);
                });
            }).listen(appConfig.rundownPort, () => {
                console.log(`Server started on ${appConfig.rundownPort}`);
                resolve(); // Resolve when the server starts
            });

            this.server.on('error', (err) => {
                console.log(`Server Error: ${err.message}`);
                reject(err); // Reject if there's an error starting the server
            });
        });
    }
    
    async sendToListener(payload) {
        try {
            if (this.serverSocket) {
                const buffer = Buffer.from(payload, 'ucs-2').swap16();
                this.serverSocket.write(buffer);
            } else {
                console.error('No active listener connection');
            }
        } catch (error) {
            console.error('Error sending data to listener:', error);
        }
    }

    async sendToClient(payload) {
        try {
            if (this.client.readyState === 'open') {
                const buffer = Buffer.from(payload, 'ucs-2').swap16();
                this.client.write(buffer);
                console.log('Data sent to client');
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
