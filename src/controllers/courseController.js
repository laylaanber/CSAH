// controllers/courseController.js
const CourseV2 = require('../models/CourseV2');
const StudentV2 = require('../models/StudentV2');

const courseController = {
  // Get all courses with comprehensive filtering
  getAllCourses: async (req, res) => {
    try {
      const { description, subCategory, creditHours, difficulty } = req.query;
      const filter = {};

      // Build filter based on query parameters
      if (description) filter.description = description;
      if (subCategory) filter.subCategory = subCategory;
      if (creditHours) filter.creditHours = parseInt(creditHours);

      const courses = await CourseV2.find(filter)
        .populate('prerequisiteCourses', 'courseId courseName');

      // Calculate difficulty scores
      const coursesWithDifficulty = courses.map(course => ({
        ...course.toObject(),
        difficultyScore: course.calculateDifficultyScore()
      }));

      // Apply difficulty filter if provided
      let filteredCourses = coursesWithDifficulty;
      if (difficulty) {
        const [min, max] = difficulty.split('-').map(Number);
        filteredCourses = coursesWithDifficulty.filter(course => 
          course.difficultyScore >= min && course.difficultyScore <= max
        );
      }

      // Group courses by category for better organization
      const groupedCourses = {
        byDescription: {},
        bySubCategory: {}
      };

      filteredCourses.forEach(course => {
        // Group by description
        if (!groupedCourses.byDescription[course.description]) {
          groupedCourses.byDescription[course.description] = [];
        }
        groupedCourses.byDescription[course.description].push(course);

        // Group by subCategory if it exists
        if (course.subCategory) {
          if (!groupedCourses.bySubCategory[course.subCategory]) {
            groupedCourses.bySubCategory[course.subCategory] = [];
          }
          groupedCourses.bySubCategory[course.subCategory].push(course);
        }
      });

      res.json({
        success: true,
        count: filteredCourses.length,
        data: {
          courses: filteredCourses,
          groupedCourses
        }
      });
    } catch (error) {
      console.error('Error in getAllCourses:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving courses',
        error: error.message
      });
    }
  },

  // Get available courses based on student's academic history and preferences
  getAvailableCourses: async (req, res) => {
    try {
      const student = req.student;
      if (!student) {
        return res.status(401).json({
          success: false,
          message: 'Student authentication required'
        });
      }

      // Get student preferences from the database
      const preferences = await PreferenceV2.findOne({ studentId: student.studentId });
      if (!preferences) {
        return res.status(400).json({
          success: false,
          message: 'Student preferences not found. Please set your preferences first.'
        });
      }

      const allCourses = await CourseV2.find();
      const passedCourses = student.passedCourses || [];

      // Helper function to check prerequisites
      const checkPrerequisites = (course) => {
        if (!course.prerequisites || course.prerequisites.length === 0) return true;
        return course.prerequisites.every(prereqId => {
          const passedCourse = passedCourses.find(p => p.courseId === prereqId);
          return passedCourse && !['F', 'D-', 'D', 'D+'].includes(passedCourse.grade);
        });
      };

      // Helper function to check special rules
      const checkSpecialRules = (course) => {
        if (!course.specialRule) return true;
        const creditHourMatch = course.specialRule.match(/(\d+)/);
        return !creditHourMatch || student.creditHours >= parseInt(creditHourMatch[1]);
      };

      // Filter available courses
      const availableCourses = allCourses
        .filter(course => {
          // Check if course can be taken
          const notPassedOrLowGrade = !passedCourses.some(passed => 
            passed.courseId === course.courseId && 
            !['F', 'D-', 'D', 'D+'].includes(passed.grade)
          );

          return notPassedOrLowGrade && 
                 checkPrerequisites(course) && 
                 checkSpecialRules(course);
        })
        .map(course => {
          const difficultyScore = course.calculateDifficultyScore();
          
          // Adjust difficulty based on student preferences
          let adjustedDifficulty = difficultyScore;
          if (course.subCategory) {
            const preference = preferences.categoryPreferences[course.subCategory];
            if (preference === 'prefer') adjustedDifficulty *= 0.8;  // 20% easier if preferred
            if (preference === 'dislike') adjustedDifficulty *= 1.2; // 20% harder if disliked
          }

          return {
            ...course.toObject(),
            difficultyScore,
            adjustedDifficulty,
            preferenceFactor: course.subCategory ? 
              preferences.categoryPreferences[course.subCategory] : 'neutral'
          };
        });

      // Sort courses by adjusted difficulty and category balance
      const sortedCourses = availableCourses.sort((a, b) => {
        // First priority: Student's preferred categories
        if (a.preferenceFactor !== b.preferenceFactor) {
          return a.preferenceFactor === 'prefer' ? -1 : 1;
        }
        // Second priority: Adjusted difficulty score
        return a.adjustedDifficulty - b.adjustedDifficulty;
      });

      res.json({
        success: true,
        data: {
          availableCourses: sortedCourses,
          coursesByCategory: {
            networking: sortedCourses.filter(c => c.subCategory === 'networking'),
            hardware: sortedCourses.filter(c => c.subCategory === 'hardware'),
            software: sortedCourses.filter(c => c.subCategory === 'software'),
            electrical: sortedCourses.filter(c => c.subCategory === 'electrical')
          },
          studentProgress: {
            creditHours: student.creditHours,
            preferences: preferences.categoryPreferences
          }
        }
      });

    } catch (error) {
      console.error('Error in getAvailableCourses:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving available courses',
        error: error.message
      });
    }
  },

  // Add this new method
  getStudentProgress: async (req, res) => {
    try {
      console.log('Fetching student progress for:', req.student.studentId);
      
      const student = await StudentV2.findOne({ studentId: req.student.studentId });
      if (!student) {
        console.log('Student not found:', req.student.studentId);
        return res.status(404).json({
          success: false,
          message: 'Student not found'
        });
      }

      console.log('Found student:', student.studentId, 'Credit hours:', student.creditHours);

      const allCourses = await CourseV2.find().lean();
      const passedCourses = student.completedCourses || [];

      // Helper to group courses by category
      const groupByCategory = (courses) => {
        return courses.reduce((acc, course) => {
          if (!acc[course.description]) {
            acc[course.description] = [];
          }
          acc[course.description].push(course);
          return acc;
        }, {});
      };

      // Get remaining courses (not passed or failed)
      const remainingCourses = allCourses.filter(course => 
        !passedCourses.some(pc => 
          pc.courseId === course.courseId && 
          !['F', 'D-', 'D', 'D+', 'C-'].includes(pc.grade)
        )
      );

      // Get available courses (prerequisites met)
      const availableCourses = remainingCourses.filter(course => {
        if (!course.prerequisites?.length) return true;
        return course.prerequisites.every(prereq =>
          passedCourses.some(pc => 
            pc.courseId === prereq && 
            !['F', 'D-', 'D', 'D+', 'C-'].includes(pc.grade)
          )
        );
      });

      // Get courses eligible for retake
      const retakeCourses = allCourses.filter(course =>
        passedCourses.some(pc => 
          pc.courseId === course.courseId && 
          ['F', 'D-', 'D', 'D+', 'C-'].includes(pc.grade)
        )
      ).map(course => ({
        ...course,
        currentGrade: passedCourses.find(pc => pc.courseId === course.courseId).grade
      }));

      res.json({
        success: true,
        data: {
          studentCreditHours: student.creditHours,
          remainingCourses: groupByCategory(remainingCourses),
          availableCourses: groupByCategory(availableCourses),
          retakeCourses: groupByCategory(retakeCourses),
          passedCourses
        }
      });

    } catch (error) {
      console.error('Error in getStudentProgress:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving progress data',
        error: error.message
      });
    }
  }
};

module.exports = courseController;