// src/routes/courseRoutes.js
const express = require('express');
const router = express.Router();
const courseController = require('../controllers/courseController');
const { authMiddleware } = require('../middleware/authMiddleware'); // Add this import

// Add some console logs to help us track route registration
console.log('Registering course routes...');

router.get('/', courseController.getAllCourses);

console.log('Course routes registered');

router.get('/available', courseController.getAvailableCourses);

router.get('/progress', authMiddleware, courseController.getStudentProgress);

module.exports = router;