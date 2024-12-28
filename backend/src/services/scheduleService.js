/**
 * scheduleService.js
 * Course Schedule Generation Service
 * 
 * This service handles the generation of academic course schedules based on:
 * - Student preferences
 * - Course prerequisites
 * - Time slot availability
 * - Academic rules and constraints
 * - Lab distribution requirements
 * 
 * The schedule generation process follows these main steps:
 * 1. Initialize constraints and student data
 * 2. Filter eligible courses
 * 3. Prioritize courses based on multiple factors
 * 4. Build schedule while respecting all constraints
 * 5. Validate and return the generated schedule
 */
const CourseV2 = require('../models/CourseV2');
const PreferenceV2 = require('../models/PreferenceV2');
const ScheduleV2 = require('../models/ScheduleV2');
const ChainCalculator = require('../utils/chainCalculator');

/**********************
 * SYSTEM CONSTANTS 
 **********************/

// Priority weights for different scheduling factors
const PRIORITIES = {
  GPA_IMPROVEMENT: 10,
  SPECIFIC_REQUESTS: 9,
  CREDIT_HOUR_REQUIREMENTS: 8,
  LABS_BALANCE: 7,
  CHAIN_PREREQUISITES: 6,
  CATEGORY_BALANCE: 5,
  DIFFICULTY_BALANCE: 4,
  PREFERRED_DAYS: 3,
  PREFERRED_BREAKS: 2
};

/**********************
 * ACADEMIC CONSTRAINTS 
 **********************/

// Constraints for different course categories
const CATEGORY_CONSTRAINTS = {
  'متطلبات الجامعة الاختيارية': {
    maxCourses: 3,
    maxPerSubcategory: 1
  },
  'متطلبات التخصص الاختيارية': {
    maxCourses: 5
  }
};

/**********************
 * SPECIAL COURSE RULES 
 **********************/

// Special rules for specific courses like projects and training
const SPECIAL_COURSE_CONSTRAINTS = {
  '0977598': { // مشروع 1 الحاسوب
    minCreditHours: 120,
    noSummerAllowed: true,
    difficulty: 'HIGH'
  },
  '0977599': { // مشروع 2 الحاسوب
    noSummerAllowed: true,
    prerequisites: ['0977598'],
    difficulty: 'HIGH'
  },
  '0947500': { // التدريب العملي
    minCreditHours: 120,
    preferSummer: true,
    regularSemesterRules: {
      allowedWith: ['0977598', '0977599'],
      maxOtherCourses: 1
    },
    difficulty: 'MEDIUM'
  },
  '0901420': { // اقتصاد هندسي
    minCreditHours: 90,
    difficulty: 'MEDIUM'
  }
};
const SEMESTER_CONSTRAINTS = {
    REGULAR: {
      minCredits: 12,
      maxCredits: 18,
      minLabs: 1
    },
    SUMMER: {
      minCredits: 0,
      maxCredits: 10,
      minLabs: 0
    }
  };
const UNIVERSITY_ELECTIVES = {
  GROUP1: {
    name: "المجموعة الاولى",
    courses: ["0400101", "2300101", "2300102", "3400108"] 
  },
  GROUP2: {
    name: "المجموعة الثانية",
    courses: ["0310102", "0400102", "0720100", "1000102", "1100100"]
  },
  GROUP3: {
    name: "المجموعة الثالثة", 
    courses: ["1600100", "1900101", "2000100", "2200103", "3400106"]
  }
};
const COURSE_CATEGORIES = {
  UNIVERSITY_MANDATORY: 'متطلبات الجامعة الإجبارية',
  UNIVERSITY_ELECTIVE: 'متطلبات الجامعة الاختيارية',
  COLLEGE_MANDATORY: 'متطلبات الكلية الإجبارية',
  MAJOR_MANDATORY: 'متطلبات التخصص الإجبارية',
  MAJOR_ELECTIVE: 'متطلبات التخصص الاختيارية'
};
const SCHEDULING_RULES = {
  SUMMER: {
    restricted_courses: ['0977598', '0977599'], // Project 1 & 2
    preferred_courses: ['0947500']  // Training
  },
  BASIC_CATEGORIES: [
    'متطلبات الجامعة الاختيارية',
    'متطلبات الجامعة الإجبارية',
    'متطلبات إجبارية عامة'
  ],
  DIFFICULTY_BASE: {
    'متطلبات الجامعة الاختيارية': 0.4,
    'متطلبات الجامعة الإجبارية': 0.4,
    'متطلبات إجبارية عامة': 0.4,
    'متطلبات التخصص الإجبارية': 1.0,
    'متطلبات التخصص الاختيارية': 0.8
  }
};

const DIFFICULTY_LEVELS = {
  'متطلبات الجامعة الاختيارية': 0.4,
  'متطلبات الجامعة الإجبارية': 0.4,
  'متطلبات إجبارية عامة': 0.4,
  'متطلبات التخصص الإجبارية': 1.0,
  'متطلبات التخصص الاختيارية': 0.8
};

const LAB_CONSTRAINTS = {
  MIN_LABS: 1,
  MAX_LABS: 3  // Strict maximum of 3 labs per semester
};

class ScheduleGenerator {
  constructor(studentId, preferences, availableSections, student) {
    // Initialize basic properties
    this.studentId = studentId;
    this.preferences = {
        targetCreditHours: preferences.targetCreditHours,
        preferredDays: preferences.preferredDays,
        preferBreaks: preferences.preferBreaks,
        specificCourses: preferences.specificCourses || [],
        coursesToImprove: preferences.coursesToImprove || [],
        categoryPreferences: preferences.categoryPreferences || {}
    };
    this.availableSections = availableSections;
    this.student = student;
    this.courseDetails = new Map();
    this.semesterType = this.determineSemesterType();
    this.constraints = SEMESTER_CONSTRAINTS[this.semesterType];
    this.errors = [];
    this.attemptStats = [];

    // Log initialization
    console.log('Initializing ScheduleGenerator:', {
        studentId,
        preferences: { ...preferences, specificCourses: preferences.specificCourses?.length },
        availableSectionsCount: availableSections.courses?.length,
        studentCreditHours: student.creditHours
    });

    console.log('Student credit hours:', this.student.creditHours);
    console.log('Passed prerequisites:', 
        this.student.completedCourses?.map(c => ({
            courseId: c.courseId,
            grade: c.grade
        }))
    );
  }

  determineSemesterType() {
    const currentMonth = new Date().getMonth() + 1; // JavaScript months are 0-based
    const semesterType = (currentMonth >= 6 && currentMonth <= 8) ? 'SUMMER' : 'REGULAR';
    console.log('Determined semester type:', semesterType, 'for month:', currentMonth);
    return semesterType;
  }

