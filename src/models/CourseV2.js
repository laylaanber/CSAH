// models/CourseV2.js
const mongoose = require('mongoose');

// Define the details schema separately for better organization
const courseDetailsSchema = new mongoose.Schema({
  isLab: {
    type: Boolean,
    default: false
  },
  numProjects: {
    type: Number,
    default: 0,
    min: 0
  },
  numQuizzes: {
    type: Number,
    default: 0,
    min: 0
  },
  numAssignments: {
    type: Number,
    default: 0,
    min: 0
  },
  numCertificates: {
    type: Number,
    default: 0,
    min: 0
  },
  examType: {
    type: String,
    enum: ['mid-final', 'first-second', 'practical'],
    default: 'mid-final'
  }
}, { _id: false }); // Disable _id for embedded document

const courseSchema = new mongoose.Schema({
  courseId: {
    type: String,
    required: [true, 'Course ID is required'],
    unique: true,
    trim: true
  },
  courseName: {
    type: String,
    required: [true, 'Course name is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Course description is required'],
    enum: [
      'متطلبات الجامعة الإجبارية',
      'متطلبات الجامعة الاختيارية',
      'متطلبات الكلية الإجبارية',
      'متطلبات التخصص الإجبارية',
      'متطلبات التخصص الاختيارية',
      'متطلبات إجبارية عامة'
    ]
  },
  prerequisites: [{
    type: String,
  }],
  creditHours: {
    type: Number,
    required: true,
    min: 0,
    max: 3
  },
  gradeType: {
    type: String,
    enum: ['regular', 'pass/fail'],
    required: true
  },
  // New fields specific to major courses
  subCategory: {
    type: String,
    enum: [
      // Technical categories
      'networking',
      'hardware',
      'software',
      'electrical',
      // University optional course groups
      'المجموعة الاولى',
      'المجموعة الثانية',
      'المجموعة الثالثة'
    ],
    required: false
  },
  specialRule: {
    type: String,
    // Add validation for credit hour rules format if needed
    validate: {
      validator: function(v) {
        if (!v) return true;
        return /Student cannot enroll unless they have passed \d+ credit hours\./.test(v);
      },
      message: 'Special rule format is invalid'
    }
  },
  // Embed course details
  details: courseDetailsSchema
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});
courseSchema.index({ courseId: 1 }, { unique: true });


// Calculate difficulty score using the weights from the documentation
courseSchema.methods.calculateDifficultyScore = function() {
  if (!this.details) return 0;

  // Define weight constants based on documentation
  const weights = {
    quiz: 2,         // 2 points per quiz
    assignment: 3,    // 3 points per assignment
    project: 5,       // 5 points per project
    lab: 4,          // 4 points for lab component
    certificate: 2,   // 2 points per certificate
    examTypes: {
      'mid-final': 4,
      'first-second': 5,
      'practical': 3
    }
  };

  let score = 0;

  // Calculate base score from course components
  score += this.details.numQuizzes * weights.quiz;
  score += this.details.numAssignments * weights.assignment;
  score += this.details.numProjects * weights.project;
  score += this.details.numCertificates * weights.certificate;
  
  // Add lab score if applicable
  if (this.details.isLab) {
    score += weights.lab;
  }

  // Add exam type score
  if (this.details.examType) {
    score += weights.examTypes[this.details.examType];
  }

  return score;
};

courseSchema.virtual('prerequisiteCourses', {
  ref: 'CourseV2',
  localField: 'prerequisites',
  foreignField: 'courseId'
});

// Virtual for prerequisite chain
courseSchema.virtual('prerequisiteChain').get(async function() {
  const chain = new Set();
  
  async function getPrereqs(courseId, visited = new Set()) {
    if (visited.has(courseId)) return;
    visited.add(courseId);
    chain.add(courseId);
    
    const course = await mongoose.model('CourseV2').findOne({ courseId });
    if (!course) return;
    
    for (const prereqId of course.prerequisites) {
      await getPrereqs(prereqId, visited);
    }
  }
  
  await getPrereqs(this.courseId);
  return Array.from(chain);
});

// Index for efficient queries
courseSchema.index({ courseId: 1 });
courseSchema.index({ description: 1 });
courseSchema.index({ subCategory: 1 });

const CourseV2 = mongoose.model('CourseV2', courseSchema);
module.exports = CourseV2;