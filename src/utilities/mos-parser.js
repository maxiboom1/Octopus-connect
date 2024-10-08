import {XMLParser} from "fast-xml-parser";
import octopusService from "../services/octopus-service.js"


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

export default {parseMos};

