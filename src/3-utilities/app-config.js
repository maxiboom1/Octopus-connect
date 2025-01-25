import { readFileSync } from 'fs';

const appConfig =JSON.parse(readFileSync('./config.json', 'utf8'));

appConfig.version = "1.1.3";

export default appConfig; 