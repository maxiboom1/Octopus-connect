import db from "../1-dal/sql.js";
import processAndWriteFiles from "../3-utilities/file-processor.js";
import cache from "../2-cache/cache.js";
import timeConvertors from "../3-utilities/time-convertors.js";
import logger from "../3-utilities/logger.js";
import appConfig from "../3-utilities/app-config.js";


class SqlService {

// ****************************** INIT FUNCTIONS - RUNS ONCE ONLOAD ****************************** //
    
    async initialize(){
        try {
            await this.deleteDBStories();
            await this.deleteDBItems();
            await this.getAndStoreProductions(); 
            await this.getAndStoreTemplates();
        }        
        catch (error) {
            throw error;
        }
    }

    async deleteDBStories() {
        try {
            const sql = `DELETE FROM ngn_inews_stories`;
            await db.execute(sql);
            logger(`[SQL] ngn_inews_stories cleared....`);
        } catch (error) {
            console.error('Error deleting stories from SQL:', error);
            throw error;
        }
    }

    async deleteDBItems() {
        
        if(appConfig.keepSqlItems) return;
        
        try {
            const sql = `DELETE FROM ngn_inews_items`;
            await db.execute(sql);
            logger(`[SQL] ngn_inews_items cleared....`);
        } catch (error) {
            console.error('Error deleting items from SQL:', error);
            throw error;
        }
    }

    async addDbRundown(rundownStr,roID,production) {
        const values = {
            name: String(rundownStr),
            lastUpdate: timeConvertors.createTick(),
            production: production,
            enabled: 1,
            tag: "",
            roID:roID
        };
    
        const selectQuery = `
            SELECT uid FROM ngn_inews_rundowns WHERE name = @name;
        `;
    
        const insertQuery = `
            INSERT INTO ngn_inews_rundowns (name, lastupdate, production, enabled, tag, roID)
            OUTPUT INSERTED.uid
            VALUES (@name, @lastUpdate, @production, @enabled, @tag, @roID);
        `;
    
        const updateQuery = `
            UPDATE ngn_inews_rundowns
            SET lastupdate = @lastUpdate, 
                production = @production, 
                enabled = @enabled, 
                tag = @tag,
                roID = @roID
            WHERE name = @name;
        `;
    
        try {
            // Check if a record with the specified name exists
            const selectResult = await db.execute(selectQuery, values);
            if (selectResult.recordset.length > 0) {
                // If record exists, update it
                await db.execute(updateQuery, values);
                logger(`[SQL] Registering existing rundown to active watch: {${rundownStr}}`);
                return selectResult.recordset[0].uid; // Return existing UID
            } else {
                // If record does not exist, insert a new one and return the new UID
                const insertResult = await db.execute(insertQuery, values);
                logger(`[SQL] Registering new rundown to active watch: {${rundownStr}}`);
                return insertResult.recordset[0].uid; // Return new UID
            }
        } catch (error) {
            console.error('Error registering rundown:', error);
        }
    }

    async getAndStoreProductions() {
        try {
            const sql = `SELECT uid, name,properties FROM ngn_productions WHERE enabled = 1`;
            const productions = await db.execute(sql);
            await cache.setProductions(productions);
            logger(`[SQL] Loaded productions from SQL`);
        } catch (error) {
            console.error('Error loading productions from SQL:', error);
            throw error;
        }
    }

    async getAndStoreTemplates() {
        try {
            const sql = `SELECT uid,source,name,production,icon FROM ngn_templates WHERE enabled = 1`;
            
            //{ uid, source, name, production,icon}
            const templates = await db.execute(sql);
            
            //{ uid, name, production , icon}
            const templatesWithoutHtml = await processAndWriteFiles(templates);
            await cache.setTemplates(templatesWithoutHtml);
            logger(`[SQL] Loaded templates from SQL`);
        } catch (error) {
            console.error('Error loading templates from SQL:', error);
            throw error;
        }
    }

