function logger(msg, err = false){
    if (err) {
        console.error(msg);
        // Write to log file etc...
    } else {
        console.log(`${getCurrentDateTime()}:  ${msg}`);
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

export default logger;