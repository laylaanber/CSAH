// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const StudentV2 = require('../models/StudentV2');

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    console.log('Auth Header:', authHeader);

    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authorization required'
      });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.student = await StudentV2.findOne({ studentId: decoded.studentId });
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
  } catch (error) {
    console.error('Auth Error:', error);
    return res.status(401).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};

module.exports = { 
  protect,
  authMiddleware: protect 
};