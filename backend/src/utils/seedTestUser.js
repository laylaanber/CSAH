const mongoose = require('mongoose');
const StudentV2 = require('../models/StudentV2');
const PreferenceV2 = require('../models/PreferenceV2');
const ScheduleV2 = require('../models/ScheduleV2');
require('dotenv').config();

const studentTestData = {
    studentId: '121212',
    username: 'testuser',
    password: 'test123',
    name: 'Test User',
    major: 'Computer Engineering',
    creditHours: 45,
    completedCourses: [
        // Language courses
        { courseId: "1902098", grade: "P", semester: "2021-1" },
        { courseId: "3201098", grade: "P", semester: "2021-1" },
        // ...existing courses...
        { courseId: "2220100", grade: "B+", semester: "2022-1" },
        { courseId: "3400100", grade: "A-", semester: "2022-1" },
        { courseId: "3400101", grade: "B", semester: "2022-1" },
        { courseId: "3400102", grade: "B+", semester: "2022-2" },
        { courseId: "0400101", grade: "A", semester: "2022-2" },
        { courseId: "1932099", grade: "P", semester: "2022-1" },
        { courseId: "3201099", grade: "P", semester: "2022-1" },
        { courseId: "3201100", grade: "B+", semester: "2022-1" },
        { courseId: "0301101", grade: "C+", semester: "2022-1" },
        { courseId: "0301102", grade: "D+", semester: "2022-2" },
        { courseId: "0907101", grade: "B+", semester: "2022-1" },
        { courseId: "0907231", grade: "B", semester: "2022-2" },
        { courseId: "0907342", grade: "C-", semester: "2023-1" }
    ]
};

const preferenceTestData = {
    studentId: '121212',
    preferredDays: 'sun_tue_thu',
    preferBreaks: 'yes',
    targetCreditHours: 16,
    categoryPreferences: {
        networking: 'prefer',
        hardware: 'neutral',
        software: 'avoid',
        electrical: 'neutral'
    },
    coursesToImprove: ['0301102', '0907342'],
    specificCourses: []
};

async function seedTestUser() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Clear existing data
        await Promise.all([
            StudentV2.findOneAndDelete({ studentId: studentTestData.studentId }),
            PreferenceV2.findOneAndDelete({ studentId: studentTestData.studentId }),
            ScheduleV2.deleteMany({ studentId: studentTestData.studentId })
        ]);
        
        // Create new student
        const student = new StudentV2(studentTestData);
        await student.save();
        console.log('Test student created');

        // Create preferences
        const preference = new PreferenceV2(preferenceTestData);
        await preference.save();
        console.log('Test preferences created');

        console.log('Test data seeded successfully');

    } catch (error) {
        console.error('Error seeding test data:', error);
    } finally {
        await mongoose.connection.close();
        console.log('Database connection closed');
    }
}

seedTestUser();