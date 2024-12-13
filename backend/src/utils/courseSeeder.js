// utils/courseSeeder.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const CourseV2 = require('../models/CourseV2');
const { validateCourseData, printValidationReport } = require('./courseValidator');

async function seedCourses(coursesData) {
    try {
        console.log('Validating course data...');
        const validationResults = validateCourseData(coursesData);
        printValidationReport(validationResults);

        // Log MongoDB URI (masked for security)
        const uri = process.env.MONGODB_URI;
        console.log('\nMongoDB URI exists:', !!uri);
        if (!uri) {
            throw new Error('MongoDB URI not found in environment variables');
        }

        // Connect to MongoDB
        console.log('\nConnecting to MongoDB...');
        await mongoose.connect(uri);
        console.log('Successfully connected to MongoDB');

        // Clear existing courses
        console.log('Clearing existing courses...');
        await CourseV2.deleteMany({});

        // Process course data before insertion
        console.log('Processing and inserting courses...');
        const processedCourses = coursesData.map(course => ({
            courseId: course.courseId,
            courseName: course.courseName,
            description: course.description,
            prerequisites: course.prerequisites || [],
            creditHours: course.creditHours,
            gradeType: course.gradeType,
            specialRule: course.specialRule,
            subCategory: course.subCategory,
            details: course.details ? {
                isLab: course.details.isLab || false,
                numProjects: course.details.numProjects || 0,
                numQuizzes: course.details.numQuizzes || 0,
                numAssignments: course.details.numAssignments || 0,
                numCertificates: course.details.numCertificates || 0,
                examType: course.details.examType || 'mid-final'
            } : undefined
        }));

        // Insert courses
        const insertedCourses = await CourseV2.insertMany(processedCourses);
        
        // Generate summary statistics
        const summary = {
            totalInserted: insertedCourses.length,
            byDescription: {},
            withSubCategories: insertedCourses.filter(c => c.subCategory).length,
            withDetails: insertedCourses.filter(c => c.details).length,
            withPrerequisites: insertedCourses.filter(c => c.prerequisites.length > 0).length
        };

        // Count by description
        insertedCourses.forEach(course => {
            summary.byDescription[course.description] = 
                (summary.byDescription[course.description] || 0) + 1;
        });

        console.log('\nSeeding Summary:');
        console.log('===============');
        console.log(`Total Courses Inserted: ${summary.totalInserted}`);
        console.log(`Courses with SubCategories: ${summary.withSubCategories}`);
        console.log(`Courses with Details: ${summary.withDetails}`);
        console.log(`Courses with Prerequisites: ${summary.withPrerequisites}`);
        
        console.log('\nCourses by Description:');
        Object.entries(summary.byDescription).forEach(([desc, count]) => {
            console.log(`${desc}: ${count}`);
        });

        return { success: true, summary };

    } catch (error) {
        console.error('Error during seeding:', error);
        throw error;
    } finally {
        if (mongoose.connection.readyState === 1) {
            await mongoose.disconnect();
            console.log('Database connection closed');
        }
    }
}

module.exports = seedCourses;