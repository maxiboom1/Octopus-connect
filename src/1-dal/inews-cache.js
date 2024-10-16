import replaceAndNormalizeSpaces from "../utilities/normalize.js";

class InewsCache {
    
    constructor() {
        this.productions = {}; //{name: {uid:uid, scenes:[]},name2:uid2, ... other productions...}
        this.templates = {}; // {templateUid: {templateName, production, icon}, ...}
        this.stories = {}; //{'rundownName': {'storyIdentifier': {storyProps...} } }; ==> see example at page footer
        this.rundownsList = {}; // {rundownName:{uid,production,roID}, otherRundownName:{...}, ...}
    }

    // ********************* Init FUNCTIONS ********************** //

    async initializeRundown(rundownStr,uid,production,roID) {
        this.stories[rundownStr] = {};
        this.rundownsList[rundownStr] = {};
        this.rundownsList[rundownStr] = {uid,production,roID}
    }

    async setProductions(productions){ // Expect [{ uid: '20006', name: 'TEST', properties: obj... }, {...}]
        this.productions = {};
        for (let i = 0; i < productions.length; i++) {
            const {name, uid, properties} ={...productions[i]};
            // This part takes production "properties" data, and simplifies it to needed obj:
            // scenes: [{name: "Scene Name",folders: 
            // [{name: "Folder Name",itemUids: 
            //[ /* Array of item UIDs */ ]},color:color// ... more folders]},// ... more scenes]
            const decodedStr = decodeURIComponent(properties);
            
            const productionData = JSON.parse(decodedStr);
            const scenes = productionData.Scenes.map(scene => {
                return {
                    name:replaceAndNormalizeSpaces(scene.Name),
                    color:scene.Color,
                    folders: scene.Folders.map(folder => ({
                        name: replaceAndNormalizeSpaces(folder.Name),
                        itemUids: folder.ItemUids
                    }))
                };
            });
            this.productions[name] = {uid, scenes};
            
          }
    }

    async setTemplates(templates) {
        this.templates = {};
        templates.forEach(t => {
            this.templates[t.uid] = { name: t.name, production: t.production, icon: t.icon };
        });
    }
    
    // ********************* PRODUCTIONS FUNCTIONS ********************** //
    async getProductions(){

        return this.productions;
    }

    async getProductionsArr() {
        let arr = [];
        for (const [name, data] of Object.entries(this.productions)) {
            let production = {
                name: name,
                uid: data.uid,
                scenes: data.scenes.map(scene => ({
                    name: scene.name,
                    color:scene.color,
                    folders: scene.folders.map(folder => ({
                        name: folder.name,
                        itemUids: folder.itemUids
                    }))
                }))
            };
            arr.push(production);
        }
        return arr;
    }

    // ********************* TEMPLATES FUNCTIONS ********************** //

    async getTemplatesByProduction(productionUid) {
        const filteredTemplates = [];
    
        for (const [uid, templateData] of Object.entries(this.templates)) {
            if (templateData.production === productionUid) {
                const { name, production, icon } = templateData;
                const templateObject = { uid, name, production, icon };
                filteredTemplates.push(templateObject);
            }
        }
    
        return filteredTemplates;
    }    

    // ********************* STORY FUNCTIONS ********************** //

    async getStory(rundownStr, identifier) {
        if (this.isStoryExists(rundownStr, identifier)) {
            return this.stories[rundownStr][identifier];
        }
    }

    async getStoryUid(rundownStr, identifier){
        if (this.isStoryExists(rundownStr, identifier)) {
            return this.stories[rundownStr][identifier].uid;
        }
    }

    async isStoryExists(rundownStr, identifier) {
        const storyExists = !!this.stories[rundownStr] && !!this.stories[rundownStr][identifier];
        return storyExists;
    }

    async saveStory(story) {

        this.stories[story.rundownStr][story.storyID] = {
            uid:story.uid,
            storyID:story.storyID,
            name: story.storySlug,
            number: story.storyNum,
            ord: story.ord,
            production: story.production,
            rundown:story.rundown,
            item: story.item
        };
    }

    async reorderStory(rundownStr, story, ord) {
        this.stories[rundownStr][story.identifier].locator = story.locator;
        this.stories[rundownStr][story.identifier].ord = ord;
    }

    async modifyStory(rundownStr, story) {
        this.stories[rundownStr][story.identifier].storyName = story.storyName;
        this.stories[rundownStr][story.identifier].locator = story.locator;
        this.stories[rundownStr][story.identifier].flags = story.flags;
        this.stories[rundownStr][story.identifier].attachments = story.attachments;
        this.stories[rundownStr][story.identifier].pageNumber = story.pageNumber;
    }

    async deleteStory(rundownStr, identifier) {
        delete this.stories[rundownStr][identifier];
    }

    async hasAttachments(rundownStr, identifier) {
        // Check if the story and identifier exist
        if (this.stories[rundownStr] && this.stories[rundownStr][identifier]) {
            const attachments = this.stories[rundownStr][identifier].attachments;
            if (Object.keys(attachments).length === 0) return false;
            return true;
        }
    }

    async getStoryAttachments(rundownStr,identifier){
        if (this.stories[rundownStr] && this.stories[rundownStr][identifier]) {
            //return this.stories[rundownStr][identifier].attachments;
            return {...this.stories[rundownStr][identifier].attachments};
        }
    }

    async setStoryAttachments(rundownStr,identifier,attachments){
        if (this.stories[rundownStr] && this.stories[rundownStr][identifier]) {
            this.stories[rundownStr][identifier].attachments = attachments;
        }
    }

    async deleteSingleAttachment(rundownStr,identifier,attachmentId){
        if (this.stories[rundownStr] && this.stories[rundownStr][identifier] && this.stories[rundownStr][identifier].attachments[attachmentId]) {
            delete this.stories[rundownStr][identifier].attachments[attachmentId];
        }
    }
    
    // ********************* RUNDOWNS FUNCTIONS ********************** //

    async getRundownsArr(){ // Return arr of rundownStr's 
        return Object.keys(this.rundownsList);
    }

    async getRundownUid(rundownStr){
        return this.rundownsList[rundownStr].uid;
    }
    
    async getRundownUidAndStrByRoID(roID) {
        for (const rundownStr in this.rundownsList) {
            const rundown = this.rundownsList[rundownStr];
            if (rundown.roID === roID) {
                return {uid:rundown.uid,rundownStr:rundownStr};
            }
        }
        return null; 
    }

    async getRundown(rundownStr) {
        return this.stories[rundownStr];
    }

    async getRundownList(rundownStr){
        return this.rundownsList[rundownStr];
    }

    async getProdIdByRundown(rundownStr){
        return this.rundownsList[rundownStr].production;
    }

    async getDataByRundownStr(rundownStr){
        return {
                production: this.rundownsList[rundownStr].production,
                rundown: this.rundownsList[rundownStr].uid
        }

    }

    async getRundownLength(rundownStr) {
        const rundown = this.stories[rundownStr];
        return rundown ? Object.keys(rundown).length : 0;
    }

    async getRundownIdentifiersList(rundownStr) {
        const rundown = this.stories[rundownStr];
        if (!rundown) return [];
        return Object.keys(rundown);
    }

    async getRundowns() {
        return this.rundownsList;
    }

    async getStories() {
        return this.stories;
    }
    // UNMONITOR LINEUP FROM MOS
    async deleteRundownFromCache(rundownStr){
        delete this.stories[rundownStr];
        delete this.rundownsList[rundownStr];
    }
    
}

const inewsCache = new InewsCache();

export default inewsCache;