    async hideUnwatchedRundowns() { // Compare rundowns from db with cached, and set enable=0 to those who are not in cache
        try {
            const sql = `SELECT * FROM ngn_inews_rundowns`;
            const result = await db.execute(sql);
            const cacheRundowns = await cache.getRundownsArr(); // Get rundowns from config.json
            const unwatchedRundowns = result.filter(item => !cacheRundowns.includes(item.name)).map(item => item.uid);
            for(const r of unwatchedRundowns){
                const values = {uid: r};
                const sql = "UPDATE ngn_inews_rundowns SET enabled=0 WHERE uid = @uid";
                await db.execute(sql,values);
            }
            logger(`[SQL] Noticed {${unwatchedRundowns.length}} unwatched rundowns in db.`);
        } catch (error) {
            console.error('Error deleting stories from SQL:', error);
            throw error;
        }
    }

// ****************************** STORY FUNCTIONS ****************************** //

    async addDbStory(story){
        const values = {
            name: story.storySlug,
            lastupdate: timeConvertors.createTick(),
            rundown: story.rundown,
            production: story.production,
            ord: story.ord,
            ordupdate: timeConvertors.createTick(),
            enabled: 1,
            floating: story.floating,
            tag: "",
            number:story.storyNum || "",
            properties:"",
            storyID: story.storyID
        }
        const sqlQuery = `
            INSERT INTO ngn_inews_stories (name, lastupdate, rundown, production, ord, ordupdate, enabled, floating, tag, storyID, number, properties)
            OUTPUT inserted.uid
            VALUES (@name, @lastupdate, @rundown, @production, @ord, @ordupdate, @enabled, @floating, @tag, @storyID, @number,@properties);`;            
        try {
            const result = await db.execute(sqlQuery, values);
            const assertedStoryUid = result.recordset[0].uid;
            story.uid = assertedStoryUid;
            logger(`[SQL] Registering new story to {${story.rundownStr}}: {${story.storySlug}}`);
            return assertedStoryUid;
        } catch (error) {
            console.error('Error executing query:', error); 
        }
    }

    async modifyDbStory(story){ 
        const values = {
            name:story.storySlug,
            lastupdate: timeConvertors.createTick(),
            number:story.storyNum || "",
            storyID:story.storyID,
            floating: story.floating
        };
        const sqlQuery = `
            UPDATE ngn_inews_stories
            SET name = @name, lastupdate = @lastupdate, number=@number, floating = @floating
            WHERE storyID = @storyID;
        `;
        
        try {
            await db.execute(sqlQuery, values);
        } catch (error) {
            console.error(`Error updating story ${story.storySlug} in DB:`, error);  
        }

    }

    async modifyBbStoryOrd(rundownStr, uid, storyName, ord){
        const values = {
            uid:uid,
            ord: ord,
            ordupdate: timeConvertors.createTick(),
        };
        const sqlQuery = `
            UPDATE ngn_inews_stories
            SET ord = @ord, ordupdate = @ordupdate
            WHERE uid = @uid;
        `;
        try {
            await db.execute(sqlQuery, values);
            logger(`[SQL] Reorder story in {${rundownStr}}: {${storyName}}`);
        } catch (error) {
            console.error('Error executing query:', error);
        }
    }

    async deleteStory(rundownStr,uid) {
        const values = {uid: uid};
        const sqlQuery = `DELETE FROM ngn_inews_stories WHERE uid = @uid;`;
        try {
            await db.execute(sqlQuery, values);
            logger(`[SQL] Story {${uid}} deleted from {${rundownStr}}`);
    
        } catch (error) {
            console.error(`Error deleting ${uid} story:`, error);
        }
    }

    async getStoryOrdByStoryID(storyID){
        
        const values = {storyID: storyID};
        const sqlQuery = `SELECT ord FROM ngn_inews_stories WHERE storyID = @storyID;`;
        try {
            const result = await db.execute(sqlQuery, values);
            return result.recordset[0].ord;
        } catch (error) {
            console.error(`Error fetching story ${storyID} order:`, error);
        }
    }

    async modifyBbStoryOrdByStoryID(storyID, ord){
        const values = {
            storyID:storyID,
            ord: ord,
            ordupdate: timeConvertors.createTick(),
        };
        const sqlQuery = `
            UPDATE ngn_inews_stories
            SET ord = @ord, ordupdate = @ordupdate
            WHERE storyID = @storyID;
        `;
        try {
            await db.execute(sqlQuery, values);
        } catch (error) {
            console.error('Error update story order by storyID: ', error);
        }
    } 
    
// ********************* ITEMS FUNCTIONS ********************** //

