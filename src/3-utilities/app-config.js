import { readFileSync } from 'fs';

const appConfig =JSON.parse(readFileSync('./config.json', 'utf8'));


// ***************** App Advanced Configuration ***************** //

// App Version
appConfig.version = "1.1.4";

// Express static server port
appConfig.pluginPort = 3000;

// MOS ports [defaults is 10540,10541]
appConfig.mediaPort = 10540;
appConfig.rundownPort = 10541;

// Debug options
appConfig.debug = {
    mos:0,
    sql:0,
    functions:0,
    rawMos:0
}


export default appConfig; 