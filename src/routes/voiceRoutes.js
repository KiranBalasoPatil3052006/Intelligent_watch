const express = require('express');
const router = express.Router();
const voiceController = require('../controllers/voiceController');
const { validate, voiceValidations } = require('../middleware/validation');
const auth = require('../middleware/auth');

// POST /process-voice - Process voice command
router.post('/', auth, validate(voiceValidations), voiceController.processVoice);

module.exports = router;
