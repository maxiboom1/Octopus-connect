import { readFileSync } from 'fs';

const appConfig =JSON.parse(readFileSync('./config.json', 'utf8'));

appConfig.version = "1.0.5 Rev.3";

export default appConfig;