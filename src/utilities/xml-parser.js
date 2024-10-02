import {XMLParser} from "fast-xml-parser";
import itemsHash from "../1-dal/items-hashmap.js";



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

export default {parseAttachments};


/*
Example attachment:

<AttachmentContent><mos>
                <ncsItem>
                        <item>
                                <itemID>1</itemID>
                                <itemSlug>asd</itemSlug>
                                <objID>12345</objID>
                                <mosID>iNEWSMOS1</mosID>
                                <mosItemBrowserProgID>alex</mosItemBrowserProgID>
                                <mosItemEditorProgID>alexE</mosItemEditorProgID>
                                <mosAbstract>asd</mosAbstract>
                                <group>1</group>
                                <gfxItem>102</gfxItem>
                                <gfxTemplate>10005</gfxTemplate>
                                <gfxProduction>2</gfxProduction>
                        </item>
                </ncsItem>
        </mos></AttachmentContent>




// Example for edited attachment
{
  '1': '<AttachmentContent><mos>\r\n' +
    '\t\t<itemID>1</itemID>\r\n' +
    '\t\t<itemSlug>eee123</itemSlug>\r\n' +
    '\t\t<objID>12345</objID>\r\n' +
    '\t\t<mosID>iNEWSMOS1</mosID>\r\n' +
    '\t\t<mosItemBrowserProgID>alex</mosItemBrowserProgID>\r\n' +
    '\t\t<mosItemEditorProgID>alexE</mosItemEditorProgID>\r\n' +
    '\t\t<mosAbstract/>\r\n' +
    '\t\t<group>1</group>\r\n' +
    '\t\t<gfxItem>143</gfxItem>\r\n' +
    '\t\t<gfxTemplate>10005</gfxTemplate>\r\n' +
    '\t\t<gfxProduction>2</gfxProduction>\r\n' +
    '\t</mos></AttachmentContent>'
}        
*/