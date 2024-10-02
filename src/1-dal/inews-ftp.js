import Inews from '../0-inews-plugin/InewsClient.js';
import appConfig from '../utilities/app-config.js';

async function Conn(){
    return new Inews({ ...appConfig.conn });;
}

const conn = await Conn();

export default conn;