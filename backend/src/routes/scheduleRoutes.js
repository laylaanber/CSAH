// src/routes/scheduleRoutes.js
const express = require('express');
const router = express.Router();
const scheduleController = require('../controllers/scheduleController');
const { authMiddleware } = require('../middleware/authMiddleware');
const AvailableSectionV2 = require('../models/AvailableSectionV2'); // Add this import

/**
 * Schedule Management Routes
 * Base path: /api/schedules
 */

// Get available sections
// GET /api/schedules/sections
router.get('/sections', async (req, res) => {
  try {
    const availableSections = await AvailableSectionV2.findOne({ 
      semester: '2024-1' // Current semester
    }).lean();

    console.log('Available sections found:', !!availableSections);
    console.log('Number of courses with sections:', availableSections?.courses?.length);

    // Transform data structure to match frontend expectations
    const formattedSections = availableSections?.courses || [];
    
    console.log('Sample section data:', formattedSections[0]); // Debug first course

    res.json({
      success: true,
      data: {
        sections: formattedSections
      }
    });
  } catch (error) {
    console.error('Sections fetch error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching sections'
    });
  }
});

// Protected routes - all require authentication
router.use(authMiddleware);

/**
 * Schedule Management Routes
 * Base path: /api/schedules
 */

// Get current active schedule
// GET /api/schedules/current
router.get('/current', scheduleController.getCurrentSchedule);

// Generate a new schedule
// POST /api/schedules/generate
router.post('/generate', scheduleController.generateSchedule);

// Accept a generated schedule
// POST /api/schedules/accept
router.post('/accept', scheduleController.acceptSchedule);

// Reject a generated schedule
// POST /api/schedules/reject
router.post('/reject', scheduleController.rejectSchedule);

module.exports = router;