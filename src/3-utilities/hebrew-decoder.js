import he from "he";

function toHebrew(str){
    if(str === null || str === "") return "";
    const textToEncode = str; 
    const utf8Text = Buffer.from(textToEncode, 'latin1').toString('utf-8'); // Convert to UTF-8
    const encodedText = he.encode(utf8Text);
    const decodedText = he.decode(encodedText);
    return decodedText;
} 

export default toHebrew;