    async upsertItem(rundownStr, item) { // Item: {uid, name, production, rundown, story, ord, template, data, scripts}
        
        const values = {
            uid: item.uid,
            name: item.name,
            lastupdate: timeConvertors.createTick(),
            production: item.production,
            rundown: item.rundown,
            story: item.story,
            ord: item.ord,
            ordupdate: timeConvertors.createTick(),
            template: item.template,
            data: (item.data),
            scripts: (item.scripts),
            enabled: 1,
            tag: ""
        };

        const sqlQuery = `
            MERGE INTO ngn_inews_items AS target
            USING (VALUES (@uid, @name, @lastupdate, @production, @rundown, @story, @ord, @ordupdate, @template, @data, @scripts, @enabled, @tag)) 
            AS source (uid, name, lastupdate, production, rundown, story, ord, ordupdate, template, data, scripts, enabled, tag)
            ON target.uid = source.uid
            WHEN MATCHED THEN
                UPDATE SET 
                    lastupdate = source.lastupdate,
                    rundown = source.rundown,
                    story = source.story,
                    ord = source.ord,
                    ordupdate = source.ordupdate,
                    enabled = source.enabled
            WHEN NOT MATCHED THEN
                INSERT (name, lastupdate, production, rundown, story, ord, ordupdate, template, data, scripts, enabled, tag)
                VALUES (source.name, source.lastupdate, source.production, source.rundown, source.story, source.ord, source.ordupdate, source.template, source.data, source.scripts, source.enabled, source.tag)
            OUTPUT INSERTED.*;`;

        try {
            const result = await db.execute(sqlQuery, values);
            if (result.rowsAffected[0] > 0) {
                
                const assertedUid = result.recordset[0].uid;
                
                if(assertedUid === String(item.uid)){
                    logger(`[SQL] Item in {${rundownStr}}, story {${item.story}} updated with uid {${assertedUid}}`);
                    return {success:true, event:"update", uid:assertedUid};
                } else {
                    logger(`[SQL] Item in {${rundownStr}}, story {${item.story}} restored with uid {${assertedUid}}`);
                    return {success:true, event:"create", uid:assertedUid};
                }
                
            } else {
                logger(`[SQL] Item {${item.uid}}: order: {${item.ord}]} in {${rundownStr}} story {${item.story}} failed to update or insert`, "red");
                return {success:false, event:"error"};
            }
        } catch (error) {
            console.error('Error on storing GFX item:', error);
            return {success:false, event:"error", error:error};
        }
    }

    async updateItemOrd(rundownStr, gfxItem, ord) { 
        const values = {
            ord: ord,
            ordupdate: timeConvertors.createTick(),
            uid: gfxItem
        };
        const sqlQuery = `
            UPDATE ngn_inews_items SET 
            ord = @ord, ordupdate = @ordupdate
            OUTPUT INSERTED.*
            WHERE uid = @uid;`;
    
        try {
            const result =await db.execute(sqlQuery, values);
            if(result.rowsAffected[0] > 0){
                logger(`[SQL] GFX item {${gfxItem}} order changed`); 
            } else {
                logger(`[SQL] Item {${gfxItem}} order:{${ord}} in {${rundownStr}}, doesn't exists in DB`);
            }

        } catch (error) {
            console.error('Error on storing GFX item:', error);
            return null;
        }
    }

    async deleteDbItem(uid){
        const query = `DELETE FROM ngn_inews_items WHERE uid = ${uid}`;
        try {
            await db.execute(query);
            logger(`[SQL] Cleared GFX item {${uid}} from SQL`);
            } catch (error) {
            console.error(`Error clearing item ${uid} from SQL:`, error);
            }
    }

    async disableDbItem(uid) { 
        const values = {
            lastupdate: timeConvertors.createTick(),
            uid: uid,
            enabled: 0
        };
        const sqlQuery = `
            UPDATE ngn_inews_items SET 
            lastupdate = @lastupdate, enabled = @enabled
            OUTPUT INSERTED.*
            WHERE uid = @uid;`;
    
        try {
            const result =await db.execute(sqlQuery, values);
            if(result.rowsAffected[0] > 0){
                logger(`[SQL] Item ${uid} has been disabled`); 
            } else {
                logger(`[SQL] WARNING! Item ${uid} doesn't exists in DB`);
            }

        } catch (error) {
            console.error('Error on disabling GFX item:', error);
            return null;
        }
    }

