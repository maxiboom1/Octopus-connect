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
  const chars = [];
  
  for (let i = 0; i < buffer.length; i += 2) {
    if (i + 1 < buffer.length) { // Ensure there's a second byte
      const codeUnit = buffer[i + 1]; // Only take the second byte
      chars.push(String.fromCharCode(codeUnit));
    }
  }
  const utf8Str = chars.join('');
  const parser = new XMLParser();
  let obj = parser.parse(utf8Str);
  
  octopusService.mosRouter(obj, port);

}

export default {parseAttachments,parseMos};

