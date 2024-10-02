import net from 'net';
import appConfig from '../4-utils/app-config';

// MOS TCP client
class TcpClient {
    constructor() {
        this.clientLower = new net.Socket();
        this.clientUpper = new net.Socket();
        this.onlineLower = false;
        this.onlineUpper = false;
        this.initiateConnection();
    }

    initiateConnection() {
        this.clientLower.removeAllListeners(); // Remove old listeners to prevent memory leaks
        this.clientUpper.removeAllListeners(); // Remove old listeners to prevent memory leaks

        // Connect to the lower port
        this.clientLower.connect({ host: appConfig.octopusIpAddr, port: appConfig.mediaPort }, () => {
            this.onlineLower = true;
            console.log(`Connected to MOS Lower Port ${appConfig.mediaPort}`);
        });

        // Connect to the upper port
        this.clientUpper.connect({ host: appConfig.octopusIpAddr, port: appConfig.rundownPort }, () => {
            this.onlineUpper = true;
            console.log(`Connected to MOS Upper Port ${appConfig.rundownPort}`);
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

    reconnect() {
        if (this.clientLower) {
            this.clientLower.end(() => {
                console.log('Lower Port connection gracefully closed.');
            });
            this.clientLower.destroy(); // Ensures that the socket is fully closed
            this.onlineLower = false;
        }
        
        if (this.clientUpper) {
            this.clientUpper.end(() => {
                console.log('Upper Port connection gracefully closed.');
            });
            this.clientUpper.destroy(); // Ensures that the socket is fully closed
            this.onlineUpper = false;
        }

        console.log("Reconnecting...");
        this.initiateConnection();
    }

    async sendAndReceiveLower(dataToSend) {
        if (this.onlineLower) {
            return new Promise((resolve, reject) => {
                if (!this.clientLower.writable) {
                    reject('Lower client is not writable');
                    return;
                }

                this.clientLower.write(dataToSend);

                this.clientLower.once('data', (data) => {
                    resolve(data.toString());
                });
            });
        } else {
            return null;
        }
    }

    async sendAndReceiveUpper(dataToSend) {
        if (this.onlineUpper) {
            return new Promise((resolve, reject) => {
                if (!this.clientUpper.writable) {
                    reject('Upper client is not writable');
                    return;
                }

                this.clientUpper.write(dataToSend);

                this.clientUpper.once('data', (data) => {
                    resolve(data.toString());
                });
            });
        } else {
            return null;
        }
    }

    get isOnlineLower() { return this.onlineLower; }
    get isOnlineUpper() { return this.onlineUpper; }
    get remoteHostLower() { return this.clientLower.remoteAddress; }
    get remoteHostUpper() { return this.clientUpper.remoteAddress; }
}

const mosClient = new TcpClient();
export default mosClient;
