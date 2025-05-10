const express = require('express');
const router = express.Router();
const fileRoutes = require('./fileRoutes');

// Define your routes here
router.get('/status', (req, res) => {
  res.json({ status: 'ok' });
});

// Use file routes
router.use('/files', fileRoutes);

module.exports = router; 