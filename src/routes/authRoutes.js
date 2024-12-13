// src/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', authController.logout); // No middleware needed

// Protected routes
router.get('/profile', protect, authController.getProfile);
router.post('/passed-courses', protect, authController.updatePassedCourses);

module.exports = router;