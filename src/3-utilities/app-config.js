import { readFileSync } from 'fs';

const appConfig =JSON.parse(readFileSync('./config.json', 'utf8'));


// ***************** App Advanced Configuration ***************** //

// App Version
appConfig.version = "1.2.1";

// Express static server port
appConfig.pluginPort = 3000;

// Debug options
appConfig.debug = {
    mos:0,
    sql:0,
    functions:0,
    showMos:0
}


export default appConfig; 