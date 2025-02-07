import {XMLParser} from "fast-xml-parser";
import mosRouter from "../4-services/mos-router.js";
import appConfig from "./app-config.js";
import logger from "./logger.js";

function parseMos(buffer, port) {
    try {
      const decodedData = buffer.toString();
      if(appConfig.debug.rawMos) {logger("Raw MOS: " + decodedData);}
      const parser = new XMLParser({
          ignoreAttributes: false,   // Keep attributes
          attributeNamePrefix: '@_', // Prefix for attributes, adjust as needed
          allowBooleanAttributes: true,
          ignoreEmptyString: false,  // Do not ignore empty elements
          processEntities: true,     // Handle special XML entities (like &amp;)
          parseTagValue: true        // Parse inner text of tags, even when empty
      });
      let obj = parser.parse(decodedData);
      mosRouter.mosMessageProcessor(obj, port);

  } catch (error) {
      console.error(`${port}: Error parsing MOS message: ${buffer.toString()}`, error);
  }
}

export default {parseMos};

