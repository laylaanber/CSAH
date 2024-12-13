// routes/preferenceRoutes.js
const express = require('express');
const router = express.Router();
const preferenceController = require('../controllers/preferenceController');
const { authMiddleware } = require('../middleware/authMiddleware');

// Get and save student preferences
router.get('/', authMiddleware, preferenceController.getPreferences);
router.post('/', authMiddleware, preferenceController.savePreferences);

// Get courses available for grade improvement
router.get('/improvement-options', authMiddleware, preferenceController.getImprovementOptions);

module.exports = router;