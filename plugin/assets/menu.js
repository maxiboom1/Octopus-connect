const originUrl = window.location.origin;
document.getElementById('productionSelector').addEventListener('change', getTemplates);
var iframe = document.getElementById('contentIframe');
var blocked = false;
let productionsData = [];
// ******************************************* Menu functions *******************************************

async function getProductions() {
    const url = `${originUrl}/api/productions`; 
    const productions = await fetchData(url, 'GET', null);
    productionsData = productions;
    const productionSelector = document.getElementById('productionSelector');
    productions.forEach(function(production) {
        var option = document.createElement('option');
        option.value = production.uid;
        option.text = production.name;
        productionSelector.add(option);
    });
}

async function getTemplates() { 
    const productionUid = document.getElementById('productionSelector').value;
    if (productionUid === "") return;
    const url = `${originUrl}/api/templates/${productionUid}`;
    const templates = await fetchData(url, 'GET', null);
    const templatesContainer = document.getElementById('scenesAccordion');
    templatesContainer.innerHTML = '';

    // Get chosen production data object
    const production = productionsData.find(p => p.uid === productionUid);
    
    // Create accordionItem for each production scene with unique IDs
    production.scenes.forEach((scene, sceneCounter) => {
        const sceneAccordion = createAccordionItem(scene.name, scene.folders, templates, sceneCounter,scene.color);
        templatesContainer.appendChild(sceneAccordion);
    });
}

function createAccordionItem(sceneName, folders, templates, sceneCounter, sceneColor) {
    const sceneAccordion = document.createElement('div');
    sceneAccordion.className = 'accordion-item';
    sceneAccordion.className = 'dark';

    // Determine the background color class based on sceneColor
    let colorClass = '';
    switch(sceneColor) {
        case 1:
            colorClass = 'dark-red';
            break;
        case 2:
            colorClass = 'dark-green';
            break;
        case 3:
            colorClass = 'dark-blue';
            break;
        default:
            colorClass = 'no-color';
    }
    //sceneAccordion.classList.add(colorClass);

    const sceneId = `scene-${sceneCounter}`;
    const sceneAccordionItem = `
    <h2 class="accordion-header">
      <button class="accordion-button ${colorClass}" type="button" 
        data-bs-toggle="collapse" 
        data-bs-target="#${sceneId}" 
        aria-expanded="false" aria-controls="${sceneId}">
        ${sceneName}
      </button>
    </h2>
    <div id="${sceneId}" class="accordion-collapse collapse" >
      <div class="accordion-body">
        <div class="accordion foldersAccordion" id="folders-${sceneId}">
          <!-- Folders accordion will be injected here -->
        </div>
      </div>
    </div>
    `;
    sceneAccordion.innerHTML = sceneAccordionItem;

    // Inject folder accordions with unique IDs
    const folderAccordionContainer = sceneAccordion.querySelector(`#folders-${sceneId}`);
    folders.forEach((folder, folderCounter) => {
        const folderAccordion = createFolderAccordionItem(folder.name, templates, sceneId, folderCounter, folder);
        folderAccordionContainer.appendChild(folderAccordion);
    });

    return sceneAccordion;
}

function createFolderAccordionItem(folderName, templates, sceneId, folderCounter, folder) {
    const folderAccordion = document.createElement('div');
    folderAccordion.className = 'accordion-item';
    folderAccordion.className = 'dark';

    
    const folderId = `${sceneId}-folder-${folderCounter}`;
    const folderAccordionItem = `
    <h2 class="accordion-header">
      <button class="accordion-button collapsed" type="button" 
        data-bs-toggle="collapse" 
        data-bs-target="#${folderId}" 
        aria-expanded="false" aria-controls="${folderId}">
        ${folderName}
      </button>
    </h2>
    <div id="${folderId}" class="accordion-collapse collapse">
      <div class="accordion-body row mb-3 justify-content-left">
        <!-- Templates will be injected here -->
      </div>
    </div>`;
    
    folderAccordion.innerHTML = folderAccordionItem;

    // Filter and inject templates based on folder.itemUids
    const templatesContainer = folderAccordion.querySelector('.accordion-body');
    folder.itemUids.forEach(itemUid => {
        const template = templates.find(template => template.uid === itemUid.toString());
        if (template) {
            const templateElement = createTemplateHtml(template);
            templateElement.addEventListener('click', () => renderTemplate(templateElement.id));
            templatesContainer.appendChild(templateElement);
        }
    });

    return folderAccordion;
}

function createTemplateHtml(template){
    const container = document.createElement('div'); // Create a temporary container
    if(template.icon){
        container.innerHTML = `
        <div id=${template.uid} class="col-1 m-3 themed-grid-col">
            <img src='data:image/png;base64,${template.icon}' alt='Template Icon'>
        </div>`;
    } else {
        container.innerHTML = `
        <div id=${template.uid} class="col-1 themed-grid-col">
        ${template.name}
        </div>`;
    }

    // Return the first child of the container
    return container.firstElementChild;
}

// ******************************************* Comm with inews wrapper logics *******************************************

