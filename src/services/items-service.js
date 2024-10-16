import sqlService from "./sql-service.js";

async function registerStoryItems(story) {
    let ord = 0;
    for(const el of story.item){
        const item = {
            uid: el.mosExternalMetadata.gfxItem,
            rundown: story.rundown,
            story: story.uid,
            ord:ord
        };
        await sqlService.updateItem(story.rundownStr,item);
        ord++;
    }
}


export default { registerStoryItems };