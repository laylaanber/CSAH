// controllers/preferenceController.js
const PreferenceV2 = require('../models/PreferenceV2');
const CourseV2 = require('../models/CourseV2');

const preferenceController = {
    // Get current preferences for authenticated student
    getPreferences: async (req, res) => {
        try {
            const studentId = req.student.studentId;
            const preferences = await PreferenceV2.findOne({ studentId });

            if (!preferences) {
                return res.json({
                    success: true,
                    data: null,
                    message: "No preferences set yet"
                });
            }

            // If student wants to improve grades, fetch course details
            if (preferences.coursesToImprove?.length > 0) {
                const improvementCourses = await CourseV2.find({
                    courseId: { $in: preferences.coursesToImprove }
                }).select('courseId courseName');
                
                preferences.coursesToImproveDetails = improvementCourses;
            }

            res.json({
                success: true,
                data: preferences
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: "Error retrieving preferences",
                error: error.message
            });
        }
    },

    // Save or update student preferences
    savePreferences: async (req, res) => {
        try {
            const studentId = req.student.studentId;
            const {
                preferredDays,
                preferBreaks,
                targetCreditHours,
                specificCourses,
                coursesToImprove,
                categoryPreferences
            } = req.body;

            // Validate preferences
            if (targetCreditHours < 12 || targetCreditHours > 18) {
                return res.status(400).json({
                    success: false,
                    message: "Credit hours must be between 12 and 18"
                });
            }

            if (!['sun_tue_thu', 'mon_wed', 'daily', 'idc'].includes(preferredDays)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid preferred days selection"
                });
            }

            if (!['yes', 'no', 'idc'].includes(preferBreaks)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid break preference"
                });
            }

            // Validate category preferences
            const validRatings = ['prefer', 'neutral', 'dislike'];
            const categories = ['networking', 'hardware', 'software', 'electrical'];
            
            for (const category of categories) {
                if (categoryPreferences[category] && 
                    !validRatings.includes(categoryPreferences[category])) {
                    return res.status(400).json({
                        success: false,
                        message: `Invalid rating for ${category}`
                    });
                }
            }

            // Verify specific courses exist and are available
            if (specificCourses?.length > 0) {
                const coursesExist = await CourseV2.countDocuments({
                    courseId: { $in: specificCourses }
                });

                if (coursesExist !== specificCourses.length) {
                    return res.status(400).json({
                        success: false,
                        message: "One or more selected courses do not exist"
                    });
                }
            }

            // Save or update preferences
            const preferences = await PreferenceV2.findOneAndUpdate(
                { studentId },
                {
                    studentId,
                    preferredDays,
                    preferBreaks,
                    targetCreditHours,
                    specificCourses: specificCourses || [],
                    coursesToImprove: coursesToImprove || [],
                    categoryPreferences
                },
                { new: true, upsert: true }
            );

            res.json({
                success: true,
                message: "Preferences saved successfully",
                data: preferences
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: "Error saving preferences",
                error: error.message
            });
        }
    },

    // Get available courses for improvement
    getImprovementOptions: async (req, res) => {
        try {
            const studentId = req.student.studentId;
            
            // Get student's passed courses with grades D+ or lower
            const passedCourses = req.student.passedCourses || [];
            const improvableCourses = passedCourses.filter(course => 
                ['F', 'D-', 'D', 'D+'].includes(course.grade)
            );

            // Fetch full course details for these courses
            const courseDetails = await CourseV2.find({
                courseId: { $in: improvableCourses.map(c => c.courseId) }
            }).select('courseId courseName description subCategory');

            // Combine grade information with course details
            const improvementOptions = courseDetails.map(course => ({
                ...course.toObject(),
                currentGrade: improvableCourses.find(c => 
                    c.courseId === course.courseId
                ).grade
            }));

            res.json({
                success: true,
                data: improvementOptions
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: "Error retrieving improvement options",
                error: error.message
            });
        }
    }
};

module.exports = preferenceController;