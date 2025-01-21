// If we receive some unknown MOS object - we will try to find its roID 
// and return acknowledge, to avoid message stuck and reconnection.
function findRoID(obj) {
    if (obj.hasOwnProperty('roID')) {
        return obj.roID; // Return the roID value if found
    }

    for (const key in obj) {
        // Check if the key is an object itself (and not an array)
        if (typeof obj[key] === 'object' && obj[key] !== null) {
            const foundRoID = findRoID(obj[key]); // Recursively search in child objects
            if (foundRoID !== undefined) {
                return foundRoID; 
            }
        }
    }

    return undefined;
}

export default findRoID;