async function mosMsgFromHost(event) {
    if(blocked) return;
    var message = event.data;
    if (event.origin != getNewsroomOrigin()) { 
        return; 
    }
    
    // User opened item 
    if (message.indexOf('<ncsItem>') !== -1){
        blocked = true;
        setTimeout(()=>{blocked = false;},50);
        const templateId = extractTagContent(message, "gfxTemplate");
        const gfxItem = extractTagContent(message, "gfxItem");
        const itemID = extractTagContent(message, "itemID");
        renderItem(templateId, gfxItem,itemID);
    }
    
    // User click apply/ok
    // we should get from iframe  
    if (message.indexOf('<ncsItemRequest/>') !== -1){
        const values = iframe.contentWindow.getItemData();
        values.gfxItem = iframe.contentWindow.getGfxItem();
        await fetchData(`${originUrl}/api/update-item`, "POST", JSON.stringify(values));
        const updatedMosMsg = iframe.contentWindow.createMosMessage();
        event.source.postMessage(updatedMosMsg, event.origin);
        console.log("got item request. Collected data from iframe: ", values);
    }

}

// ******************************************* Iframe logic  *******************************************

// User open template new template in plugin menu
function renderTemplate(templateId) {
    let url = `${originUrl}/templates/${templateId}.html`;
    const spinner = document.getElementById('full-screen-spinner');
    const iframe = document.getElementById('contentIframe');
    
    spinner.style.visibility = "visible";
    
    let iframeLoaded = false;
    let minTimeElapsed = false;
    
    // Function to check if both conditions are met
    function checkAndHideSpinner() {
        if (iframeLoaded && minTimeElapsed) {
            iframe.style.display = 'block';
            try {iframe.contentWindow.selectFirstTextField();}catch{}
            spinner.style.visibility = "hidden";
        }
    }
    
    // Set iframe source and onload handler
    iframe.src = url;  
    iframe.onload = function() {
        iframeLoaded = true;
        iframe.contentWindow.setNameOnLoad();
        checkAndHideSpinner();
    };
    
    // Set timeout for minimum spinner display time
    setTimeout(() => {
        minTimeElapsed = true;
        checkAndHideSpinner();
    }, 500);
}

// User loaded exists item in inews
async function renderItem(templateId,gfxItem, itemID){
    const itemObj = await fetchData(`${originUrl}/api/get-item-data/${gfxItem}`, "GET");
    const itemData = itemObj.data.replace(/\\'/g, '%27'); // Fix " ' " single quote bug
    const itemName = itemObj.name;

    if(itemData !== "N/A"){
        let url = `${originUrl}/templates/${templateId}.html`;
        const iframe = document.getElementById('contentIframe');
        iframe.src = url; // Set the source of the iframe to the URL  
        
        iframe.onload = function() {
    
            try {
                // Set item values in template
                iframe.contentWindow.__NA_SetValues(itemData);   
            } catch (error) {
                console.log("Failed to complete __NA_SetValues", error);
            }

            // Set item values
            iframe.contentWindow.setGfxItem(gfxItem); // Set gfxItemId in iframe head as "data-gfxitem"
            iframe.contentWindow.setItemID(itemID); // Set itemID in iframe head as "data-itemID"
            iframe.contentWindow.nameInputUpdate(itemName,true);
            // Show iframe
            iframe.style.display = 'block'; // Show the iframe
            iframe.contentWindow.selectFirstTextField();
            
        };
    } else {
        showPopup(`Error! This element was deleted. Close this window and delete the element from Inews story`);
        document.getElementById("productionContainer").style.display = "none";
    }

}

// Iframe calls that when user click "back"
function hideIframe() {
    document.getElementById('contentIframe').style.display = 'none';
}

// ******************************************* Utility functions *******************************************

function getNewsroomOrigin() {
    var qs = document.location.search.split("+").join(" ");
    var params = {};
    var regex = /[?&]?([^=]+)=([^&]*)/g;
    while (tokens = regex.exec(qs)) {
        params[decodeURIComponent(tokens[1])] = decodeURIComponent(tokens[2]);
    }
    return params['origin'];
}

function extractTagContent(xmlString, tagName) {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlString, "text/xml");
      const tagElement = xmlDoc.querySelector(tagName);
  
      if (tagElement !== null) {
        return tagElement.textContent;
      } else {
        return null;
      }
    } catch (error) {
      return null;
    }
}

async function fetchData(url, method, msg) {
    try {
        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: msg,
        });

        if (response.ok) {
            const data = await response.json();
            return data;
        } else {
            console.error(`Failed to ${method} data at URL: ${url}`);
        }
    } catch (error) {
        console.error(`Error while fetching data at URL: ${url}`, error);
    }
}

function print(msg){console.log(msg)}

function showPopup(message, delay=undefined) {
    var popup = document.getElementById("popup");
    popup.innerHTML = message;
    popup.style.display = "block";
  
    if(delay){
        setTimeout(function() {
            popup.style.display = "none";
          }, delay); 
    }
    
  };

// Communication listeners with inews
if (window.addEventListener) {
    window.addEventListener('message', mosMsgFromHost, false);
} else if (window.attachEvent) {
    console.log("window.attachEvent");
    window.attachEvent('onmessage', mosMsgFromHost, false);
}
getProductions();
