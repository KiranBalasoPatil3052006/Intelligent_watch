const express = require('express');
const router = express.Router();
const summaryController = require('../controllers/summaryController');
const auth = require('../middleware/auth');

// GET /summary - Get daily summary
router.get('/', auth, summaryController.getSummary);

// GET /summary/week - Get weekly summary
router.get('/week', auth, summaryController.getWeeklySummary);

module.exports = router;
