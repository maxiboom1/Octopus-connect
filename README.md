
# Octopus-connect

## Description

Connects to octopus NRCS server using MOS protocol. Provide GFX plugin. Based on "Inews-connect" repo. The main dif, is that while in Inews-connect the transport protocol was FTP, in this project we setup connection to MOS-enabled NRCS.

## Change-log

### V 1.0.2

- Sends reqMachInfo on connect, and prints the result on console onload.
- Fixed the case when no active rundown in system (roListAll is empty).


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
