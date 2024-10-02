import net from 'net';
import appConfig from '../utilities/app-config.js';
import parser from '../utilities/xml-parser.js';

// MOS TCP client with listeners
class TcpClient {
    constructor() {
        this.clientUpper = new net.Socket();
        this.serverUpper = null;
        this.onlineUpper = false;
        this.initiateConnection();
        this.startListeners();
    }

    initiateConnection() {
        this.clientUpper.removeAllListeners();

        // Connect to the upper port
        this.clientUpper.connect({ host: appConfig.octopusIpAddr, port: appConfig.rundownPort }, () => {
            this.onlineUpper = true;
            console.log(`Connected to MOS Upper Port ${appConfig.rundownPort}`);
        });

        // Handle upper port connection close
        this.clientUpper.once('close', () => {
            this.onlineUpper = false;
            console.log('MOS Upper Port is offline. Trying to reconnect...');
            setTimeout(() => { this.initiateConnection(); }, 5000);
        });

        // Handle errors on the upper port
        this.clientUpper.once('error', (err) => {
            this.onlineUpper = false;
            console.log(`Upper Port Error: ${err.message}`);
        });
    }

    startListeners() {
        // Start listener on the upper port
        this.serverUpper = net.createServer((socket) => {
            console.log(`Upper Port listener connected: ${socket.remoteAddress}:${socket.remotePort}`);
            socket.on('data', (data) => {parser.parseMos(data,"Upper port");});
            socket.on('close', () => {console.log('Upper Port listener socket closed');});
            socket.on('error', (err) => {console.log(`Upper Port listener error: ${err.message}`);});

        }).listen(appConfig.rundownPort, () => {
            console.log(`Listening on Upper Port ${appConfig.rundownPort}`);
        });
    }

    async sendToUpper(payload) {
        if (this.onlineUpper) {
            try {
                
                // Convert the JSON string to a buffer (using UTF-16LE)
                const buffer = Buffer.from(payload); 
    
                // Send the buffer directly
                this.clientUpper.write(buffer);
            } catch (error) {
                console.error('Error sending data to upper client:', error);
            }
        } else {
            console.log('Upper client is not online');
        }
    }

    get isOnlineUpper() { return this.onlineUpper; }
    get remoteHostUpper() { return this.clientUpper.remoteAddress; }
}

const mosClient = new TcpClient();
export default mosClient;

