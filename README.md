
# Octopus-connect

## Description

Connects to octopus NRCS server using MOS protocol. Provide GFX plugin. Based on "Inews-connect" repo. The main dif, is that while in Inews-connect the transport protocol was FTP, in this project we setup connection to MOS-enabled NRCS.

## Application notes

### V 1.3.01

- Bug fixed: JS JSON.stringify and quotes in the start and end of converted string. Therefore - those quotes fetches by our app, and stores in sql with the quotes. Then, when user attempt to open the item - it fails duo the quotes. Fix: Slice quotes once in mosMessageCreate before saving it in the story.
- Since we not use "save" with pre configured item data - so logically any new item in the system is "Restored" item.
Therefore, log terminology changed from "Restored item" to "new item".


### V 1.3.0

- Plugin saves on NRCS story "data" and "scripts". This for the ability restore the item, and open/edit item while rundown is offline (not in SQL).
- Plugin modID is injected to templates-body, and not hardcoded.
- Added "data" and "scripts" props to item MOS obj, that saved on NRCS.
- Added "removeItemsMeta" before saving story to cache. It's clear meta, data and scripts from incoming stories, to avoid cache overload.
- Items-service constructItem() now returns complete full data
- On load, we delete all items from DB.
- On rundown un-monitor - we delete all items and clear their hashmap.
- In developer appConfig there is new config option - keepSqlItems. if it set, we don't delete items from SQL on load and on un-monitor.
- Sql new method: upsertItem - it check if item exists on sql - if it is then updates only story position (rundown story ord), if not exists - write complete item with all data.
Returns {success, event:"create"/"update", assertedUid}
- In Items-service:
* constructItem constructs all props from incoming items (since now we embed them in NRCS).
* Create new item now handles cases when the incoming item not exists in SQL - in this case our SQL upsertItem is inserting the item, returning new uid, then the createNewItem sends sendMosItemReplace request to modify the gfxItem id in NRCS story. This way, we assign to the item new id. 
* sendMosItemReplace with its awaiting to ack mechanism is refactored to separate method (as we call it from 2 places now - createNewItem and handleDuplicate) It accept action param to log what event accrued - Restore or Duplicate.
- On plugin frontend:
* Once the user open item, we get the complete item, including data.
We send this data to "renderItem" func. RenderData then fetch perform HTTP GET to get this item data. If the response.data is "N/A" - that means no such item in SQL. Before 1.3.0, we used to show error popup in this case. Now, we use the data from NRCS, and still render the item. This allow user to open/edit items even if the item don't exist on DA. 
* We removed "save" button from everywhere, since now we are storing complete item data in NRCS. This is concept-change upgrade.



### V 1.2.1

- Removed default option in the plugin opener - productions dropdown.
- Also, plugin fetch the first production templates automatically.
- Plugin saves the result of build-in template __NA_GetValues() - that return all item data. Thats is for the archive search. We save it under "mosExternalMetaDAta/metadata.


### V 1.2.0

- **Implemented the `mosItemReplace` queue mechanism.** We now wait for the `roAck` message from the NRCS before proceeding with the next `mosItemReplace`, ensuring compliance with the core MOS protocol concept.

#### How it works:
- `mosCommands.mosItemReplace` now returns `{ item: {}, messageID }`, where `messageID` is auto-incremented on each call.
- `handleDuplicateItem` in `items-service` sends `mosItemReplace` and **awaits** the new function `waitForRoAck(messageID)`.  
  - `waitForRoAck` listens for the `roAckMessage` event on `mosRouter`.  
  - Once the event is received, `mosRouter` emits the message.  
  - The function then checks if the `roAck` message's `messageID` matches the one we sent and resolves accordingly.  
  - If no event is received within **5 seconds**, it rejects with an error message.  
- `MosRouter` has been refactored into a class, extending `EventEmitter`.  
  - When it receives `msg.mos.roAck`, it emits `roAckMessage`, which is caught by `waitForRoAck`.



### V 1.1.6

- On MOS-Device octopus level: Use "avoid roReplace" - so if user renumber , or resend rundown - it sends replaced stories events instead roReplace.
- Added floating event handling - once the story floated - It send replace command with [SKIP] at storySlug end. We handle it in story constructor.
- Added handling for production assignment based on provided string masks - if rundown name includes one of the mask strings - we give to this rundown mask value (production).
So if we have rundown like "Morning-show-08-02-2025", and mask {"Morning": 10050}, then the rundown will get 10050 production id. 
In case no match was found - rundown will get default production.
User can configure rundown production in config file:

```
    "rundowns": {
        "morning-show": 10004,
        "default":20013
    }

```