    async disableDbItemsByStoryUid(storyID) {  
        const values = {
            lastupdate: timeConvertors.createTick(),
            story: storyID,
            enabled: 0
        };
        const sqlQuery = `
            UPDATE ngn_inews_items SET 
            lastupdate = @lastupdate, enabled = @enabled
            OUTPUT INSERTED.*
            WHERE story = @story;`;
    
        try {
            const result = await db.execute(sqlQuery, values);
            if(result.rowsAffected[0] > 0){
                logger(`[SQL] Items in {${storyID}} disabled`);
            } else {
                logger(`[SQL] WARNING! No items of story {${storyID}} found in DB`);
            }

        } catch (error) {
            console.error(`Error on disabling GFX items in story ${storyID}:`, error);
        }
    }

    async deleteDbItemsByStoryUid(uid){
        const query = `DELETE FROM ngn_inews_items WHERE story = ${uid}`;
        try {
            await db.execute(query);
            logger(`[SQL] Cleared story {${uid}} items`);
            } catch (error) {
            console.error('Error clearing story items from SQL:', error);
            }
    }

    async getFullItem(itemUid){
        const values = {uid:itemUid};
    
        const sqlQuery = `SELECT * FROM ngn_inews_items WHERE uid = @uid;`;
    
        try {
            const result = await db.execute(sqlQuery, values);
            return result.recordset[0];
 
        } catch (error) {
            console.error('Error on fetching item data:', error);
            return null;
        }
    }

    async getItemsIdArrByRundownId(rundownId){
        const values = {rundown:rundownId};
    
        const sqlQuery = `SELECT uid FROM ngn_inews_items WHERE rundown = @rundown;`;
    
        try {
            const result = await db.execute(sqlQuery, values);
            return result.recordset.map(row => row.uid);
 
        } catch (error) {
            console.error('Error on fetching item by rundownId data:', error);
            return null;
        }
    }

// ********************* FRONT-TRIGGERED ITEMS FUNCTIONS ********************** //

    //This func triggered from web  page, when user click "save". 
    //We don't save it to cache! It will be updated from inews-service modify story event.  
    async storeNewItem(item) { // Expect: {name, data, scripts, template,production}
        const values = {
            name: item.name,
            lastupdate: timeConvertors.createTick(),
            production: item.production,
            rundown: "",
            story: "",
            ord: "",
            ordupdate: timeConvertors.createTick(),
            template: item.template,
            data: item.data,
            scripts: item.scripts,
            enabled: 1,
            tag: "",
        };
        const sqlQuery = `
            INSERT INTO ngn_inews_items (name, lastupdate, production, rundown, story, ord, ordupdate, template, data, scripts, enabled, tag)
            OUTPUT INSERTED.uid
            VALUES (@name, @lastupdate, @production, @rundown, @story, @ord, @ordupdate,@template, @data, @scripts, @enabled, @tag);`;
    
        try {
            const result = await db.execute(sqlQuery, values);
            return result.recordset[0].uid;; // We return it to front page and its stored in mos obj as gfxItem
        } catch (error) {
            console.error('Error on storing GFX item:', error);
            return null;
        }
    }

    async getItemData(itemUid){
        const values = {
            uid:itemUid
        };
    
        const sqlQuery = `
            SELECT data,name FROM ngn_inews_items WHERE uid = @uid;
        `;
    
        try {
            const result = await db.execute(sqlQuery, values);
            if(result.rowsAffected[0] === 0) return {data:"N/A"};
            // We return it to front page and its stored in mos obj as gfxItem
            return {
                data:result.recordset[0].data,
                name:result.recordset[0].name
            } 
        } catch (error) {
            console.error('Error on fetching item data:', error);
            return null;
        }
    }

    // This func is triggered from a web page, when the user clicks "save" 
    async updateItemFromFront(item) { // Expect: {name, data, scripts, template, production, gfxItem}
        const values = {
            name: item.name,
            lastupdate: timeConvertors.createTick(),
            production: item.production,
            template: item.template,
            data: item.data,
            scripts: item.scripts,
            enabled: 1,
            tag: "", 
            uid: item.gfxItem
        };

        const sqlQuery = `
            UPDATE ngn_inews_items
            SET name = @name,
                lastupdate = @lastupdate,
                production = @production,
                template = @template,
                data = @data,
                scripts = @scripts,
                enabled = @enabled,
                tag = @tag
            WHERE uid = @uid;`;

        try {
            // Execute the update query with the provided values
            await db.execute(sqlQuery, values);
            logger(`[SQL] Item {${item.gfxItem}} updated from the plugin`);
        } catch (error) {
            console.error('Error on updating GFX item:', error);
        }
    }
    
