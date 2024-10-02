import express from "express";
import sqlService from "../services/sql-service.js";
import inewsCache from "../1-dal/inews-cache.js";
import itemsService from "../services/items-service.js";
import itemsHash from "../1-dal/items-hashmap.js";

const router = express.Router();

// Get http://serverAddr:4001/api/productions
router.get('/productions', async (req, res) => {
  const productions = await inewsCache.getProductionsArr();
  res.json(productions);
});

// Get http://serverAddr:4001/api/templates
router.get('/templates/:uid', async (req, res) => {
  const productionUid = req.params.uid;
  const templates = await inewsCache.getTemplatesByProduction(productionUid);
  res.json(templates);
});

// Get http://serverAddr:4001/api/get-item-data
router.get('/get-item-data/:uid', async (req, res) => {
  const itemUid = req.params.uid;
  const itemData = await sqlService.getItemData(itemUid);
  res.json(itemData);
});

// Post http://serverAddr:4001/api/set-item
router.post('/set-item', async (req, res) => {
  try {
      const item = req.body;
      const templateUid = await sqlService.storeNewItem(item);
      res.json(templateUid);
  } catch (error) {
      console.error('Error processing JSON data:', error);
      res.status(400).json("Error processing JSON data");
  }
});

// Post http://serverAddr:4001/api/update-item
router.post('/update-item', async (req, res) => {
  try {
      const item = req.body;
      await sqlService.updateItemFromFront(item);
      await itemsService.updateDuplicates(item);
      res.json("");
  } catch (error) {
      console.error('Error processing JSON data:', error);
      res.status(400).json("Error processing JSON data");
  }
});

// Get http://serverAddr:4001/api/getdata
router.get('/getdata', async (req, res) => {
  const data = await inewsCache.getData();
  res.json(data);
});

export default router;