const ScheduleGenerator = require('../services/scheduleService');
const CourseV2 = require('../models/CourseV2');
const PreferenceV2 = require('../models/PreferenceV2');
const ScheduleV2 = require('../models/ScheduleV2');
const AvailableSectionV2 = require('../models/AvailableSectionV2');

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

            const courses = await Promise.all(
                latestSchedule.courses.map(async (course) => {
                    const fullCourse = await CourseV2.findOne({ courseId: course.courseId });
                    if (!fullCourse) return course;

                    return {
                        ...course,
                        courseName: fullCourse.courseName,
                        creditHours: fullCourse.creditHours,
                        description: fullCourse.description,
                        subCategory: fullCourse.subCategory,
                        details: fullCourse.details
                    };
                })
            );

            res.json({
                success: true,
                data: {
                    ...latestSchedule,
                    schedule: courses
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
            const student = req.student;
            
            // Get preferences
            const preferences = await PreferenceV2.findOne({ studentId: student.studentId });
            if (!preferences) {
                return res.status(400).json({
                    success: false,
                    message: 'Please set your preferences before generating a schedule'
                });
            }
    
            // Get available sections
            const availableSections = await AvailableSectionV2.findOne();
            if (!availableSections) {
                return res.status(400).json({
                    success: false,
                    message: 'No available sections found for current semester'
                });
            }
    
            // Get all courses with complete details
            const availableCourses = await CourseV2.find({}).lean();
            console.log('Total available courses:', availableCourses.length);
    
            const generator = new ScheduleGenerator(student.studentId, preferences, availableSections, student);
            const result = await generator.generateSchedule(availableCourses);
    
            if (!result.success) {
                return res.status(400).json({
                    success: false,
                    message: result.message
                });
            }
    
            // No need to enrich schedule here as it's already complete
            const schedule = new ScheduleV2({
                studentId: student.studentId,
                semester: `${new Date().getFullYear()}-${Math.floor(new Date().getMonth() / 6) + 1}`,
                totalCreditHours: result.metrics.totalCreditHours,
                courses: result.schedule,
                difficultyMetrics: {
                    totalDifficultyScore: result.metrics.difficultyScore,
                    balanceScore: result.metrics.balanceScore,
                    categoryDistribution: result.metrics.categoryDistribution
                },
                status: 'generated'
            });
    
            await schedule.save();
    
            res.json({
                success: true,
                data: {
                    schedule: result.schedule,
                    metrics: result.metrics,
                    status: 'generated'
                }
            });
    
        } catch (error) {
            console.error('Error in generateSchedule:', error);
            res.status(500).json({
                success: false,
                message: 'Error generating schedule',
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