    async storeNewDuplicate(item) { // Expect: {name, production, rundown, story, ord, scripts, template, data, scripts}
        const values = {
            name: item.name,
            lastupdate: timeConvertors.createTick(),
            production: item.production,
            rundown: item.rundown,
            story: item.story,
            ord: item.ord,
            ordupdate: timeConvertors.createTick(),
            template: item.template,
            data: item.data,
            scripts: item.scripts,
            enabled: 1,
            tag: "",
        };
        const sqlQuery = `
            INSERT INTO ngn_inews_items (name, lastupdate, production, rundown, story, ord, ordupdate, template, data, scripts, enabled, tag)
            OUTPUT INSERTED.uid
            VALUES (@name, @lastupdate, @production, @rundown, @story, @ord, @ordupdate,@template, @data, @scripts, @enabled, @tag);`;
    
        try {
            const result = await db.execute(sqlQuery, values);
            return result.recordset[0].uid;; // We return it to front page and its stored in mos obj as gfxItem
        } catch (error) {
            console.error('Error on storing GFX item:', error);
            return null;
        }
    }

// ********************* LAST UPDATE && ORD LAST UPDATE FUNCTIONS ********************** //

    async rundownLastUpdate(rundownStr){
            const rundownMeta = await cache.getRundownList(rundownStr);
            try {
                const values = {
                    uid: rundownMeta.uid,
                    lastupdate: timeConvertors.createTick()
                }
                const sqlQuery = `
                    UPDATE ngn_inews_rundowns
                    SET lastupdate = @lastupdate
                    WHERE uid = @uid;
                `;
                await db.execute(sqlQuery, values);
            } catch (error) {
                console.error('Error rundownLastUpdate:', error);
            }     
    }

    async storyLastUpdate(storyId){
        try {
            const values = {
                uid: storyId,
                lastupdate: timeConvertors.createTick()
            }
            const sqlQuery = `
                UPDATE ngn_inews_stories
                SET lastupdate = @lastupdate
                WHERE uid = @uid;
            `;
            await db.execute(sqlQuery, values);
        } catch (error) {
            console.error('Error storyLastUpdate:', error);
        }     
    }

    async modifyRundownStr(uid, rundownStr){
        try {
            const values = {
                uid: uid,
                lastupdate: timeConvertors.createTick(),
                name: String(rundownStr)
            }
            const sqlQuery = `
                UPDATE ngn_inews_rundowns
                SET lastupdate = @lastupdate, name = @name
                WHERE uid = @uid;
            `;
            await db.execute(sqlQuery, values);
        } catch (error) {
            console.error('Error updating rundown name in SQL:', error);
        }     
    }

// ********************* UN-MONITOR RUNDOWN FROM MOS ********************** //

    async deleteDbRundown(uid,rundownStr) {
        const values = {
            uid:uid,
            enabled: 0
        };
        const updateQuery = `
            UPDATE ngn_inews_rundowns
            SET enabled = @enabled
            WHERE uid = @uid;
        `;
        try {
            await db.execute(updateQuery, values);
            logger(`[SQL] Rundown un-monitored: {${rundownStr}}`);
            } catch (error) {
            console.error('Error un-monitor rundown:', error);
            }
    }

    async deleteDbStoriesByRundownID(uid){
        const query = `DELETE FROM ngn_inews_stories WHERE rundown = ${uid}`;
        try {
            await db.execute(query);
            logger(`[SQL] Cleared unmonitored stories`);
            } catch (error) {
            console.error('Error clearing un-monitored stories from SQL:', error);
            }
    }

    async deleteDbItemsByRundownID(uid){
        const query = `DELETE FROM ngn_inews_items WHERE rundown = ${uid}`;
        try {
            await db.execute(query);
            logger(`[SQL] Cleared unmonitored items`);
            } catch (error) {
            console.error('Error clearing un-monitored items from SQL:', error);
            }
    }
}    

const sqlService = new SqlService();

export default sqlService;

