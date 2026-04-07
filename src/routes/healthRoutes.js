const express = require('express');
const router = express.Router();
const healthController = require('../controllers/healthController');
const auth = require('../middleware/auth');

// POST /health/water - Set water reminder
router.post('/water', auth, healthController.setWaterReminder);

// POST /health/activity - Set activity reminder
router.post('/activity', auth, healthController.setActivityReminder);

// POST /health/wakeup - Set wake-up alarm
router.post('/wakeup', auth, healthController.setWakeUp);

// POST /health/diet - Set diet reminder
router.post('/diet', auth, healthController.setDietReminder);

// GET /health/settings - Get health settings
router.get('/settings', auth, healthController.getSettings);

// DELETE /health/wakeup/:index - Delete wake-up alarm
router.delete('/wakeup/:index', auth, healthController.deleteWakeUp);

module.exports = router;
