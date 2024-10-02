import conn from "../1-dal/inews-ftp.js"

async function lineupExists(path){
    const dir = path.split(".").slice(0,-1).join(".");
    const lineupName = path.split(".").slice(-1).join(".").toUpperCase();
    const list = await conn.list(dir);

    for (const item of list) { 
        if (item.fileName === lineupName) {
            return true;
        } 
    }
    
    return false;
}

export default lineupExists;

