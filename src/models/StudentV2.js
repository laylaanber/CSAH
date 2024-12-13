// backend/src/models/StudentV2.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const completedCourseSchema = new mongoose.Schema({
    courseId: {
        type: String,
        required: true,
        ref: 'CourseV2'
    },
    grade: {
        type: String,
        required: true,
        enum: ['A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F', 'P']
    },
    semester: {
        type: String,
        required: true,
        validate: {
            validator: function(v) {
                return /^\d{4}-[1-2]$/.test(v);
            },
            message: 'Semester must be in format YYYY-N where N is 1 or 2'
        }
    }
}, { _id: false });

const studentSchema = new mongoose.Schema({
    studentId: {
        type: String,
        required: [true, 'Student ID is required'],
        unique: true,
        validate: {
            validator: function(v) {
                return /^\d+$/.test(v);
            },
            message: 'Student ID must contain only numbers'
        }
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        validate: {
            validator: function(v) {
                return /@ju\.edu\.jo$/.test(v);
            },
            message: 'Email must be a valid JU email address (@ju.edu.jo)'
        }
    },
    username: {
        type: String,
        required: [true, 'Username is required'],
        trim: true
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [8, 'Password must be at least 8 characters']
    },
    gpa: {
        type: Number,
        required: [true, 'GPA is required'],
        min: [0, 'GPA cannot be less than 0'],
        max: [4, 'GPA cannot be more than 4']
    },
    creditHours: {
        type: Number,
        default: 0,
        min: [0, 'Credit hours cannot be negative']
    },
    academicYear: {
        type: Number,
        required: [true, 'Academic year is required'],
        min: [1, 'Academic year must be at least 1'],
        max: [6, 'Academic year cannot exceed 6']
    },
    completedCourses: [completedCourseSchema]
}, { timestamps: true });

studentSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

studentSchema.methods.matchPassword = async function(enteredPassword) {
    try {
        return await bcrypt.compare(enteredPassword, this.password);
    } catch (error) {
        throw new Error('Error comparing passwords');
    }
};

const StudentV2 = mongoose.model('StudentV2', studentSchema);
module.exports = StudentV2;