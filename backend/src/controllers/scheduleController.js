const { 
    ScheduleGenerator, 
    ScheduleCalculator, 
    ScheduleValidator 
} = require('../services/schedule');
const CourseV2 = require('../models/CourseV2');
const PreferenceV2 = require('../models/PreferenceV2');
const ScheduleV2 = require('../models/ScheduleV2');
const AvailableSectionV2 = require('../models/AvailableSectionV2');

const getCurrentSemester = () => {
    const now = new Date();
    const year = new Date().getFullYear();
    const month = new Date().getMonth() + 1;
    
    // Determine semester
    let semester;
    if (month >= 1 && month <= 5) {
        semester = 2;  // Second semester
    } else if (month >= 6 && month <= 8) {
        semester = 3;  // Summer semester
    } else {
        semester = 1;  // First semester (Sep-Dec)
    }

    // Format as YYYY-S
    const formatted = `${year}-${semester}`;
    
    console.log('Semester determination:', {
        month,
        year,
        semester,
        formatted,
        currentData: '2024-1' // Hardcoded for development
    });

    // During development, return hardcoded value to match data
    return '2024-1';
};

const scheduleController = {
    getCurrentSchedule: async (req, res) => {
        try {
            const latestSchedule = await ScheduleV2.findOne({ 
                studentId: req.student.studentId,
                status: { $in: ['generated', 'accepted'] }
            })
            .sort({ createdAt: -1 })
            .lean();

            if (!latestSchedule) {
                return res.json({
                    success: true,
                    data: null
                });
            }

            // Ensure course names are included
            const courses = await Promise.all(
                latestSchedule.courses.map(async (course) => {
                    if (course.courseName) return course;
                    
                    const fullCourse = await CourseV2.findOne({ courseId: course.courseId });
                    return {
                        ...course,
                        courseName: fullCourse?.courseName || 'Unknown Course'
                    };
                })
            );

            res.json({
                success: true,
                data: {
                    ...latestSchedule,
                    schedule: courses,
                    metrics: latestSchedule.metrics
                }
            });

        } catch (error) {
            console.error('Error in getCurrentSchedule:', error);
            res.status(500).json({
                success: false,
                message: 'Error retrieving current schedule',
                error: error.message
            });
        }
    },

    generateSchedule: async (req, res) => {
        try {
            // 1. Get all required data in parallel
            const [courses, sections, preferences] = await Promise.all([
                CourseV2.find().lean(),
                AvailableSectionV2.findOne().lean(),
                PreferenceV2.findOne({ studentId: req.student.studentId }).lean()
            ]);

            // 2. Validate preferences exist
            if (!preferences) {
                return res.status(400).json({
                    success: false,
                    message: 'Student preferences not found. Please set preferences first.'
                });
            }

            console.log('Starting schedule generation for student:', req.student.studentId);

            // 3. Create lookup map for courses
            const courseMap = new Map();
            courses.forEach(course => {
                if (typeof course.creditHours === 'number') {
                    courseMap.set(course.courseId, course);
                } else {
                    console.warn(`Course ${course.courseId} missing credit hours`);
                }
            });

            // 4. Validate sections data
            if (!sections?.courses?.length) {
                return res.status(400).json({
                    success: false,
                    message: 'No sections available for current semester'
                });
            }

            // 5. Merge course data with sections
            const enrichedSections = {
                ...sections,
                courses: sections.courses.map(section => ({
                    ...section,
                    ...courseMap.get(section.courseId)
                }))
            };

            // 6. Debug logging
            console.log('Data fetch results:', {
                hasPreferences: !!preferences,
                sectionsCount: enrichedSections.courses.length,
                coursesCount: courses.length
            });

            // 7. Create generator
            const generator = new ScheduleGenerator(
                req.student.studentId,
                preferences,
                enrichedSections,
                req.student
            );

            // 8. Generate schedule
            const result = await generator.generateSchedule(courses);

            // 9. Handle result
            if (!result.success) {
                return res.status(400).json(result);
            }

            // Calculate total credit hours from schedule
            const totalCreditHours = result.schedule.reduce((sum, course) => 
                sum + (course.creditHours || 0), 0);

            // Create new schedule with required fields
            const newSchedule = new ScheduleV2({
                studentId: req.student.studentId,
                courses: result.schedule,
                metrics: result.metrics,
                status: 'generated',
                semester: getCurrentSemester(),
                totalCreditHours // Add this field
            });

            // Validate before saving
            const validationError = newSchedule.validateSync();
            if (validationError) {
                return res.status(400).json({
                    success: false,
                    message: 'Schedule validation failed',
                    errors: validationError.errors
                });
            }

            await newSchedule.save();

            res.json({
                success: true,
                data: {
                    schedule: result.schedule,
                    metrics: result.metrics,
                    status: 'generated',
                    totalCreditHours
                }
            });

        } catch (error) {
            console.error('Schedule generation error:', error);
            res.status(500).json({ 
                success: false,
                error: error.message 
            });
        }
    },

    acceptSchedule: async (req, res) => {
        try {
            const schedule = await ScheduleV2.findOneAndUpdate(
                { 
                    studentId: req.student.studentId,
                    status: 'generated'
                },
                { 
                    status: 'accepted',
                    acceptedAt: new Date()
                },
                { new: true }
            );

            if (!schedule) {
                return res.status(404).json({
                    success: false,
                    message: 'No generated schedule found to accept'
                });
            }

            await ScheduleV2.updateMany(
                {
                    studentId: req.student.studentId,
                    _id: { $ne: schedule._id },
                    status: { $in: ['generated', 'accepted'] }
                },
                { status: 'inactive' }
            );

            res.json({
                success: true,
                message: 'Schedule accepted successfully',
                data: schedule
            });

        } catch (error) {
            console.error('Error in acceptSchedule:', error);
            res.status(500).json({
                success: false,
                message: 'Error accepting schedule',
                error: error.message
            });
        }
    },

    rejectSchedule: async (req, res) => {
        try {
            const schedule = await ScheduleV2.findOneAndUpdate(
                { 
                    studentId: req.student.studentId,
                    status: 'generated'
                },
                { 
                    status: 'rejected',
                    rejectedAt: new Date()
                }
            );

            if (!schedule) {
                return res.status(404).json({
                    success: false,
                    message: 'No generated schedule found to reject'
                });
            }

            res.json({
                success: true,
                message: 'Schedule rejected successfully'
            });

        } catch (error) {
            console.error('Error in rejectSchedule:', error);
            res.status(500).json({
                success: false,
                message: 'Error rejecting schedule',
                error: error.message
            });
        }
    }
};

module.exports = scheduleController;