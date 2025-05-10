const express = require('express');
const router = express.Router();
const fileController = require('../controllers/fileController');

// Route for uploading a file and getting sheet names
router.post('/upload', fileController.upload.single('file'), fileController.uploadFile);

// Route for getting data from a specific sheet in an uploaded file
router.post('/sheet-data', fileController.getSheetData);

module.exports = router; 