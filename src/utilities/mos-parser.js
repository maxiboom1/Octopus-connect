import {XMLParser} from "fast-xml-parser";
import octopusService from "../services/octopus-service.js"


function parseMos(buffer, port) {
    try {
      const decodedData = buffer.toString();
      const parser = new XMLParser({
          ignoreAttributes: false,   // Keep attributes
          attributeNamePrefix: '@_', // Prefix for attributes, adjust as needed
          allowBooleanAttributes: true,
          ignoreEmptyString: false,  // Do not ignore empty elements
          processEntities: true,     // Handle special XML entities (like &amp;)
          parseTagValue: true        // Parse inner text of tags, even when empty
      });
      let obj = parser.parse(decodedData);
      octopusService.mosRouter(obj, port);

  } catch (error) {
      console.error('Error parsing MOS message:', error);
  }
}

export default {parseMos};

