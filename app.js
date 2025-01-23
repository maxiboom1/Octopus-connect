import express from "express";
import cors from "cors";
import getServerIP from "./src/utilities/host-ip.js";
import bodyParser from 'body-parser';
import logger from "./src/utilities/logger.js";
import routes from "./src/routes/routes.js";
import appProcessor from "./src/services/app-processor.js";
const app = express(); 

app.use(cors({origin: '*'}));

// Increase payload size limit to 50MB
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use("/api",routes);

// Static server http://localhost:3000/plugin
app.use(express.static('plugin')); 

// Start the Express server
const port = 3000;
app.listen(port, () => {
    const host = getServerIP();
    logger(`Server started. Plugin url: http://${host}:${port}/index.html`)
    appProcessor.initialize();
});