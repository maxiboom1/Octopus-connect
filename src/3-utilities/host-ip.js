import os from "os"; // Import the 'os' module

// Function to get the server's IP address
function getServerIP() {
    const ifaces = os.networkInterfaces();
    let serverIP = "localhost"; // Default to localhost if no IP is found

    // Iterate over network interfaces
    for (const ifaceName in ifaces) {
        const iface = ifaces[ifaceName];

        for (const entry of iface) {
            if (entry.family === "IPv4" && !entry.internal) {
                serverIP = entry.address;
                break;
            }
        }
    }

    return serverIP;
}

export default getServerIP;