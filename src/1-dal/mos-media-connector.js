import net from 'net';
import appConfig from '../utilities/app-config.js';
import parser from '../utilities/mos-parser.js';

class MosMediaConnector {
    constructor() {
        this.mediaClient = new net.Socket();
        this.mediaServer = null;
        this.mediaServerSocket = null;
    }

    async connect() {
        await this.startMediaClient();
        await this.startMediaServer();
    }

    startMediaClient() {
        return new Promise((resolve, reject) => {
            this.mediaClient.removeAllListeners();

            this.mediaClient.connect({ host: appConfig.octopusIpAddr, port: appConfig.mediaPort }, () => {
                console.log(`MOS media client connected to ${appConfig.mediaPort}`);
                resolve(); // Resolve when connected
            });

            this.mediaClient.once('close', () => {
                console.log('MOS media client disconnected. Trying to reconnect...');
                setTimeout(() => { this.startMediaClient(); }, 5000);
            });

            this.mediaClient.once('error', (err) => {
                console.log(`Media Client Error: ${err.message}`);
                reject(err); // Reject if there's an error
            });
        });
    }

    startMediaServer() {
        return new Promise((resolve, reject) => {
            this.mediaServer = net.createServer((socket) => {
                this.mediaServerSocket = socket;

                socket.on('data', (data) => {
                    parser.parseMos(data, "media-listener");
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

    async sendToMediaListener(payload) {
        try {
            if (this.mediaServerSocket) {
                const buffer = Buffer.from(payload, 'ucs-2').swap16();
                this.mediaServerSocket.write(buffer);
            } else {
                console.error('No active media-listener connection');
            }
        } catch (error) {
            console.error('Error sending data to media listener:', error);
        }
    }
}

const mosMediaConnector = new MosMediaConnector();
export default mosMediaConnector;