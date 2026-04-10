const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// POST /auth/signup — Create new account
router.post('/signup', authController.signup);

// POST /auth/login — Login
router.post('/login', authController.login);

module.exports = router;
