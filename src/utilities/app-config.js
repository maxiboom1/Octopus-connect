import { readFileSync } from 'fs';

const appConfig =JSON.parse(readFileSync('./config.json', 'utf8'));

appConfig.version = "1.1.0";

export default appConfig;