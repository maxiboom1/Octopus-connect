import {XMLParser} from "fast-xml-parser";
import octopusService from "../services/octopus-service.js"
//import itemsHash from "../1-dal/items-hashmap.js";



/** 
 * Gets inews raw story and returns parsed attachments.
 * @returns - {"ItemId":{
 * gfxTemplate,
 * gfxProduction,
 * itemSlug,
 * ord}
 * }
 */
function parseAttachments(story) {
  const attachments = story.attachments;
  const obj = {};
    
  for (const a in attachments) {
    if (attachments[a].includes("<gfxProduction>")) {
      const parser = new XMLParser();
      let jObj = parser.parse(attachments[a]);

      let item;
      if (jObj.AttachmentContent.mos.ncsItem) {
          // Type 1 XML
          item = jObj.AttachmentContent.mos.ncsItem.item;
      } else {
          // Type 2 XML
          item = jObj.AttachmentContent.mos;
      }
        
      // Create a new object with only the specified properties
      obj[item.gfxItem] = {
        gfxTemplate: item.gfxTemplate,
        gfxProduction: item.gfxProduction,
        itemSlug: item.itemSlug,
        ord: a
      };
        
      }
    }

    return obj;
}

function parseMos(buffer, port) {
  // Convert the buffer from UCS-2 big-endian to a UTF-16 string
  let utf16Str = '';
  for (let i = 0; i < buffer.length; i += 2) {
    // Read two bytes and treat them as a big-endian code unit
    const codeUnit = buffer.readUInt16BE(i);
    utf16Str += String.fromCharCode(codeUnit);
  }

  // Now that we have a proper UTF-16 string, we can parse it as XML
  const parser = new XMLParser();
  let obj = parser.parse(utf16Str);
  //console.log("recieve from ", port, ":", obj);
  octopusService.mosRouter(obj, port);
}

export default {parseAttachments,parseMos};

