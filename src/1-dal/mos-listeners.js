import net from 'net';
import appConfig from '../utilities/app-config.js';

// MOS TCP client with listeners
class TcpClient {
    constructor() {
        this.clientLower = new net.Socket();
        this.clientUpper = new net.Socket();
        this.serverLower = null;
        this.serverUpper = null;
        this.onlineLower = false;
        this.onlineUpper = false;
        this.initiateConnection();
        this.startListeners();
    }

    initiateConnection() {
        this.clientLower.removeAllListeners();
        this.clientUpper.removeAllListeners();

        // Connect to the lower port
        this.clientLower.connect({ host: appConfig.controlDeviceHost, port: appConfig.lowerPort }, () => {
            this.onlineLower = true;
            console.log(`Connected to MOS Lower Port ${appConfig.lowerPort}`);
        });

        // Connect to the upper port
        this.clientUpper.connect({ host: appConfig.controlDeviceHost, port: appConfig.upperPort }, () => {
            this.onlineUpper = true;
            console.log(`Connected to MOS Upper Port ${appConfig.upperPort}`);
        });

        // Handle lower port connection close
        this.clientLower.once('close', () => {
            this.onlineLower = false;
            console.log('MOS Lower Port is offline. Trying to reconnect...');
            setTimeout(() => { this.initiateConnection(); }, 5000);
        });

        // Handle upper port connection close
        this.clientUpper.once('close', () => {
            this.onlineUpper = false;
            console.log('MOS Upper Port is offline. Trying to reconnect...');
            setTimeout(() => { this.initiateConnection(); }, 5000);
        });

        // Handle errors on the lower port
        this.clientLower.once('error', (err) => {
            this.onlineLower = false;
            console.log(`Lower Port Error: ${err.message}`);
        });

        // Handle errors on the upper port
        this.clientUpper.once('error', (err) => {
            this.onlineUpper = false;
            console.log(`Upper Port Error: ${err.message}`);
        });
    }

    startListeners() {
        // Start listener on the lower port
        this.serverLower = net.createServer((socket) => {
            console.log(`Lower Port listener connected: ${socket.remoteAddress}:${socket.remotePort}`);

            socket.on('data', (data) => {
                console.log(`Received data on Lower Port: ${data.toString()}`);
                // Send ACK or process data here
            });

            socket.on('close', () => {
                console.log('Lower Port listener socket closed');
            });

            socket.on('error', (err) => {
                console.log(`Lower Port listener error: ${err.message}`);
            });

        }).listen(appConfig.lowerPort, () => {
            console.log(`Listening on Lower Port ${appConfig.lowerPort}`);
        });

        // Start listener on the upper port
        this.serverUpper = net.createServer((socket) => {
            console.log(`Upper Port listener connected: ${socket.remoteAddress}:${socket.remotePort}`);

            socket.on('data', (data) => {
                console.log(`Received data on Upper Port: ${data.toString()}`);
                // Send ACK or process data here
            });

            socket.on('close', () => {
                console.log('Upper Port listener socket closed');
            });

            socket.on('error', (err) => {
                console.log(`Upper Port listener error: ${err.message}`);
            });

        }).listen(appConfig.upperPort, () => {
            console.log(`Listening on Upper Port ${appConfig.upperPort}`);
        });
    }

    reconnect() {
        // Same as before
        // ...
    }

    async sendAndReceiveLower(dataToSend) {
        // Same as before
        // ...
    }

    async sendAndReceiveUpper(dataToSend) {
        // Same as before
        // ...
    }

    get isOnlineLower() { return this.onlineLower; }
    get isOnlineUpper() { return this.onlineUpper; }
    get remoteHostLower() { return this.clientLower.remoteAddress; }
    get remoteHostUpper() { return this.clientUpper.remoteAddress; }
}

const mosClient = new TcpClient();
export default mosClient;

