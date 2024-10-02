import conn from "../1-dal/inews-ftp.js";
import appConfig from "../utilities/app-config.js";
import hebDecoder from "../utilities/hebrew-decoder.js";
import sqlService from "./sql-service.js";
import inewsCache from "../1-dal/inews-cache.js";
import xmlParser from "../utilities/xml-parser.js";
import itemHash from "../1-dal/items-hashmap.js";
import logger from "../utilities/logger.js";
import itemsService from "./items-service.js";

class RundownProcessor {
    constructor() {
        this.setupConnectionListener();
    }

    async initialize() {
        logger('Starting Inews-connect 1.9.3...');
        await sqlService.initialize();
        this.rundownIterator();
    }

    setupConnectionListener() {
        conn.on('connections', connections => {
            logger(`${connections} FTP connections active`);
        });
    }

    async rundownIterator() {
        const rundowns = await inewsCache.getRundownsArr();
        for (const rundownStr of rundowns) {
            await this.processRundown(rundownStr);
        }
        setTimeout(() => this.rundownIterator(), appConfig.pullInterval);
    }

    async processRundown(rundownStr) {
        try {
            const listItems = await conn.list(rundownStr);
            const storyPromises = this.processStories(rundownStr, listItems);
            await Promise.all(storyPromises);
            await this.handleDeletedStories(rundownStr, listItems);
        } catch (error) {
            console.error("Error fetching and processing stories:", error);
        }
    }

    processStories(rundownStr, listItems) {
        return listItems
            .filter(listItem => listItem.fileType === 'STORY')
            .map((listItem, index) => this.processStory(rundownStr, listItem, index));
    }

    async processStory(rundownStr, listItem, index) {
        try {
            const isStoryExists = await inewsCache.isStoryExists(rundownStr, listItem.identifier);
            listItem.storyName = hebDecoder(listItem.storyName);

            if (!isStoryExists) {
                await this.handleNewStory(rundownStr, listItem, index);
            } else {
                await this.handleExistingStory(rundownStr, listItem, index);
            }
        } catch (error) {
            console.error(`ERROR at Index ${index}:`, error);
        }
    }
    // Done, in terms of duplicates
    async handleNewStory(rundownStr, listItem, index) {
        // Get story string obj
        const story = await this.getStory(rundownStr, listItem.fileName);
        
        // Add parsed attachments 
        listItem.attachments = xmlParser.parseAttachments(story);
        
        // Add pageNumber
        listItem.pageNumber = story.fields.pageNumber;
        
        // Set enabled to 1 if attachment exists
        listItem.enabled = this.isEmpty(listItem.attachments) ? 0 : 1;

        // Store new story (without attachments!) in SQL, and get asserted uid
        const assertedStoryUid = await sqlService.addDbStory(rundownStr, listItem, index);
        
        // Add asserted uid to listItem
        listItem.uid = assertedStoryUid;

        // Save this story to cache
        await inewsCache.saveStory(rundownStr, listItem, index);

        await itemsService.registerStoryItems(rundownStr,listItem);

        await sqlService.rundownLastUpdate(rundownStr);

        await sqlService.storyLastUpdate(assertedStoryUid);

    }

    async handleExistingStory(rundownStr, listItem, index) {
        const action = await this.checkStory(rundownStr, listItem, index);

        if (action === "reorder") {
            await sqlService.reorderDbStory(rundownStr, listItem, index);
            await inewsCache.reorderStory(rundownStr, listItem, index);
        } else if (action === "modify") {
            await this.modifyStory(rundownStr, listItem);
        }
    }
 
    async modifyStory(rundownStr, listItem) {
        const story = await this.getStory(rundownStr, listItem.fileName);
        listItem.attachments = xmlParser.parseAttachments(story);
        listItem.pageNumber = story.fields.pageNumber;
        listItem.enabled = this.isEmpty(listItem.attachments) ? 0 : 1;
        
        listItem.attachments = await sqlService.modifyDbStory(rundownStr, listItem);
        await inewsCache.modifyStory(rundownStr, listItem);
    }

    async handleDeletedStories(rundownStr, listItems) {
        if (listItems.length < await inewsCache.getRundownLength(rundownStr)) {
            await this.deleteDif(rundownStr, listItems);
        }
    }

    async checkStory(rundownStr, story, index) {
        const cacheStory = await inewsCache.getStory(rundownStr, story.identifier);
        if (index != cacheStory.ord) {
            return "reorder";
        }
        if (story.locator != cacheStory.locator) {
            return "modify";
        }
        return false;
    }

    async deleteDif(rundownStr, listItems) {
        const inewsHashMap = {};
        const cachedIdentifiers = await inewsCache.getRundownIdentifiersList(rundownStr);
        for (const listItem of listItems) {
            inewsHashMap[listItem.identifier] = 1;
        }
        const identifiersToDelete = cachedIdentifiers.filter(identifier => !inewsHashMap.hasOwnProperty(identifier));
        for (const identifier of identifiersToDelete) {
            await sqlService.deleteStory(rundownStr, identifier);
            await inewsCache.deleteStory(rundownStr, identifier);
        }
    }

    async getStory(rundownStr, fileName) {
        return await conn.story(rundownStr, fileName);
    }

    isEmpty(obj) {
        return Object.keys(obj).length === 0;
    }

    async startMainProcess() {
        await this.initialize();
    }
}

const processor = new RundownProcessor();
export default processor;