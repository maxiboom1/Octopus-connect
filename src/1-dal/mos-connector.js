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
        this.mediaServerSocket = null;
        this.startMediaService();
    }

    // Start client connection, handle close and error events
    initiateConnection() {
        this.client.removeAllListeners();

        this.client.connect({ host: appConfig.octopusIpAddr, port: appConfig.rundownPort }, () => {
            console.log(`MOS client connected to ${appConfig.rundownPort}`);
            //this.sendToClient(`<mos><mosID>${appConfig.mosID}</mosID><ncsID>${appConfig.ncsID}</ncsID><messageID></messageID><roReqAll/></mos>`);
        });
        // Listen for data from the client
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
        });
    }

    startServer() {
        this.server = net.createServer((socket) => {
            this.serverSocket = socket; // Store the connection socket for sending data later
    
            let messageBuffer = Buffer.alloc(0); // Buffer to accumulate chunks
            let timer = null; // Timer for delayed processing
    
            const processBuffer = () => {
                if (timer) clearTimeout(timer); // Clear any existing timer
                timer = setTimeout(() => {
                    if (messageBuffer.length > 0) {
                        // Directly pass the buffer to the parser without converting to string
                        parser.parseMos(messageBuffer, "listener");
                        
                        // Reset buffer after processing
                        messageBuffer = Buffer.alloc(0);
                    }
                }, 50); // Delay processing by 50 ms
            };
    
            socket.on('data', (data) => {
                // Append the current data chunk to the message buffer
                messageBuffer = Buffer.concat([messageBuffer, data]);
    
                // Call the delayed buffer processing function
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
        });
    }
    
    // Method to send data to the listener
    async sendToListener(payload) {
        try {
            if (this.serverSocket) { // Ensure there is an active connection
                const buffer = Buffer.from(payload,'ucs-2').swap16();
                this.serverSocket.write(buffer); // Send data to the listener
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
                const buffer = Buffer.from(payload,'ucs-2').swap16();
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
            this.mediaServerSocket = socket;
            socket.on('data', (data) => {parser.parseMos(data, "media-listener");});
            socket.on('close', () => {
                console.log('MOS Media Server closed');
                this.mediaServerSocket = null;
            });
            socket.on('error', (err) => {console.log(`MOS Media Server error: ${err.message}`);});
        }).listen(appConfig.mediaPort, () => {console.log(`Media Server started on ${appConfig.mediaPort}`);});
    }

    // Method to send data to the listener
    async sendToMediaListener(payload) {
        try {
            if (this.mediaServerSocket) { // Ensure there is an active connection
                const buffer = Buffer.from(payload,'ucs-2').swap16();
                this.mediaServerSocket.write(buffer); // Send data to the listener
                //console.log('Data sent to media-listener');
            } else {
                console.error('No active media-listener connection');
            }
        } catch (error) {
            console.error('Error sending data to listener:', error);
        }
    }
}

const mosConnector = new MosConnector();
export default mosConnector;
