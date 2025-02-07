import appConfig from "./app-config.js";

const debug = appConfig.debug;

/**
 * Logs a message to the console with an optional color.
 * 
 * @param {string} msg - The message to log.
 * @param {string} [color='white'] - The color to print the message in. 
 *                                   Supported colors: 'reset', 'bold', 'dim', 'underlined', 
 *                                   'blinking', 'reverse', 'hidden', 'strike', 'black', 'red', 
 *                                   'green', 'yellow', 'blue', 'magenta', 'cyan', 'white'.
 *                                   If the color is not recognized, the message will be logged without any color.
 */
function logger(msg, color = "white"){
    
    if(debug.sql === 0 && msg.startsWith("[SQL]") && color != "red") return;
    
    if (colors[color] === undefined) { // If color arg wrong or unsupported
        console.log(`${getCurrentDateTime()}  ${msg}`);
    } else {
        console.log(`${getCurrentDateTime()} ${colors[color]}%s${colors.reset}`,`${msg}`);
    }
    
}

function getCurrentDateTime() {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0'); // Months are zero-based
    const year = now.getFullYear();
    const hour = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    const sec = String(now.getSeconds()).padStart(2, '0');

    return `${day}/${month}/${year} ${hour}:${min}:${sec}`;
}

const colors = {
    reset: "\x1b[0m",
    bold: "\x1b[1m",
    dim: "\x1b[2m",
    underlined: "\x1b[4m",
    blinking: "\x1b[5m",
    reverse: "\x1b[7m",
    hidden: "\x1b[8m",
    strike: "\x1b[9m",
    black: "\x1b[30m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    magenta: "\x1b[35m",
    cyan: "\x1b[36m",
    white: "\x1b[37m",
    dimmed: "\x1b[38;5;244m"
};

export default logger;