### V 1.1.5

- Fixed bug when rundown name is a number - by converting to String on Sql methods.
- On lineup un-monitor - we don't delete items


### V 1.1.4

- Implemented more-detailed log model across the project - each module has its own category ([MOS], [SQL], [STORY] etc..). I need to document log standards. 
- Moved some configuration props to appConfig from config.json user file.

### V 1.1.3

- Modified and checked story REPLACE function - it has complex logic and handle different events within story: New Item, Removed Item, story num/slug change, if not of those is triggered, then we sync items order. The most complex part there is the New item event - since it handles case that user may copy the same item within same story - as a result we get 2 items with same gfxItem id. In tan case we compare the diff by itemID, which is uniq.
- Adapted registerItems function to the replace function changes.

### V 1.1.2

- Project folders rebuild - separate folder for cache modules, separate model files for mos messages, and for cache data structs.
- Numbering folders in hierarchy from low data layers to high business logic.

### V 1.1.1

- Completely new storyReplace logic. The only thing that to handle is what happened when i copy item in same story. TODO - document the replace logic.
- Completely new item-service - now the service has only one entry point - and internal helper functions. 

### V 1.1.0

- Remove un-necessary logging.
- Completely new insert handling logic: The flow is: 
    Received insert event, then: 
    CASE-1: if no target story attached, means the insert is on last position. Then, using getRundownLength from cache we get rundown stories length, and set received length +1 to inserted story, or 0 if the length is 0 (Its first story in empty rundown)
    CASE-2: if target attached, we perform sql fetch to get targets ord assign it to inserted story. Then, to increase order of shifted stories, using getSortedStoriesIdArrByOrd we fetching and increment their orders. 
- Implemented queue logic on roReq commands. Instead fire them in stack, we fire them them one by one, making sure that we received roList, process it, and only then fire the next roReq.
This is the basics in MOS protocol. We need to do the same with mosItemReplace requests. Especially on big data copy/move. This will be next update.
- New SQL methods getStoryOrdByStoryID and modifyBbStoryOrdByStoryID

### V 1.0.7

- Bug: When copy more than 1 story and paste them in lineup, story orders gets wrong.
- what happens to items on un monitor?
- how to assign productions to lineups?
- Some debug logs.



### V 1.0.6

- Implemented delete manager. All Item delete events pass thru this class. 
The `DeleteManager` class provides methods for managing the deletion of items from a database and an in-memory cache. 
It supports both bulk deletions of items associated with a story and single item deletions.
* Once item/story sent to delete - its been disabled immediately.
* Deletions are scheduled with a delay - so if user cut/paste items or stories, we wont loose the data.
* Ensure that the cache and database are properly synchronized to prevent data inconsistencies.

### V 1.0.5 03

- Lot of cleanups. 
- Move all initial and rundowns logic handling to separated "app-processor" module.
- Improved debugging tools - you can set debugMode, showRawMos, and debugFunctions.
- findRoID is moved to utilities separated file.


### V 1.0.5 02

- Middle of event handling - itemsService==>addNewItem done, should debug.

### V 1.0.5 01

- Middle of event handling - itemsService==>addNewItem.

### V 1.0.4

- Implemented duplicate items handling - using itemsHash set we list registered items, once we found item with same gfxId, we copy as new it, get asserted uid and update Octopus item using mosItemReplace.
- Bug: When have copy of the same item in same story - its doesn't works , we need to handle item create event (now we handle only story create / story replace).
- Bug: If i have more than 1 item in story - when delete only one story - its doesn't deletes from sql (storyReplace should also handle this case)
- Overall, mosItemReplace works fantastic, we able to edit items from controller to Octopus. Now is the time to focus on item-events within storyReplace function.
- Object props names that sent from front on save are changed to same names as in sql. 
- Items hash-map set created.
- Separate function in itemsService for register new item and update existing item.
- getFullItem() new method for fetching from SQL item when we register duplicate.

### V 1.0.3

- Changed plugin mode on Octopus to 2.8_Web. Its enables small protocol between plugin and host - and plugin can send messages to host and receive responses.
- Added ncsItemRequest in menu.js - without that host won"t send item data when user opening existing item from story.
- Removed "block" from menu.js - its was implemented in inews, here I don't need this.


### V 1.0.2

- Sends reqMachInfo on connect, and prints the result on console onload.
- Fixed the case when no active rundown in system (roListAll is empty).
- Found the checkbox in octopus that sets "ready" status of items by default (in MOS Objects => Default objAir is READY)


### V 1.0.1

