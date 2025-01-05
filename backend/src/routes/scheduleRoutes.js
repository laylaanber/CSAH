// src/routes/scheduleRoutes.js
const express = require('express');
const router = express.Router();
const scheduleController = require('../controllers/scheduleController');
const { authMiddleware } = require('../middleware/authMiddleware');
const AvailableSectionV2 = require('../models/AvailableSectionV2');
const PreferenceV2 = require('../models/PreferenceV2');
const CourseV2 = require('../models/CourseV2');
//const ScheduleGenerator = require('../services/scheduleService');
const { ScheduleGenerator } = require('../services/schedule');

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

// Add after existing routes
router.post('/regenerate', authMiddleware, async (req, res) => {
    try {
        const { feedback } = req.body;
        const student = req.student;

        // Enhanced feedback validation
        if (!feedback) {
            return res.status(400).json({
                success: false,
                message: 'Feedback is required'
            });
        }

        // Validate each feedback property with detailed errors
        const requiredFeedback = {
            dayPreference: ['high', 'normal', 'low'],
            breakPreference: ['longer', 'shorter', 'no_preference'],
            difficultyRating: ['too_hard', 'good', 'too_easy'],
            labPreference: ['more', 'less', 'good']
        };

        for (const [key, validValues] of Object.entries(requiredFeedback)) {
            if (!feedback[key] || !validValues.includes(feedback[key])) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid ${key}. Must be one of: ${validValues.join(', ')}`
                });
            }
        }

        // Get data with error handling
        const [preferences, availableSections, availableCourses] = await Promise.all([
            PreferenceV2.findOne({ studentId: student.studentId }),
            AvailableSectionV2.findOne(),
            CourseV2.find().lean()
        ]);

        // Validate required data
        if (!preferences || !availableSections?.courses?.length || !availableCourses?.length) {
            return res.status(400).json({
                success: false,
                message: 'Missing required data for schedule generation'
            });
        }

        // Create generator with feedback and debug logging
        console.log('Regenerating schedule with feedback:', feedback);
        
        const generator = new ScheduleGenerator(
            student.studentId,
            preferences,
            availableSections, 
            student,
            feedback
        );

        // Generate and validate new schedule
        const result = await generator.generateSchedule(availableCourses);

        res.json({
            success: true,
            data: {
                schedule: result.schedule,
                metrics: result.metrics,
                adjustedPreferences: {
                    dayPreference: feedback.dayPreference,
                    breakPreference: feedback.breakPreference,
                    difficultyRating: feedback.difficultyRating,
                    labPreference: feedback.labPreference
                }
            }
        });

    } catch (error) {
        console.error('Schedule regeneration error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;