  async generateSchedule(availableCourses) {
    try {
      if (!Array.isArray(availableCourses)) {
        throw new Error('Available courses must be an array');
      }

      // Initialize course details at the start of generation
      this.initializeCourseDetails(availableCourses);

      // Phase 1: Initialization
      this.#log('INIT', 'Starting schedule generation', {
        studentId: this.studentId,
        creditHours: this.student.creditHours,
        semesterType: this.semesterType,
        targetCredits: this.preferences.targetCreditHours
      });

      // Phase 2: Course Filtering
      const eligibleCourses = this.filterEligibleCourses(availableCourses);
      this.#log('FILTERING', 'Filtered eligible courses', {
        total: eligibleCourses.length,
        byCategory: this.#groupByCategory(eligibleCourses)
      });

      // Phase 3: Schedule Building Attempts
      for (const targetCredits of this.#getCreditTargets()) {
        this.#log('ATTEMPT', `Building schedule with ${targetCredits} credits`);
        
        const schedule = await this.buildSchedule(
          this.prioritizeCourses(eligibleCourses), 
          targetCredits
        );

        if (schedule) {
          const metrics = this.calculateMetrics(schedule);
          if (!metrics) {
            console.error('Failed to calculate metrics');
            return {
              success: false,
              message: 'Error calculating schedule metrics'
            };
          }

          return {
            success: true,
            schedule,
            metrics: {
              totalCreditHours: metrics.totalCreditHours || 0,
              difficultyScore: metrics.difficultyScore || 0,
              balanceScore: metrics.balanceScore || 0,
              categoryDistribution: metrics.categoryDistribution || {
                networking: 0,
                hardware: 0,
                software: 0,
                electrical: 0,
                other: 0
              }
            }
          };
        }
      }

      // Phase 5: Failure Summary
      this.#log('FAILURE', 'Failed to generate valid schedule', {
        attempts: this.attemptStats,
        lastValidation: this.lastValidation
      }, 'error');

      return {
        success: false,
        message: 'Could not generate valid schedule',
        details: this.#getFailureDetails()
      };

    } catch (error) {
      this.#log('ERROR', error.message, { stack: error.stack }, 'error');
      return { success: false, message: error.message };
    }
  }

  // Add logging utilities
  #log(phase, message, data = {}, level = 'info') {
    const timestamp = new Date().toISOString();
    const separator = '='.repeat(50);
    
    console.log(`\n${separator}`);
    console.log(`[${timestamp}] ${phase} - ${level.toUpperCase()}`);
    console.log(message);
    if (Object.keys(data).length > 0) {
      console.log('Details:', JSON.stringify(data, null, 2));
    }
    console.log(separator);
  }

  #validateWithSummary(schedule) {
    const validation = this.validateScheduleWithDetails(schedule);
    
    this.#log('VALIDATION', 'Schedule validation results', {
      isValid: validation.isValid,
      checks: validation.details,
      schedule: this.#formatScheduleSummary(schedule)
    });

    return validation;
  }

  #formatScheduleSummary(schedule) {
    return schedule.map(c => ({
      id: c.courseId,
      name: c.courseName,
      category: c.description,
      time: `${c.days} ${c.time}`
    }));
  }

  #groupByCategory(courses) {
    return courses.reduce((acc, course) => {
      acc[course.description] = (acc[course.description] || 0) + 1;
      return acc;
    }, {});
  }

  #getFailureDetails() {
    return {
      totalAttempts: this.attemptStats.length,
      failedChecks: this.attemptStats.map(a => a.failedValidations),
      constraints: this.constraints
    };
  }

  // Add new helper methods
  shufflePrioritizedCourses(courses) {
    const prioritized = this.prioritizeCourses(courses);
    // Shuffle within same priority groups
    return prioritized;
  }

  validateScheduleWithDetails(schedule) {
    const checks = {
      creditHours: this.checkCreditHours(schedule),
      categoryLimits: this.checkCategoryLimits(schedule),
      labDistribution: this.checkLabDistribution(schedule),
      specialRules: this.checkSpecialCourseRules(schedule),
      universityElectives: this.checkUniversityElectivesConstraint(schedule),
      timeConflicts: this.checkTimeConflicts(schedule)
    };
  
    console.log('Schedule validation:', {
      creditHours: this.calculateTotalCredits(schedule),
      checks,
      courses: schedule.map(c => c.courseId)
    });
  
    const isValid = Object.values(checks).every(check => check === true);
    return { 
      isValid, 
      creditHours: this.calculateTotalCredits(schedule),
      details: checks
    };
  }
  

  evaluateSchedule(schedule) {
    return (
      this.calculateBalanceScore(schedule) +
      (schedule.length * 10) + // Prefer more courses within limits
      (schedule.filter(c => c.details?.isLab).length * 5) // Bonus for labs
    );
  }

  getLastAttemptDetails() {
    return {
      eligibleCoursesCount: this.lastAttemptStats?.eligibleCourses || 0,
      failedChecks: this.lastAttemptStats?.failedChecks || [],
      creditHours: this.lastAttemptStats?.creditHours || 0
    };
  }

  async getPrioritizedCourses() {
    const courses = await this.getAvailableCourses();
    return courses.sort((a, b) => this.calculatePriority(b) - this.calculatePriority(a));
  }

  getPrioritizedCourses(courses, attempt) {
    const prioritized = this.prioritizeCourses(courses);
    
    // For subsequent attempts, try different orderings
    if (attempt > 0) {
      // Shuffle courses with similar priorities
      const priorityGroups = prioritized.reduce((groups, course) => {
        const priority = Math.floor(course.totalPriority);
        if (!groups[priority]) groups[priority] = [];
        groups[priority].push(course);
        return groups;
      }, {});

      return Object.values(priorityGroups)
        .map(group => this.shuffleArray(group))
        .flat();
    }

    return prioritized;
  }

  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  calculatePriority(course) {
    let priority = 0;
    
    // Base credits factor
    priority += course.creditHours * 10;
    
    // Adjust lab priority based on current lab count
    if (course.details?.isLab) {
        const currentLabCount = this.currentSchedule?.filter(c => c.details?.isLab).length || 0;
        priority += currentLabCount < LAB_CONSTRAINTS.MIN_LABS ? 50 : -50;
    }

    priority += this.getImprovementScore(course);
    priority += this.getChainPrerequisiteScore(course) * 5;
    
    return priority;
  }

  getImprovementScore(course) {
    const previousAttempt = this.student.completedCourses?.find(
      c => c.courseId === course.courseId
    );
    
    if (!previousAttempt) return 0;
    if (!this.preferences.coursesToImprove?.includes(course.courseId)) return 0;
  
    // Grade to score mapping (higher score = higher priority)
    const gradeScores = {
      'F': 100,
      'D-': 90,
      'D': 80,
      'D+': 70,
      'C-': 60,
      'C': 50
    };
  
    return gradeScores[previousAttempt.grade] || 0;
  }
  
  hasFailedGrade(course) {
    const previousAttempt = this.student.completedCourses?.find(
      c => c.courseId === course.courseId
    );
    return previousAttempt && ['F', 'D-'].includes(previousAttempt.grade);
  }
  
  isElectiveCourse(course) {
    return course.description === 'متطلبات الجامعة الاختيارية' || 
           course.description === 'متطلبات التخصص الاختيارية';
  }

  getGPAImprovementScore(course) {
    console.log('Calculating GPA improvement score for:', course.courseId);
    
    const previousAttempt = this.student.completedCourses?.find(c => 
      c.courseId === course.courseId
    );

    if (!previousAttempt) return 0;

    // Convert grade to numeric value
    const gradeValues = {
      'F': 0, 'D-': 0.75, 'D': 1, 'D+': 1.5, 
      'C-': 1.75, 'C': 2, 'C+': 2.5, 
      'B-': 2.75, 'B': 3, 'B+': 3.5, 
      'A-': 3.75, 'A': 4
    };

    const numericGrade = gradeValues[previousAttempt.grade] || 0;
    console.log('Previous grade numeric value:', numericGrade);

    // Higher score for lower grades
    return (4 - numericGrade) * 2;
  }

  getSpecificRequestScore(course) {
    console.log('Checking specific request score for:', course.courseId);
    return this.preferences.specificCourses?.includes(course.courseId) ? 10 : 0;
  }

  getChainPrerequisiteScore(course) {
    const chainCalculator = new ChainCalculator(this.courseDetails);
    const { forward, backward } = chainCalculator.calculateChainScore(course);

    const forwardScore = forward * 20;  // Increased weight
    const backwardScore = backward * 5;

    console.log(`Chain scores for ${course.courseId}:`, {
        forward: forwardScore,
        backward: backwardScore,
        total: forwardScore + backwardScore
    });

    return forwardScore + backwardScore;
}

  getCategoryBalanceScore(course) {
    console.log('Calculating category balance score for:', course.courseId);
    const categoryCount = Object.values(this.currentSchedule || {})
      .filter(c => c.description === course.description)
      .length;

    // Penalize adding more courses from same category
    return 5 - (categoryCount * 2);
  }

  getLabDistributionScore(course) {
    if (!course.details?.isLab && 
        !course.courseName?.toLowerCase().includes('مختبر') &&
        !course.description?.toLowerCase().includes('مختبر')) {
      return 0;
    }
  
    // Count current labs in schedule
    const currentLabCount = (this.currentSchedule || [])
      .filter(c => 
        c.details?.isLab || 
        c.courseName?.toLowerCase().includes('مختبر') ||
        c.description?.toLowerCase().includes('مختبر')
      ).length;
  
    // Heavily penalize exceeding lab limit
    if (currentLabCount >= LAB_CONSTRAINTS.MAX_LABS) {
      return -100; // Strong negative priority
    }
  
    // Encourage adding labs until minimum is met
    if (currentLabCount < LAB_CONSTRAINTS.MIN_LABS) {
      return 50; // High positive priority
    }
  
    // Neutral priority for labs within limits
    return 0;
  }

  initializeCourseDetails(availableCourses) {
    if (!availableCourses || !Array.isArray(availableCourses)) {
      throw new Error('Invalid courses data');
    }

    this.courseDetails.clear(); // Clear existing data
    availableCourses.forEach(course => {
        this.courseDetails.set(course.courseId, {
            ...course,
            prerequisites: course.prerequisites || []
        });
    });

    console.log(`Initialized ${this.courseDetails.size} courses`);
  }

  verifyPrerequisites(course) {
      if (!course.prerequisites?.length) return true;

      return course.prerequisites.every(prereqId => {
          const passedPrereq = this.student.completedCourses?.find(
              c => c.courseId === prereqId
          );
          return passedPrereq && !['F', 'D-'].includes(passedPrereq.grade);
      });
  }

  filterEligibleCourses(availableCourses) {
    const eligibleCourses = [];
    
    availableCourses.forEach(course => {
        // Skip if no sections available
        if (!this.availableSections.courses.some(c => c.courseId === course.courseId)) {
            return;
        }

        // Check if course was previously taken
        const previousAttempt = this.student.completedCourses?.find(
            c => c.courseId === course.courseId
        );

        // Get special rules for this course
        const specialRules = SPECIAL_COURSE_CONSTRAINTS[course.courseId];

        // Course is eligible if:
        const isEligible = (
            // 1. Failed course (F or D-)
            (previousAttempt && ['F', 'D-'].includes(previousAttempt.grade)) ||
            
            // 2. Course to improve from preferences
            (previousAttempt && this.preferences.coursesToImprove?.includes(course.courseId)) ||
            
            // 3. New course with prerequisites met
            (!previousAttempt && this.#hasPassedPrerequisites(course))
        );

        // Check special credit hour requirements
        if (isEligible && specialRules?.minCreditHours) {
            if (this.student.creditHours < specialRules.minCreditHours) {
                return; // Skip if credit hours requirement not met
            }
        }

        if (isEligible) {
            eligibleCourses.push(course);
        }
    });

    return eligibleCourses;
}

// Add helper method to check prerequisites
#hasPassedPrerequisites(course) {
    if (!course.prerequisites?.length) return true;

    return course.prerequisites.every(prereqId => {
        const passedPrereq = this.student.completedCourses?.find(
            c => c.courseId === prereqId
        );
        // Must have passed with grade better than D-
        return passedPrereq && !['F', 'D-'].includes(passedPrereq.grade);
    });
}

  hasTimeConflict(section1, section2) {
    if (!section1?.time || !section2?.time || !section1?.days) return true;
  
    const days1 = new Set(section1.days.split('-'));
    const days2 = new Set(section2.days.split('-'));
    const hasCommonDays = [...days1].some(day => days2.has(day));
    
    if (!hasCommonDays) return false;
  
    const [start1, end1] = this.parseTimeToMinutes(section1.time);
    const [start2, end2] = this.parseTimeToMinutes(section2.time);
  
    return !(end1 <= start2 || start1 >= end2);
  }

  calculateBreakScore(section, schedule) {
      if (!schedule.length) return 1;

      const courseTimes = schedule
          .filter(c => c.days === section.days)
          .map(c => {
              const [start, end] = c.time.split(' - ')
                  .map(t => new Date(`1970/01/01 ${t}`));
              return { start, end };
          });

      const [newStart, newEnd] = section.time.split(' - ')
          .map(t => new Date(`1970/01/01 ${t}`));

      let minBreak = Infinity;
      courseTimes.forEach(time => {
          const breakAfter = (time.start - newEnd) / (1000 * 60);
          const breakBefore = (newStart - time.end) / (1000 * 60);
          
          if (breakAfter > 0) minBreak = Math.min(minBreak, breakAfter);
          if (breakBefore > 0) minBreak = Math.min(minBreak, breakBefore);
      });

      if (minBreak === Infinity) return 1;
      if (minBreak < 15) return 0;
      if (minBreak > 30) return 0.5;
      return 1;
  }

  assignTimeSlot(course, currentSchedule) {
    // Add error logging
    if (!course) {
      console.log('Invalid course passed to assignTimeSlot');
      return null;
    }

    const availableSectionsForCourse = this.availableSections.courses
      .find(c => c.courseId === course.courseId)?.sections;

    console.log('Available sections for course:', {
      courseId: course.courseId,
      sectionsCount: availableSectionsForCourse?.length || 0
    });

    // Validate sections exist
    if (!availableSectionsForCourse?.length) {
      console.log(`No sections found for course ${course.courseId}`);
      return null;
    }

    let preferredDays = [];
    if (this.preferences.preferredDays === 'sun_tue_thu') {
        preferredDays = ['Sunday-Tuesday-Thursday'];
    } else if (this.preferences.preferredDays === 'mon_wed') {
        preferredDays = ['Monday-Wednesday'];
    } else {
        preferredDays = ['Sunday-Tuesday-Thursday', 'Monday-Wednesday'];
    }

    const compatibleSections = availableSectionsForCourse.filter(section => {
        if (!preferredDays.includes(section.days)) return false;
        return !this.hasTimeConflict(section, currentSchedule);
    });

    if (this.preferences.preferBreaks === 'yes') {
        compatibleSections.sort((a, b) => {
            const breakScoreA = this.calculateBreakScore(a, currentSchedule);
            const breakScoreB = this.calculateBreakScore(b, currentSchedule);
            return breakScoreB - breakScoreA;
        });
    }

    if (compatibleSections.length) {
      console.log(`Found compatible sections for ${course.courseId}:`, 
        compatibleSections.map(s => ({
          section: s.section,
          days: s.days,
          time: s.time,
          breakScore: this.calculateBreakScore(s, currentSchedule)
        }))
      );
    } else {
      console.log(`No compatible sections found for ${course.courseId}`);
    }

    if (!compatibleSections.length) return null;

    return {
        courseId: course.courseId,
        courseName: this.courseDetails.get(course.courseId).courseName,
        creditHours: this.courseDetails.get(course.courseId).creditHours,
        description: this.courseDetails.get(course.courseId).description,
        subCategory: this.courseDetails.get(course.courseId).subCategory,
        details: this.courseDetails.get(course.courseId).details,
        section: compatibleSections[0].section,
        days: compatibleSections[0].days,
        time: compatibleSections[0].time
    };
  }

  prioritizeCourses(courses) {
    // Add validation and logging
    if (!courses?.length) return [];
  
    const prioritized = courses.map(course => {
      const priority = {
        gpa: this.getGPAImprovementScore(course) * PRIORITIES.GPA_IMPROVEMENT,
        specific: this.getSpecificRequestScore(course) * PRIORITIES.SPECIFIC_REQUESTS,
        chain: this.getChainPrerequisiteScore(course) * PRIORITIES.CHAIN_PREREQUISITES,
        category: this.getCategoryBalanceScore(course) * PRIORITIES.CATEGORY_BALANCE,
        lab: this.getLabDistributionScore(course) * PRIORITIES.LABS_BALANCE // Add lab score
      };
  
      return {
        ...course,
        totalPriority: Object.values(priority).reduce((a, b) => a + b, 0),
        priorityBreakdown: priority
      };
    });
  
    console.log('Course priorities:', prioritized.map(c => ({
      id: c.courseId,
      priority: c.totalPriority,
      breakdown: c.priorityBreakdown
    })));
  
    return prioritized.sort((a, b) => b.totalPriority - a.totalPriority);
  }

  calculateCategoryDistribution(schedule) {
    // Initialize category counts based on course descriptions
    const distribution = schedule.reduce((acc, course) => {
      // Get course category
      const category = course.description;
      
      // Initialize if not exists
      if (!acc[category]) {
        acc[category] = 0;
      }
      
      // Increment count
      acc[category]++;
      
      return acc;
    }, {});

    // Log distribution for debugging
    console.log('Category distribution:', {
      counts: distribution,
      total: schedule.length,
      courses: schedule.map(c => ({
        id: c.courseId,
        category: c.description 
      }))
    });

    return distribution;
  }

  calculateBalanceScore(schedule) {
    const { categoryDist, subCategoryDist } = this.calculateDistributions(schedule);

    // Fixed weights for balance calculation
    const WEIGHTS = {
      CATEGORY: 0.4,      // 40% for main category balance
      SUBCATEGORY: 0.6    // 60% for technical subcategory balance
    };

    const categoryBalance = this.calculateDistributionBalance(categoryDist);
    const subCategoryBalance = this.calculateDistributionBalance(subCategoryDist);

    // Calculate weighted average
    const totalBalance = (categoryBalance * WEIGHTS.CATEGORY) + 
                        (subCategoryBalance * WEIGHTS.SUBCATEGORY);

    console.log('Balance calculation:', {
      distributions: { categoryDist, subCategoryDist },
      scores: { categoryBalance, subCategoryBalance, totalBalance }
    });

    return Math.round(totalBalance);
  }

  calculateScheduleDifficulty(schedule) {
      if (!schedule.length) return 0;

      let totalDifficulty = 0;
      schedule.forEach(course => {
          const courseDetails = this.courseDetails.get(course.courseId);
          if (!courseDetails?.details) return;

          let score = 0;
          score += (courseDetails.details.numQuizzes || 0) * 2;
          score += (courseDetails.details.numAssignments || 0) * 3;
          score += (courseDetails.details.numProjects || 0) * 5;
          score += (courseDetails.details.numCertificates || 0) * 2;
          score += courseDetails.details.isLab ? 4 : 0;

          const examScores = {
              'mid-final': 4,
              'first-second': 5,
              'practical': 3
          };
          score += examScores[courseDetails.details.examType] || 0;

          const preference = courseDetails.subCategory ? 
              this.preferences.categoryPreferences[courseDetails.subCategory] : 'neutral';
          
          const multiplier = {
              'prefer': 0.8,
              'neutral': 1.0,
              'dislike': 1.2
          }[preference] || 1.0;

          totalDifficulty += score * multiplier;
      });

      return Math.round(totalDifficulty / schedule.length);
  }

  validateSchedule(schedule) {
    const checks = {
      creditHours: this.checkCreditHours(schedule),
      categoryLimits: this.checkCategoryLimits(schedule),
      labDistribution: this.checkLabDistribution(schedule),
      specialRules: this.checkSpecialCourseRules(schedule),
      universityElectives: this.checkUniversityElectivesConstraint(schedule),
      timeConflicts: this.checkTimeConflicts(schedule)
    };

    const isValid = Object.values(checks).every(check => check === true);

    console.log('Schedule validation:', {
      isValid,
      creditHours: this.calculateTotalCredits(schedule),
      checks
    });

    return isValid;
  }

  checkCreditHours(schedule) {
    const totalCredits = this.calculateTotalCredits(schedule);
    
    // Regular semester: 12-18 credits
    // Summer semester: 3-10 credits
    const { minCredits, maxCredits } = this.constraints;
  
    console.log('Credit hours check:', {
      total: totalCredits,
      min: minCredits,
      max: maxCredits,
      type: this.semesterType,
      targetCredits: this.preferences.targetCreditHours
    });
  
    // Must meet both semester constraints and user preference
    return totalCredits >= minCredits && 
           totalCredits <= Math.min(maxCredits, this.preferences.targetCreditHours);
  }

  checkCategoryLimits(schedule) {
    // Track counts
    const counts = {
      'متطلبات الجامعة الاختيارية': {
        total: 0,
        groups: {
          GROUP1: 0,
          GROUP2: 0,
          GROUP3: 0
        }
      },
      'متطلبات التخصص الاختيارية': 0
    };
  
    // Count courses
    for (const course of schedule) {
      // University electives check
      if (course.description === 'متطلبات الجامعة الاختيارية') {
        counts['متطلبات الجامعة الاختيارية'].total++;
        
        // Find group and increment count
        for (const [group, data] of Object.entries(UNIVERSITY_ELECTIVES)) {
          if (data.courses.includes(course.courseId)) {
            counts['متطلبات الجامعة الاختيارية'].groups[group]++;
          }
        }
      }
  
      // Major electives check
      if (course.description === 'متطلبات التخصص الاختيارية') {
        counts['متطلبات التخصص الاختيارية']++;
      }
    }
  
    // Validate constraints
    const uniElectives = counts['متطلبات الجامعة الاختيارية'];
    if (uniElectives.total > 3) {
      console.log('Too many university electives');
      return false;
    }
  
    // Check one course per group limit
    for (const [group, count] of Object.entries(uniElectives.groups)) {
      if (count > 1) {
        console.log(`More than one course from ${group}`);
        return false;
      }
    }
  
    // Check major electives limit
    if (counts['متطلبات التخصص الاختيارية'] > 5) {
      console.log('Too many major electives');
      return false;
    }
  
    return true;
  }

  checkLabDistribution(schedule) {
    // Skip check for summer semester
    if (this.semesterType === 'SUMMER') return true;

    const labCourses = schedule.filter(course => 
      course.details?.isLab || 
      course.courseName?.toLowerCase().includes('مختبر') ||
      course.description?.toLowerCase().includes('مختبر')
    );

    const labCount = labCourses.length;
    
    console.log('Lab distribution check:', {
      labCount,
      minRequired: LAB_CONSTRAINTS.MIN_LABS,
      maxAllowed: LAB_CONSTRAINTS.MAX_LABS,
      labs: labCourses.map(c => c.courseId)
    });

    return labCount >= LAB_CONSTRAINTS.MIN_LABS && 
           labCount <= LAB_CONSTRAINTS.MAX_LABS;
  }

  checkSpecialCourseRules(schedule) {
    for (const course of schedule) {
        const rules = SPECIAL_COURSE_CONSTRAINTS[course.courseId];
        if (!rules) continue;

        // Credit hours requirement
        if (rules.minCreditHours && this.student.creditHours < rules.minCreditHours) {
            console.log(`Credit hours requirement not met for ${course.courseId} (needs ${rules.minCreditHours}, has ${this.student.creditHours})`);
            return false;
        }

        // Summer restrictions
        if (this.semesterType === 'SUMMER') {
            if (rules.noSummerAllowed) {
                console.log(`Course ${course.courseId} not allowed in summer`);
                return false;
            }
        }

        // Special course-specific rules
        switch (course.courseId) {
            case '0947500': // Training
                if (this.semesterType === 'REGULAR') {
                    const otherCourses = schedule.filter(c => c.courseId !== '0947500');
                    const allowedWithTraining = ['0977598', '0977599'];
                    
                    if (!otherCourses.every(c => allowedWithTraining.includes(c.courseId))) {
                        console.log('Training can only be taken with projects');
                        return false;
                    }
                }
                break;

            case '0901420': // اقتصاد هندسي
                if (this.student.creditHours < 90) {
                    console.log('Need 90 credit hours for اقتصاد هندسي');
                    return false;
                }
                break;

            case '0977598': // مشروع 1
            case '0977599': // مشروع 2
                if (this.semesterType === 'SUMMER') {
                    console.log('Projects not allowed in summer');
                    return false;
                }
                break;
        }
    }

    return true;
}

  checkUniversityElectivesBalance(schedule) {
    const subcategoryCounts = new Map();
    
    for (const course of schedule) {
      if (course.description === 'متطلبات الجامعة الاختيارية') {
        const count = (subcategoryCounts.get(course.subCategory) || 0) + 1;
        if (count > CATEGORY_CONSTRAINTS['متطلبات الجامعة الاختيارية'].maxPerSubcategory) {
          return false;
        }
        subcategoryCounts.set(course.subCategory, count);
      }
    }
    
    return true;
  }

  async buildSchedule(prioritizedCourses, targetCredits) {
    let schedule = [];
    let currentCredits = 0;
    let labCount = 0;

    for (const course of prioritizedCourses) {
        if (currentCredits + course.creditHours <= targetCredits) {
            // Check lab limit before adding
            if (course.details?.isLab && labCount >= LAB_CONSTRAINTS.MAX_LABS) {
                continue;
            }

            const section = await this.findCompatibleSection(course, schedule);
            if (section) {
                schedule.push(section);
                currentCredits += course.creditHours;
                if (course.details?.isLab) labCount++;
            }
        }
    }

    return this.validateScheduleWithDetails(schedule).isValid ? schedule : null;
}

  async canAddCourse(course, schedule, currentCredits) {
    // Check credit limit
    if (currentCredits + course.creditHours > this.constraints.maxCredits) {
      return { allowed: false, reason: 'Credit limit exceeded' };
    }
  
    // Check special constraints
    const specialConstraint = SPECIAL_COURSE_CONSTRAINTS[course.courseId];
    if (specialConstraint) {
      if (specialConstraint.minCreditHours > this.student.creditHours) {
        return { allowed: false, reason: 'Credit hours requirement not met' };
      }
      if (course.courseId === '0947500') {
        if (!this.checkTrainingCourseRestrictions(schedule)) {
          return { allowed: false, reason: 'Training course restrictions' };
        }
      }
    }
  
    // Check category limits
    if (!this.checkCategoryLimit(course, schedule)) {
      return { allowed: false, reason: 'Category limit reached' };
    }
  
    return { allowed: true };
  }

  async findCompatibleSection(course, currentSchedule) {
    try {
      const availableSections = this.availableSections.courses
        .find(c => c.courseId === course.courseId)?.sections;
  
      if (!availableSections?.length) {
        console.log(`No sections found for ${course.courseId}`);
        return null;
      }
  
      // Filter valid sections
      const validSections = availableSections.filter(section => {
        if (!section || !section.days || !section.time) return false;
        return true;
      });
  
      // Find compatible section
      const compatibleSection = validSections.find(section =>
        !currentSchedule.some(scheduled => this.hasTimeConflict(section, scheduled))
      );
  
      if (compatibleSection) {
        // Get full course details including name
        const courseDetails = this.courseDetails.get(course.courseId);
        
        return {
          courseId: course.courseId,
          courseName: courseDetails?.courseName || '', // Add course name
          section: compatibleSection.section,
          days: compatibleSection.days,
          time: compatibleSection.time,
          creditHours: course.creditHours,
          description: course.description,
          subCategory: course.subCategory,
          details: course.details
        };
      }
  
      return null;
    } catch (error) {
      console.error('Error finding compatible section:', error);
      return null;
    }
  }

  normalizeDays(days) {
    // Handle special cases
    if (days === 'N/A') return 'N/A';
    
    // Sort days in consistent order
    const dayOrder = {
      'Sunday': 0,
      'Monday': 1, 
      'Tuesday': 2,
      'Wednesday': 3,
      'Thursday': 4
    };

    return days.split('-')
      .sort((a,b) => dayOrder[a] - dayOrder[b])
      .join('-');
  }

  parseTimeToMinutes(timeString) {
    const [start, end] = timeString.split(' - ');
    return [
      this.timeToMinutes(start),
      this.timeToMinutes(end)
    ];
  }

  timesOverlap(time1, time2) {
    // Add null checks
    if (!time1 || !time2) {
      console.log('Invalid time values:', { time1, time2 });
      return false;
    }

    try {
      const [start1, end1] = time1.split(' - ').map(this.timeToMinutes);
      const [start2, end2] = time2.split(' - ').map(this.timeToMinutes);
      return start1 < end2 && end1 > start2;
    } catch (error) {
      console.error('Error comparing times:', error);
      return false;
    }
  }

  timeToMinutes(time) {
    if (!time) {
      console.log('Invalid time format:', time);
      return 0;
    }

    try {
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes;
    } catch (error) {
      console.error('Error converting time to minutes:', error);
      return 0;
    }
  }

  getBestSection(sections, schedule) {
    return sections.sort((a, b) => {
      // Prefer sections on preferred days
      const aPreferredDays = this.preferences.preferredDays.includes(a.days);
      const bPreferredDays = this.preferences.preferredDays.includes(b.days);
      if (aPreferredDays !== bPreferredDays) {
        return bPreferredDays ? 1 : -1;
      }

      // Then sort by break time score
      return this.getBreakScore(b, schedule) - this.getBreakScore(a, schedule);
    })[0];
  }

  getBreakScore(section, schedule) {
    // ... existing break score calculation ...
    return 0; // placeholder
  }

  calculateMetrics(schedule) {
    if (!schedule?.length) {
      return null;
    }
  
    const { categoryDist, subCategoryDist } = this.calculateDistributions(schedule);
    const difficultyResult = this.calculateDifficultyScore(schedule);
    const subcategoryProgress = this.calculateSubcategoryProgress();
  
    return {
      totalCreditHours: this.calculateTotalCredits(schedule),
      difficultyScore: {
        score: difficultyResult.score,
        level: difficultyResult.level
      },
      balanceScore: this.calculateBalanceScore(schedule),
      categoryDistribution: subCategoryDist,
      subcategoryProgress // Add this
    };
  }
  

  calculateTotalCredits(schedule) {
    return schedule.reduce((sum, course) => sum + course.creditHours, 0);
  }

  calculateDifficultyScore(schedule) {
    const MAX_DIFFICULTY_PER_COURSE = 10;
    
    const totalScore = schedule.reduce((total, course) => {
      // Get base difficulty based on category
      let baseDifficulty = SCHEDULING_RULES.DIFFICULTY_BASE[course.description] || 1;

      // Add factors
      const components = {
        lab: course.details?.isLab ? 2 : 0,
        projects: (course.details?.numProjects || 0) * 1.5,
        quizzes: (course.details?.numQuizzes || 0) * 0.5,
        assignments: (course.details?.numAssignments || 0) * 0.5,
        credits: course.creditHours * 0.5,
        categoryPreference: this.getCategoryPreferenceFactor(course),
        historicalPerformance: this.getHistoricalPerformanceFactor(course)
      };

      const courseDifficulty = Math.min(
        baseDifficulty * Object.values(components).reduce((sum, val) => sum + val, 0),
        MAX_DIFFICULTY_PER_COURSE
      );

      return total + courseDifficulty;
    }, 0);

    const maxPossibleScore = schedule.length * MAX_DIFFICULTY_PER_COURSE;
    const difficultyPercentage = (totalScore / maxPossibleScore) * 100;

    let difficultyLevel = this.getDifficultyLevel(difficultyPercentage);

    return {
      score: Math.round(difficultyPercentage),
      level: difficultyLevel
    };
  }

  getCategoryPreferenceFactor(course) {
    const preference = this.preferences.categoryPreferences[course.subCategory];
    return {
      'prefer': 0.8,
      'neutral': 1.0,
      'dislike': 1.2
    }[preference] || 1.0;
  }

  getHistoricalPerformanceFactor(course) {
    const categoryGrades = this.student.completedCourses
      .filter(c => c.description === course.description)
      .map(c => this.gradeToNumber(c.grade));

    if (!categoryGrades.length) return 1;

    const avgGrade = categoryGrades.reduce((a, b) => a + b) / categoryGrades.length;
    return avgGrade >= 3 ? 0.8 : avgGrade >= 2 ? 1 : 1.2;
  }

  getDifficultyLevel(percentage) {
    if (percentage >= 80) return "Very Challenging";
    if (percentage >= 60) return "Challenging";
    if (percentage >= 40) return "Moderate";
    return "Manageable";
  }

  gradeToNumber(grade) {
    const gradeMap = {
      'A': 4.0, 'A-': 3.75,
      'B+': 3.5, 'B': 3.0, 'B-': 2.75,
      'C+': 2.5, 'C': 2.0, 'C-': 1.75,
      'D+': 1.5, 'D': 1.0, 'D-': 0.75,
      'F': 0
    };
    return gradeMap[grade] || 0;
  }

  calculateCategoryDistribution(schedule) {
    return schedule.reduce((dist, course) => {
      const category = course.details?.category || 'other';
      dist[category] = (dist[category] || 0) + 1;
      return dist;
    }, {
      networking: 0,
      hardware: 0,
      software: 0,
      electrical: 0,
      other: 0
    });
  }

  checkTimeConflicts(schedule) {
    for (let i = 0; i < schedule.length; i++) {
      for (let j = i + 1; j < schedule.length; j++) {
        if (schedule[i].days === schedule[j].days) {
          const [start1, end1] = this.parseTimeToMinutes(schedule[i].time);
          const [start2, end2] = this.parseTimeToMinutes(schedule[j].time);
  
          if (!(end1 <= start2 || start1 >= end2)) {
            console.log('Time conflict found:', {
              course1: schedule[i].courseId,
              course2: schedule[j].courseId,
              time1: schedule[i].time,
              time2: schedule[j].time
            });
            return false;
          }
        }
      }
    }
    return true;
  }

  checkCategoryLimit(course, schedule) {
    if (course.description === 'متطلبات الجامعة الاختيارية') {
      const currentCount = schedule.filter(c => 
        c.description === 'متطلبات الجامعة الاختيارية'
      ).length;

      if (currentCount >= CATEGORY_CONSTRAINTS['متطلبات الجامعة الاختيارية'].maxCourses) {
        console.log('University electives limit reached');
        return false;
      }

      // Check subcategory
      const subcategoryCount = schedule.filter(c => 
        c.description === 'متطلبات الجامعة الاختيارية' && 
        c.subCategory === course.subCategory
      ).length;

      if (subcategoryCount >= CATEGORY_CONSTRAINTS['متطلبات الجامعة الاختيارية'].maxPerSubcategory) {
        console.log('Subcategory limit reached:', course.subCategory);
        return false;
      }
    }
    return true;
  }

  checkTrainingCourseRestrictions(schedule) {
    // Training course can only be taken alone or with specific projects
    const otherCourses = schedule.filter(c => c.courseId !== '0947500');
    return otherCourses.length === 0 || 
           otherCourses.every(c => ['0977598', '0977599'].includes(c.courseId));
  }

  // Add missing method
  #getCreditTargets() {
    const targets = [
      this.preferences.targetCreditHours || 15,
      Math.floor((this.constraints.maxCredits + this.constraints.minCredits) / 2),
      this.constraints.minCredits
    ];

    // Filter valid targets and remove duplicates
    return [...new Set(targets.filter(target => 
      target >= this.constraints.minCredits && 
      target <= this.constraints.maxCredits
    ))];
  }

  // Add missing helper functions
  calculateAverageGrade(grades) {
    if (!grades?.length) return 0;
    const gradeValues = {
      'A': 4, 'A-': 3.75,
      'B+': 3.5, 'B': 3, 'B-': 2.75,
      'C+': 2.5, 'C': 2, 'C-': 1.75,
      'D+': 1.5, 'D': 1, 'D-': 0.75,
      'F': 0
    };
    
    const sum = grades.reduce((acc, grade) => acc + (gradeValues[grade] || 0), 0);
    return sum / grades.length;
  }

  getGradeFactor(avgGrade) {
    if (avgGrade >= 3.5) return 0.8;  // Good performance
    if (avgGrade >= 2.5) return 1.0;  // Average performance
    return 1.2;  // Poor performance
  }

  validateCourseData(course) {
    return course && course.description && 
      Object.values(COURSE_CATEGORIES).includes(course.description);
  }

  calculateDistributions(schedule) {
    const total = schedule.length;

    // Category distribution
    const categoryDist = schedule.reduce((acc, course) => {
      const category = course.description;
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {});

    // Technical subcategory distribution
    const subCategoryCounts = schedule.reduce((acc, course) => {
      const subCategory = course.subCategory;
      if (['networking', 'hardware', 'software', 'electrical'].includes(subCategory)) {
        acc[subCategory] = (acc[subCategory] || 0) + 1;
      }
      return acc;
    }, {
      networking: 0,
      hardware: 0,
      software: 0,
      electrical: 0
    });

    // Convert to precise percentages
    const subCategoryDist = {};
    Object.keys(subCategoryCounts).forEach(key => {
      const percentage = (subCategoryCounts[key] / total) * 100;
      subCategoryDist[key] = Number(percentage.toFixed(2)); // 2 decimal places
    });

    return { categoryDist, subCategoryDist };
  }

  calculateDistributionBalance(distribution) {
    const counts = Object.values(distribution).filter(count => count > 0);
    if (counts.length <= 1) return 100; // Perfect balance if only one category

    const avg = counts.reduce((a,b) => a + b) / counts.length;
    const maxDeviation = Math.max(...counts.map(c => Math.abs(c - avg)));
    const maxPossibleDeviation = avg * (counts.length - 1);
    
    return 100 * (1 - (maxDeviation / maxPossibleDeviation));
  }

  // Add to scheduleService.js
  calculateChainPriority(course) {
    const visited = new Set();
    const memo = new Map();
    
    const dfs = (courseId, depth = 0) => {
      if (memo.has(courseId)) return memo.get(courseId);
      if (visited.has(courseId)) return 0;
      
      visited.add(courseId);
      let score = 0;
      
      // Find dependent courses (that require this as prerequisite)
      const dependents = Array.from(this.courseDetails.values())
        .filter(c => c.prerequisites?.includes(courseId));
        
      for (const dep of dependents) {
        const depthBonus = Math.pow(0.9, depth); // Less decay
        const creditFactor = dep.creditHours / 3;
        const categoryFactor = this.getCategoryImportanceFactor(dep);
        
        score += (1 + dfs(dep.courseId, depth + 1)) * 
                 depthBonus * 
                 creditFactor * 
                 categoryFactor;
      }
      
      memo.set(courseId, score);
      return score;
    };
  
    return dfs(course.courseId);
  }

  // Add to scheduleService.js
  calculateSubcategoryProgress() {
    const progress = {
      networking: { passed: 0, total: 0 },
      hardware: { passed: 0, total: 0 },
      software: { passed: 0, total: 0 },
      electrical: { passed: 0, total: 0 }
    };
    
    // Calculate totals
    this.courseDetails.forEach(course => {
      if (course.description === 'متطلبات التخصص الإجبارية' && course.subCategory) {
        progress[course.subCategory].total++;
        
        const passed = this.student.completedCourses?.find(c => 
          c.courseId === course.courseId && 
          !['F', 'D-'].includes(c.grade)
        );
        if (passed) progress[course.subCategory].passed++;
      }
    });
    
    return progress;
  }

  // Add this method
  checkUniversityElectivesConstraint(schedule) {
    const electivesByGroup = {
      GROUP1: 0,
      GROUP2: 0, 
      GROUP3: 0
    };
  
    for (const course of schedule) {
      if (course.description === 'متطلبات الجامعة الاختيارية') {
        let groupFound = false;
        for (const [group, data] of Object.entries(UNIVERSITY_ELECTIVES)) {
          if (data.courses.includes(course.courseId)) {
            electivesByGroup[group]++;
            groupFound = true;
            if (electivesByGroup[group] > 1) {
              console.log(`Exceeded limit for ${group}`);
              return false;
            }
          }
        }
        if (!groupFound) {
          console.log(`Course ${course.courseId} not found in any elective group`);
        }
      }
    }
  
    const totalElectives = Object.values(electivesByGroup).reduce((a,b) => a+b, 0);
    return totalElectives <= 3;
  }

  validateScheduleWithCourse(schedule, newCourse) {
    const testSchedule = [...schedule, newCourse];
    
    return this.checkTimeConflicts(testSchedule) &&
           this.checkCategoryBalance(testSchedule) &&
           this.checkDifficultyBalance(testSchedule);
  }

  isReplacementForFailedElective(course, schedule) {
    // Check if there's a failed elective of the same category
    const failedElectives = this.student.completedCourses?.filter(c => 
      ['F', 'D-'].includes(c.grade) &&
      this.courseDetails.get(c.courseId)?.description === course.description
    );

    if (!failedElectives?.length) return false;

    // If there's a failed elective in this category and this course isn't it,
    // then it's an invalid replacement
    return !failedElectives.some(failed => failed.courseId === course.courseId);
  }

  canAddMoreCourses(currentCredits, courseCredits) {
    const potentialTotal = currentCredits + courseCredits;
    return potentialTotal <= this.constraints.maxCredits &&
           potentialTotal <= this.preferences.targetCreditHours;
  }

  logScheduleAttempt(schedule, validation) {
    console.log('Schedule attempt:', {
      courses: schedule.map(c => ({
        id: c.courseId,
        credits: c.creditHours,
        category: c.description
      })),
      totalCredits: this.calculateTotalCredits(schedule),
      validationResults: validation
    });
  }

  // Add missing helper method if needed
  getCategoryImportanceFactor(course) {
    switch (course.description) {
        case 'متطلبات التخصص الإجبارية':
            return 2.0;
        case 'متطلبات الكلية الإجبارية':
            return 1.5;
        default:
            return 1.0;
    }
  }
}