- Handle case when no active rundowns.
- Fixed reorder bug (Now it's working).

### **V 1.0.0**

- All running order actions for stories and items done and checked - INSERT, REPLACE, MOVE, DELETE.
- Well-structured modules.
- Clear action-router-handler-sql-cache-acknowledge flow. 
- Now this is the time to handle duplicated items and try to replace them from the octopus-connect.

### V.0.0.9

- Mos-router separated to it's own service file.
- roMetadataReplace handles rundownSlug change - and in this case update name in ngn_inews_rundowns, and in cache implemented modifyRundownStr that modify rundown name both in this.stories and this.rundownList cache objects.

### V.0.0.8

- Delete story complete. Handles deleted story, deletes it items from SQL, and delete story from cache and SQL. 
Reorders the affected stories (those who was under the deleted one).

### V.0.0.7

- Move story action complete. 

### V.0.0.6

- Created storyMove complex function. Now its updates only the cache, need to update also sql.
- Added new methods to cache module, and also removed some old.
- Adapted application to MOS V.2.8.5 
- Fixed bug that on story modify its not stores story order.
- Added bool property "debug" in appconfig - to disable annoying logs on load.

### V.0.0.5

- Story REPLACE event complete. The strategy is straight&forward for now - overwrite the whole story, including items with replaced story. Thats means all the items order changes handling is included.
- Did you know? You can open terminal in editor area - and then take it out to other screen as separate instance. How did we lived before that?
To create the terminal: Open vs-cmd (cntl+shift+p), and type "create new terminal in editor area" . I also created shortcut to call it (cntl+shift+`)


### V.0.0.4

- Handle roDelete done - deletes from SQL: rundown(rundown not deleted, but disabled), its stories and items (all by rundown uid). The same with cache - complete clear rundown data.

### V.0.0.3

- Added cache-scheme.js to describe data structures.
- Modified handleNewStory (done), with constructStory helper func. All props stored in story obj, so mostly we pass only "story". The inews cache and items service also adapted to this new optimization. 
- Handling new rundowns, new story and new items from roReq and roReqAll done. 

### V.0.0.2

- DB struct change: 
ngn_inews_rundowns ==> added "roID" property [bigint, allows nulls]
ngn_inews_stories ==> deleted "identifier" prop. Renamed "locator" to "storyID" [nvarchar(20)]

- Configured TCP connectors to handle data in UTF-8. So, Octopus must be set to UTF-8 mode - otherwise it won"t work.
- Loads rundowns and its stories to DB. 


### V.0.0.1

- Separated Mos connector for RO and Media MOS ports. 
- Separated Mos-parser module.
- Rewrite Octopus-service into class structure.
- Some cleanups and unnecessary files clears.


## Optimization 

1. Calling function from top-layer modules, that calls async functions must be wrapped with try-catch
2. handleNewStory overwrites complete story, and its items. Its possible to compare incoming story with cache, and update only changes.
3. Handle duplicated stories. This is complex case, when user copy story with item inside the story. As a result, we got 2 identical items with same sqlID, that provided by octopus-connect plugin. The problem is that SQL structure doest allow assign item to more than 1 story id. Therefore, we wont see the copied item in SQL. The solvation will be to handle those cases, and once duplicate item detected, create new item with same data in sql, and send mos command to modify the duplicated item object with new item id. The first step is to test **mosItemReplace** command from MOS profile 3 – Advanced Object Based Workflow. Its allows to modify item that embedded in story, from the MOS client.
4. Check if it possible to avoid using "save", or, using save to store data in sql, **and** update story in one click. Look at the Mos spec "5.3 ActiveX and Web Control Communication messages", there is an section that describes message exchange protocol between ncs and plugin.
5. Why all item in "not ready" state? Check roCtrl - it can be sent from Mos to NCS, and change the "air" status.
6. Why items recognized by NCS as "clips", and not "CG"? 
7. On rundown un-monitor from Octopus - what should happen to items?
8. Re-number
9. Assign production based on rundown name mask.

## MOS message encoding (un-used, since there is an option to use UTF-8 with Octopus):

The supported character encoding is ISO 10646 (Unicode) in UCS-2, as defined in The Unicode Standard, version 2.0. All MOS message contents are transmitted in Unicode, high-order byte first, also known as "big endian."

To convert message, recieved from NCS, we need to swap the buffer byte order in-place , and then encode it to string as little endian:

```
this.client.on('data', (data) => {
    data.swap16().toString('utf16le');
});
```

To send string in UCS-2 big endian we need to convert string to UCS-2 big-endian:

```
Buffer.from(string, 'utf16le').swap16();
```
