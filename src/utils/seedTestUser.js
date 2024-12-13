const mongoose = require('mongoose');
const StudentV2 = require('../models/StudentV2');
const PreferenceV2 = require('../models/PreferenceV2');
require('dotenv').config();

const studentTestData = {
    studentId: "123456",
    email: "test.student@ju.edu.jo",
    password: "testpassword123",
    academicYear: 3,
    gpa: 3.2,
    creditHours: 75,
    completedCourses: [
        // University Requirements
        { courseId: "2220100", grade: "B+", semester: "2022-1" },
        { courseId: "3400100", grade: "A-", semester: "2022-1" },
        { courseId: "3400101", grade: "B", semester: "2022-1" },
        { courseId: "3400102", grade: "B+", semester: "2022-2" },
        { courseId: "0400101", grade: "A", semester: "2022-2" },
        
        // General Requirements
        { courseId: "1902098", grade: "P", semester: "2022-1" },
        { courseId: "1932099", grade: "P", semester: "2022-1" },
        { courseId: "3201098", grade: "P", semester: "2022-1" },
        { courseId: "3201099", grade: "P", semester: "2022-1" },
        { courseId: "3201100", grade: "B+", semester: "2022-1" },
        
        // Core Requirements with mixed grades
        { courseId: "0301101", grade: "C+", semester: "2022-1" },
        { courseId: "0301102", grade: "D+", semester: "2022-2" },
        { courseId: "0907101", grade: "B+", semester: "2022-1" },
        { courseId: "0907231", grade: "B", semester: "2022-2" },
        { courseId: "0907342", grade: "C-", semester: "2023-1" }
    ]
};

async function seedTestUser() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        await StudentV2.findOneAndDelete({ studentId: studentTestData.studentId });
        
        const student = new StudentV2(studentTestData);
        await student.save();
        console.log('Test student created with completed courses');

        const preferenceData = {
            studentId: studentTestData.studentId,
            preferredDays: 'sun_tue_thu',
            preferBreaks: 'yes',
            targetCreditHours: 15,
            categoryPreferences: {
                networking: 'prefer',
                hardware: 'neutral',
                software: 'prefer',
                electrical: 'neutral'
            }
        };

        await PreferenceV2.findOneAndDelete({ studentId: studentTestData.studentId });
        await PreferenceV2.create(preferenceData);
        console.log('Test preferences created');

        console.log('All test data seeded successfully');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding test data:', error);
        process.exit(1);
    }
}

seedTestUser();