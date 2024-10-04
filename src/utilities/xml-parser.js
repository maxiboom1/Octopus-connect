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
  try {
      // Convert the buffer from UCS-2 (big-endian) to UTF-16LE
      const decodedData = buffer.swap16().toString('utf16le');

      // Initialize the XML parser with updated options
      const parser = new XMLParser({
          ignoreAttributes: false,   // Keep attributes
          attributeNamePrefix: '@_', // Prefix for attributes, adjust as needed
          allowBooleanAttributes: true,
          ignoreEmptyString: false,  // Do not ignore empty elements
          processEntities: true,     // Handle special XML entities (like &amp;)
          parseTagValue: true        // Parse inner text of tags, even when empty
      });

      // Parse the XML string into a JavaScript object
      let obj = parser.parse(decodedData);

      // Route the parsed MOS object to the Octopus service
      octopusService.mosRouter(obj, port);
  } catch (error) {
      console.error('Error parsing MOS message:', error);
  }
}

export default {parseAttachments,parseMos};

