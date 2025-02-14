import { readFileSync } from 'fs';

const appConfig =JSON.parse(readFileSync('./config.json', 'utf8'));


// ***************** App Advanced Configuration ***************** //

// App Version
appConfig.version = "1.3.01";

// Express static server port
appConfig.pluginPort = 3000;

appConfig.keepSqlItems = false;

// Debug options
appConfig.debug = {
    mos:0,
    sql:0,
    functions:0,
    showMos:0
}


export default appConfig; 