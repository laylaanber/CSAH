// backend/src/routes/users.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware'); // Fixed import path
const StudentV2 = require('../models/StudentV2');
const bcrypt = require('bcryptjs');
const { check, validationResult } = require('express-validator');

router.put('/profile', 
  protect,
  [
    check('username').optional().trim().notEmpty().withMessage('Username cannot be empty'),
    check('password').optional().isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    check('gpa').optional().isFloat({ min: 0, max: 4 }).withMessage('GPA must be between 0 and 4'),
    check('academicYear').optional().isInt({ min: 1, max: 6 }).withMessage('Academic year must be between 1 and 6')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      // Get user from database using StudentV2 model
      let student = await StudentV2.findOne({ studentId: req.student.studentId });
      if (!student) {
        return res.status(404).json({ success: false, message: 'Student not found' });
      }

      // Update fields if provided
      if (req.body.username) student.username = req.body.username;
      if (req.body.gpa) student.gpa = req.body.gpa;
      if (req.body.academicYear) student.academicYear = req.body.academicYear;
      
      // Handle password update separately
      if (req.body.password) {
        const salt = await bcrypt.genSalt(10);
        student.password = await bcrypt.hash(req.body.password, salt);
      }

      // Save updated student
      await student.save();

      // Return updated student without password
      const studentResponse = student.toObject();
      delete studentResponse.password;

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: studentResponse
      });

    } catch (error) {
      console.error('Profile update error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;