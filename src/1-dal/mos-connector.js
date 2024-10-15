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
        await this.startClient();
        await this.startServer();
    }
    
    async startClient() {
        
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

    async startServer() {
        return new Promise((resolve, reject) => {
            this.server = net.createServer((socket) => {
                this.serverSocket = socket;

                socket.on('data', (data) => {
                    parser.parseMos(data, "listener");
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

    sendToListener(payload) {
        try {
            if (this.serverSocket) {
                const buffer = Buffer.from(payload);
                this.serverSocket.write(buffer);
            } else {
                console.error('No active listener connection');
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
