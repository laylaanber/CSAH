// src/models/ScheduleV2.js
const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema({
  studentId: {
    type: String,
    required: true,
    ref: 'StudentV2'
  },
  semester: {
    type: String,
    required: true
  },
  totalCreditHours: {
    type: Number,
    required: true,
    min: [12, 'Total credit hours must be at least 12'],
    max: [18, 'Total credit hours cannot exceed 18'],
    validate: {
      validator: function(v) {
        return Number.isInteger(v);
      },
      message: 'Credit hours must be a whole number'
    }
  },
  // Each course in the schedule includes time and section information
  courses: [{
    courseId: {
      type: String,
      required: true,
      ref: 'CourseV2'
    },
    courseName: {
      type: String,
      required: true
    },
    section: {
      type: String,
      required: true
    },
    time: {
      type: String,
      required: true
    },
    days: {
      type: String,
      required: true,
      enum: [
        'Sunday-Tuesday-Thursday', 
        'Monday-Wednesday',
        'Sunday-Tuesday',
        'Wednesday-Monday', 
        'Thursday-Sunday-Tuesday',
        'Sunday',
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'N/A'
      ]
    }
  }],
  // Store the calculated difficulty scores for analysis
  difficultyMetrics: {
    categoryDistribution: {
      networking: Number,
      hardware: Number,
      software: Number,
      electrical: Number
    }
  },
  // Track schedule status
  status: {
    type: String,
    enum: ['generated', 'accepted', 'rejected'],
    default: 'generated'
  },
  // Store student feedback for algorithm improvement
  feedback: {
    difficulty: {
      type: String,
      enum: ['too_hard', 'just_right', 'too_easy'],
    },
    comments: String
  },
  metrics: {
    totalCreditHours: Number,
    difficultyScore: {
      score: Number,
      level: String
    },
    balanceScore: Number,
    categoryDistribution: {
      networking: Number,
      hardware: Number,
      software: Number,
      electrical: Number
    },
    subcategoryProgress: {
      networking: {
        passed: Number,
        total: Number
      },
      hardware: {
        passed: Number,
        total: Number
      },
      software: {
        passed: Number,
        total: Number
      },
      electrical: {
        passed: Number,
        total: Number
      }
    }
  }
}, { timestamps: true });

// Method to validate schedule does not have time conflicts
scheduleSchema.methods.validateTimeConflicts = function() {
  const coursesByDay = {};
  
  for (const course of this.courses) {
    const days = course.days.split('-');
    
    for (const day of days) {
      if (!coursesByDay[day]) {
        coursesByDay[day] = [];
      }
      
      // Check for time conflicts on this day
      const courseTime = course.time.split(' - ').map(time => new Date(`1970/01/01 ${time}`));
      
      for (const existingCourse of coursesByDay[day]) {
        const existingTime = existingCourse.time.split(' - ').map(time => new Date(`1970/01/01 ${time}`));
        
        if (!(courseTime[1] <= existingTime[0] || courseTime[0] >= existingTime[1])) {
          return false; // Time conflict found
        }
      }
      
      coursesByDay[day].push(course);
    }
  }
  
  return true; // No time conflicts
};

// Calculate total difficulty score based on course details
scheduleSchema.methods.calculateOverallDifficulty = async function() {
  let totalScore = 0;
  
  for (const course of this.courses) {
    const courseDetails = await mongoose.model('CourseDetailsV2').findOne({ courseId: course.courseId });
    if (courseDetails) {
      totalScore += courseDetails.calculateDifficultyScore();
    }
  }
  
  this.difficultyMetrics.totalDifficultyScore = totalScore;
  return totalScore;
};

const ScheduleV2 = mongoose.model('ScheduleV2', scheduleSchema);
module.exports = ScheduleV2;