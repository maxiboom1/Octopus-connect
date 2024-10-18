import replaceAndNormalizeSpaces from "../utilities/normalize.js";

class Cache {
    
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

    // Octopus
    async getStoryUid(rundownStr, storyID){
        if (this.isStoryExists(rundownStr, storyID)) {
            return this.stories[rundownStr][storyID].uid;
        }
    }
    // Octopus
    async isStoryExists(rundownStr, storyID) {
        const storyExists = !!this.stories[rundownStr] && !!this.stories[rundownStr][storyID];
        return storyExists;
    }
    // Octopus
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
    // Octopus
    async modifyStoryOrd(rundownStr, storyID, ord) {
        if (this.stories[rundownStr] && this.stories[rundownStr][storyID]) {
            this.stories[rundownStr][storyID].ord = ord;
        }
    }
    
    // Octopus
    async getStoryOrd(rundownStr, storyID){
        return this.stories[rundownStr][storyID].ord
    }

    // Octopus
    async deleteStory(rundownStr, storyID) {
        if (this.stories[rundownStr] && this.stories[rundownStr][storyID]) {
            delete this.stories[rundownStr][storyID];
        }
    }
    



    // ********************* RUNDOWNS FUNCTIONS ********************** //
    
    // Octopus - used to define which lineups is cached in hideUnwatched()
    async getRundownsArr(){ // Return arr of rundownStr's 
        return Object.keys(this.rundownsList);
    }

    async getRundownUid(rundownStr){
        return this.rundownsList[rundownStr].uid;
    }
    // Octopus
    async getRundownUidAndStrByRoID(roID) {
        for (const rundownStr in this.rundownsList) {
            const rundown = this.rundownsList[rundownStr];
            if (rundown.roID === roID) {
                return {rundownStr:rundownStr,uid:rundown.uid};
            }
        }
        return null; 
    }
    // Octopus
    async getRundown(rundownStr) {
        return JSON.parse(JSON.stringify(this.stories[rundownStr]));
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

    // Octopus
    getRundownSlugByStoryID(storyID) {
        for (const rundownSlug in this.stories) {
            if (this.stories[rundownSlug][storyID]) {
                return rundownSlug; // Return the rundownSlug if storyID is found
            }
        }
        return null; 
    }
    // Octopus
    getRundownSlugByRoID(roID) {
        for (const rundownSlug in this.rundownsList) {
            if (this.rundownsList[rundownSlug].roID === roID) {
                return rundownSlug; // Return the rundownSlug if roID is found
            }
        }
        return null; 
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
    // Octopus
    async modifyRundownStr(oldRundownStr, newRundownStr){
        // Modify this rundownList object
        const rundownData = this.rundownsList[oldRundownStr];
        const storyCacheData = this.stories[oldRundownStr];
        
        if (rundownData) {
            this.rundownsList[newRundownStr] = {}; // Initialize new object
            this.rundownsList[newRundownStr] = rundownData; // Step 2: Copy the data to the new `rundownStr`
            delete this.rundownsList[oldRundownStr]; // Step 3: Delete the old `rundownStr`
        }

        if (storyCacheData) {
            this.stories[newRundownStr] = {};
            this.stories[newRundownStr] = storyCacheData;
            delete this.stories[oldRundownStr];
        }

    }
    
}

const cache = new Cache();

export default cache;