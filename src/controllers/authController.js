// backend/src/controllers/authController.js
const StudentV2 = require('../models/StudentV2');
const CourseV2 = require('../models/CourseV2'); // Add this import
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose'); // Add this import

// Helper function to generate JWT token
const generateToken = (student) => {
  return jwt.sign(
    { 
      id: student._id.toString(),
      studentId: student.studentId,
      email: student.email 
    },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
};

const authController = {
  register: async (req, res) => {
    try {
      console.log('Registration attempt:', req.body);

      const { email, username, password, studentId, gpa, academicYear } = req.body;

      // Check MongoDB connection
      if (mongoose.connection.readyState !== 1) {
        throw new Error('Database connection not ready');
      }

      const existingStudent = await StudentV2.findOne({
        $or: [{ email }, { studentId }]
      });

      if (existingStudent) {
        return res.status(400).json({
          success: false,
          message: existingStudent.email === email ? 
            'Email already registered' : 
            'Student ID already registered'
        });
      }

      const student = new StudentV2({
        studentId,
        email,
        username,
        password,
        gpa: parseFloat(gpa),
        academicYear: parseInt(academicYear),
        creditHours: 0,
        completedCourses: []
      });

      const savedStudent = await student.save();
      console.log('Student saved:', savedStudent);

      const token = generateToken(savedStudent);

      return res.status(201).json({
        success: true,
        message: 'Registration successful',
        data: {
          studentId: savedStudent.studentId,
          email: savedStudent.email,
          username: savedStudent.username,
          token
        }
      });

    } catch (error) {
      console.error('Registration error:', error);
      return res.status(500).json({
        success: false,
        message: 'Registration failed',
        error: error.message
      });
    }
  },

  login: async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Please provide email and password'
        });
      }

      const student = await StudentV2.findOne({ email }).select('+password');
      if (!student) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      const isMatch = await student.matchPassword(password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      let token;
      try {
        token = jwt.sign(
          { 
            id: student._id.toString(),
            studentId: student.studentId,
            email: student.email 
          },
          process.env.JWT_SECRET,
          { expiresIn: '30d' }
        );
      } catch (tokenError) {
        console.error('Token generation error:', tokenError);
        return res.status(500).json({
          success: false,
          message: 'Error generating authentication token'
        });
      }

      const safeStudentData = {
        id: student._id.toString(),
        studentId: student.studentId,
        email: student.email,
        academicYear: student.academicYear || 1,
        gpa: student.gpa || 0.0,
        creditHours: student.creditHours || 0
      };

      res.json({
        success: true,
        data: {
          token,
          student: safeStudentData
        }
      });

    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error during login',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  getProfile: async (req, res) => {
    try {
      const student = await StudentV2.findOne({ 
        studentId: req.student.studentId 
      }).lean();
  
      res.json({
        success: true,
        data: {
          ...student,
          completedCourses: student.completedCourses || []
        }
      });
    } catch (error) {
      console.error('Profile error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  updatePassedCourses: async (req, res) => {
    try {
      const { passedCourses } = req.body;
      const studentId = req.student.studentId;

      const allCourses = await CourseV2.find().lean();

      let totalCreditHours = 0;
      passedCourses.forEach(passedCourse => {
        const course = allCourses.find(c => c.courseId === passedCourse.courseId);
        if (course && 
            course.description !== 'متطلبات إجبارية عامة' && 
            !['F', 'D-'].includes(passedCourse.grade)) {
          totalCreditHours += course.creditHours;
        }
      });

      const updatedStudent = await StudentV2.findOneAndUpdate(
        { studentId },
        { 
          completedCourses: passedCourses,
          creditHours: totalCreditHours 
        },
        { new: true }
      ).lean();

      res.json({
        success: true,
        data: {
          completedCourses: updatedStudent.completedCourses,
          creditHours: updatedStudent.creditHours,
          student: updatedStudent
        }
      });
    } catch (error) {
      console.error('Update error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  logout: async (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  }
};

module.exports = authController;