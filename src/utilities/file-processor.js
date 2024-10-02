import { promises as fsPromises } from 'fs';
import path from "path";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { JSDOM } from 'jsdom';
import appConfig from './app-config.js';
import logger from "../utilities/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** 
 * Gets templates array @param templates. Takes template.source and injects scripts, css link and plugin panel.
 * Then, we store modified HTML in plugin/assets/templates, as [template.name].html.
 * Delete template.source from template. 
 * @return templates array without source prop.
 */
async function processAndWriteFiles(templates) {
    
    const templatesFolder = path.resolve(__dirname, "../../plugin/templates");
    try {
        await fsPromises.access(templatesFolder);
    } catch (error) {
        await fsPromises.mkdir(templatesFolder);
    }

    for (const template of templates) {
        const { uid, source, name, production } = template;
        const injectedHtml = htmlWrapper(source,uid, production,name);
        const filePath = path.join(templatesFolder, `${uid}.html`);
        await fsPromises.writeFile(filePath, injectedHtml, 'utf-8');
        delete template.source;
        logger(`Loaded ${name} template`);
    }

    return templates;
}

function htmlWrapper(htmlContent,templateUid, productionUid, templateName) {
    
    const dom = new JSDOM(htmlContent);
    const document = dom.window.document;
    const scriptFileName = "../assets/iframe.js";

    const scriptTag = document.createElement('script');
    scriptTag.src = scriptFileName;

    // Create style tag to link external CSS file
    const styleTag = document.createElement('link');
    styleTag.rel = 'stylesheet';
    styleTag.href = "../assets/iframe.css";

    const pluginPanelDiv = createPluginPanel(document);
    const toolboxContentDiv = document.querySelector('.toolbox-title');

    if (toolboxContentDiv) {
        toolboxContentDiv.appendChild(pluginPanelDiv);
    } else {
        document.body.appendChild(pluginPanelDiv);
    }
    document.body.appendChild(createFavoritesDiv(document));
    document.body.appendChild(scriptTag);
    document.head.appendChild(styleTag);
    document.body.setAttribute('data-template', templateUid);  
    document.body.setAttribute('data-production', productionUid);   

    // Add static category name in item name
    if(appConfig.addItemCategoryName){
        document.body.setAttribute('data-template-name', templateName.replace("%S%",""));     
    } else {
        document.body.setAttribute('data-template-name', "");     
    }
  
    return dom.serialize();
}

function createPluginPanel(document) {
    
    // Back button
    const backButton = createButton(document,"button","Back","navigateBack","pluginPanelBtn");
    
    // Save button
    const saveButton = createButton(document,"button","Save","save","pluginPanelBtn");
    
    //Create Reset btn
    const previewButton = createButton(document,"button","Reset Preview","preview","pluginPanelBtn");
    previewButton.setAttribute("data-preview-host", appConfig.previewServer);
    previewButton.setAttribute("data-preview-port", appConfig.previewPort);

    // Create drag btn
    const dragButton = createButton(document,"button","Drag","drag","pluginPanelBtn");
    dragButton.draggable = true;
    
    // Create Link btn
    const linkButton = createButton(document,"button","Favorites","linkButton","pluginPanelBtn");
    
    // Create div with id "pluginPanel"
    const pluginPanelDiv = document.createElement('div');
    pluginPanelDiv.id = 'pluginPanel';
    pluginPanelDiv.classList.add('pluginPanel'); // Add the class to the pluginPanel div

    // Append buttons to the "pluginPanel" div
    pluginPanelDiv.appendChild(backButton);
    pluginPanelDiv.appendChild(saveButton);
    pluginPanelDiv.appendChild(dragButton);
    pluginPanelDiv.appendChild(previewButton);
    pluginPanelDiv.appendChild(linkButton);
    // Create label
    const nameLabel = document.createElement('label');
    nameLabel.textContent = 'Name';
    nameLabel.setAttribute('for', 'nameInput'); // This should match the id of the input it labels
    
    // Create input field
    const nameInput = document.createElement('input');
    nameInput.id = 'nameInput';
    nameInput.name = 'name'; // 'name' attribute for form submission

    // Append label and input to the "pluginPanel" div
    pluginPanelDiv.appendChild(nameLabel);
    pluginPanelDiv.appendChild(nameInput);

    return pluginPanelDiv;
}

function createButton(document,element,text,id,classList){
    const button = document.createElement(element);
    button.textContent  = text;
    button.id = id;
    button.classList.add(classList); 
    return button;
}

function createFavoritesDiv(document){
    const popupDiv = document.createElement('div');
    popupDiv.id = 'pluginPopover';
    popupDiv.setAttribute("data-modifier", appConfig.favoritesModifier);
    popupDiv.classList.add('pluginPopover');
    const favorites = appConfig.favorites;
    favorites.forEach(favorite => {
        const button = document.createElement('button');
        button.id = favorite.id;
        button.classList.add('linksButton');
        button.textContent = favorite.name;
        button.setAttribute("data-key",favorite.key);
        popupDiv.appendChild(button);
    });

    return popupDiv;
}

export default processAndWriteFiles;