function checkCategoryBalance(schedule) {
  const categoryCounts = {};
  
  for (const course of schedule) {
    categoryCounts[course.description] = (categoryCounts[course.description] || 0) + 1;
  }

  // Check university electives
  if (categoryCounts['متطلبات الجامعة الاختيارية'] > 3) return false;

  // Check major electives  
  if (categoryCounts['متطلبات التخصص الاختيارية'] > 5) return false;

  return true;
}

class DifficultyCalculator {
  calculateCourseDifficulty(course, studentPreferences, studentGrades) {
    const baseScore = this.getBaseScore(course);
    const categoryFactor = this.getCategoryFactor(course, studentPreferences);
    const historicalFactor = this.getHistoricalFactor(course, studentGrades);
    
    return (baseScore * 0.4) + (categoryFactor * 0.3) + (historicalFactor * 0.3);
  }

  getBaseScore(course) {
    return (
      (course.isLab ? 2 : 1) +
      (course.numProjects * 0.5) +
      (course.numQuizzes * 0.3) +
      (course.numAssignments * 0.2) +
      (course.examType === 'COMPREHENSIVE' ? 2 : 1)
    );
  }
}

function calculateCourseDifficulty(course, studentGrades, preferences) {
    let score = 0;
    
    // Base difficulty from course details
    score += course.details.isLab ? 3 : 0;
    score += course.details.numProjects * 2;
    score += course.details.numQuizzes;
    score += course.details.numAssignments;
    
    // Category performance factor
    const categoryGrades = studentGrades.filter(g => 
        g.courseCategory === course.description
    );
    const avgGrade = calculateAverageGrade(categoryGrades);
    score *= getGradeFactor(avgGrade);
    
    // User preference factor
    const prefFactor = preferences[course.subCategory] === 'prefer' ? 0.8 : 1.2;
    score *= prefFactor;
    
    return score;
}

