import net from 'net';
import appConfig from '../utilities/app-config.js';
import parser from '../utilities/xml-parser.js';

// MOS TCP client with listeners
class MosConnector {
    constructor() {
        this.client = new net.Socket(); // Client socket
        this.server = null;
        this.serverSocket = null; // Store the single active connection for the listener
        this.initiateConnection();
        this.startServer();
        
        // Those are not really used - its just client and listener to MOS media port 10540, 
        // to respect protocol def, and to get green indicator in Octopus status
        this.mediaClient = new net.Socket(); // 10540 client
        this.mediaServer = null; //10540 listener
        this.startMediaService();
    }

    // Start client connection, handle close and error events
    initiateConnection() {
        this.client.removeAllListeners();

        this.client.connect({ host: appConfig.octopusIpAddr, port: appConfig.rundownPort }, () => {
            console.log(`MOS client connected to ${appConfig.rundownPort}`);
        });

        this.client.once('close', () => {
            console.log('MOS client disconnected. Trying to reconnect...');
            setTimeout(() => { this.initiateConnection(); }, 5000);
        });

        this.client.once('error', (err) => {
            console.log(`Client Error: ${err.message}`);
        });
    }

    // Start listener, handle close, error, and data events, and store connection in socket
    startServer() {
        this.server = net.createServer((socket) => {
            this.serverSocket = socket; // Store the connection socket for sending data later
            socket.on('data', (data) => {parser.parseMos(data, "listener");});
            socket.on('close', () => {
                console.log('MOS Server closed');
                this.serverSocket = null; // Remove the closed socket
            });
            socket.on('error', (err) => {console.log(`MOS Server error: ${err.message}`);});
        }).listen(appConfig.rundownPort, () => {console.log(`Server started on ${appConfig.rundownPort}`);});
    }

    // Method to send data to the listener
    async sendToListener(payload) {
        try {
            if (this.serverSocket) { // Ensure there is an active connection
                const buffer = Buffer.from(payload);
                this.serverSocket.write(buffer); // Send data to the listener
                console.log('Data sent to listener');
            } else {
                console.error('No active listener connection');
            }
        } catch (error) {
            console.error('Error sending data to listener:', error);
        }
    }

    // Method to send data to the client
    async sendToClient(payload) {
        try {
            if (this.client.readyState === 'open') { // Ensure the client is connected
                const buffer = Buffer.from(payload);
                this.client.write(buffer); // Send data to the client
                console.log('Data sent to client');
            } else {
                console.error('Client not connected');
            }
        } catch (error) {
            console.error('Error sending data to client:', error);
        }
    }

    // JIC - to respect mos protocol best practices
    startMediaService(){
        // Start media client
        this.mediaClient.removeAllListeners();
        this.mediaClient.connect({ host: appConfig.octopusIpAddr, port: appConfig.mediaPort }, () => {
            console.log(`MOS media client connected to ${appConfig.mediaPort}`);
        });
        this.mediaClient.once('close', () => {console.log('MOS media client disconnected. Trying to reconnect...');});
        this.mediaClient.once('error', (err) => {console.log(`Media Client Error: ${err.message}`);});
        
        // Start media listener
        this.mediaServer = net.createServer((socket) => {
            socket.on('data', (data) => {parser.parseMos(data, "Media listener");});
            socket.on('close', () => {console.log('MOS Media Server closed');});
            socket.on('error', (err) => {console.log(`MOS Media Server error: ${err.message}`);});
        }).listen(appConfig.mediaPort, () => {console.log(`Media Server started on ${appConfig.mediaPort}`);});
    }
}

const mosConnector = new MosConnector();
export default mosConnector;