function distributeLabs(availableCourses, remainingSemesters) {
    const totalLabs = availableCourses.filter(c => c.details.isLab).length;
    const minLabsPerSemester = Math.ceil(totalLabs / remainingSemesters);
    
    return {
        minLabs: Math.max(1, minLabsPerSemester),
        maxLabs: Math.min(3, minLabsPerSemester + 1)
    };
}

const calculateProgressMetrics = (passedCourses) => {
  const metrics = {
    overallCredits: { earned: 0, total: 161  },
    categories: {
      'متطلبات الجامعة الإجبارية': { current: 0, total: 18 },
      'متطلبات الجامعة الاختيارية': { current: 0, total: 9 },
      'متطلبات الكلية الإجبارية': { current: 0, total: 27 },
      'متطلبات التخصص الإجبارية': { current: 0, total: 92 },
      'متطلبات التخصص الاختيارية': { current: 0, total: 15 }
    }
  };

  // Calculate earned credits and category progress
  passedCourses.forEach(course => {
    if (!['F', 'D-'].includes(course.grade)) {
      metrics.overallCredits.earned += course.creditHours;
      if (metrics.categories[course.description]) {
        metrics.categories[course.description].current += course.creditHours;
      }
    }
  });

  return metrics;
};

module.exports = ScheduleGenerator;