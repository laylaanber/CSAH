const { PRIORITIES, SCHEDULING_RULES, LAB_CONSTRAINTS } = require('../constants/ScheduleConstants');
const ChainCalculator = require('./ChainCalculator');
const ScheduleLogger = require('../ScheduleLogger');

class ScheduleCalculator {
    constructor(student, preferences, courseDetails) {
        this.student = student;
        this.preferences = preferences;
        this.courseDetails = courseDetails;
        this.logger = new ScheduleLogger();
        this.chainCalculator = new ChainCalculator(courseDetails, this.logger);
    }

    calculatePriority(course) {
        const weights = {
            failedCourse: 1000,
            improvementCourse: 800,
            coreLab: 600,
            chainValue: 400,
            preferredCategory: 200
        };

        let priority = 0;

        // Calculate chain value
        const chainScores = this.chainCalculator.calculateChainScore(course);
        const chainValue = (chainScores.forward * 0.7) + (chainScores.backward * 0.3);
        priority += chainValue * weights.chainValue;

        // Failed course highest priority
        if (this.isFailed(course)) {
            priority += weights.failedCourse;
        }

        // Improvement requests high priority
        if (this.isImprovement(course)) {
            priority += weights.improvementCourse;
        }

        // Core labs priority
        if (['0302111', '0907101'].includes(course.courseId)) {
            priority += weights.coreLab;
        }

        // Chain value consideration
        priority += this.calculateChainValue(course.courseId) * weights.chainValue;

        // Category preferences
        if (this.preferences.categoryPreferences[course.subCategory] === 'prefer') {
            priority += weights.preferredCategory;
        }

        return priority;
    }

    getGPAImprovementScore(course) {
        const previousAttempt = this.student.completedCourses?.find(c => 
            c.courseId === course.courseId
        );

        if (!previousAttempt) return 0;

        const gradeValues = {
            'F': 0, 'D-': 0.75, 'D': 1, 'D+': 1.5,
            'C-': 1.75, 'C': 2, 'C+': 2.5,
            'B-': 2.75, 'B': 3, 'B+': 3.5,
            'A-': 3.75, 'A': 4
        };

        const numericGrade = gradeValues[previousAttempt.grade] || 0;
        return (4 - numericGrade) * 2;
    }

    calculateDifficultyScore(schedule) {
        const MAX_DIFFICULTY_PER_COURSE = 10;
        
        const totalScore = schedule.reduce((total, course) => {
            // Base difficulty
            let baseDifficulty = SCHEDULING_RULES.DIFFICULTY_BASE[course.description] || 1;

            // Components
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

        return {
            score: Math.round(difficultyPercentage),
            level: this.getDifficultyLevel(difficultyPercentage)
        };
    }

    calculateBalanceScore(schedule) {
        const { categoryDist, subCategoryDist } = this.calculateDistributions(schedule);

        const WEIGHTS = {
            CATEGORY: 0.4,
            SUBCATEGORY: 0.6
        };

        const categoryBalance = this.calculateDistributionBalance(categoryDist);
        const subCategoryBalance = this.calculateDistributionBalance(subCategoryDist);

        return Math.round((categoryBalance * WEIGHTS.CATEGORY) + 
                         (subCategoryBalance * WEIGHTS.SUBCATEGORY));
    }

    calculateTotalCredits(schedule) {
        return schedule.reduce((sum, course) => sum + course.creditHours, 0);
    }

    // Helper methods
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

    calculateDistributions(schedule) {
        const categoryDist = this.calculateCategoryDistribution(schedule);
        const subCategoryDist = this.calculateSubcategoryDistribution(schedule);
        return { categoryDist, subCategoryDist };
    }

    calculateCategoryDistribution(schedule) {
        return schedule.reduce((dist, course) => {
            const category = course.description;
            dist[category] = (dist[category] || 0) + 1;
            return dist;
        }, {});
    }

    calculateSubcategoryDistribution(schedule) {
        const subCategories = ['networking', 'hardware', 'software', 'electrical'];
        const counts = schedule.reduce((acc, course) => {
            if (subCategories.includes(course.subCategory)) {
                acc[course.subCategory] = (acc[course.subCategory] || 0) + 1;
            }
            return acc;
        }, {});

        // Convert to percentages
        const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
        return Object.fromEntries(
            Object.entries(counts).map(([key, value]) => [
                key,
                Number(((value / total) * 100).toFixed(2))
            ])
        );
    }

    calculateDistributionBalance(distribution) {
        const counts = Object.values(distribution).filter(count => count > 0);
        if (counts.length <= 1) return 100;

        const avg = counts.reduce((a, b) => a + b) / counts.length;
        const maxDeviation = Math.max(...counts.map(c => Math.abs(c - avg)));
        const maxPossibleDeviation = avg * (counts.length - 1);
        
        return 100 * (1 - (maxDeviation / maxPossibleDeviation));
    }

    prioritizeCourses(courses) {
        // Add lab priority boost
        return courses.map(course => ({
            ...course,
            priority: this.calculatePriority(course) + (this.isLabCourse(course) ? 1000 : 0)
        }))
        .sort((a, b) => b.priority - a.priority);
    }

    getSpecificRequestScore(course) {
        return this.preferences.specificCourses?.includes(course.courseId) ? 10 : 0;
    }

    getChainPrerequisiteScore(course) {
        return 0; // Basic implementation, enhance as needed
    }

    getCategoryBalanceScore(course) {
        return 5; // Basic implementation, enhance as needed
    }

    getLabDistributionScore(course) {
        return this.isLabCourse(course) ? 7 : 0;
    }

    isLabCourse(course) {
        return course.details?.isLab || 
               course.courseName?.toLowerCase().includes('مختبر') ||
               ['0302111', '0302112', '0907101', '0966111'].includes(course.courseId);
    }

    calculateMetrics(schedule) {
        if (!schedule?.length) {
            return null;
        }

        const { categoryDist, subCategoryDist } = this.calculateDistributions(schedule);
        const difficultyResult = this.calculateDifficultyScore(schedule);

        // Calculate subcategory progress
        const subcategoryProgress = this.calculateSubcategoryProgress(schedule);

        return {
            totalCreditHours: this.calculateTotalCredits(schedule),
            difficultyScore: {
                score: difficultyResult.score,
                level: difficultyResult.level
            },
            balanceScore: this.calculateBalanceScore(schedule),
            categoryDistribution: subCategoryDist,
            subcategoryProgress
        };
    }

    calculateSubcategoryProgress(schedule) {
        const progress = {
            networking: { passed: 0, total: 0 },
            hardware: { passed: 0, total: 0 },
            software: { passed: 0, total: 0 },
            electrical: { passed: 0, total: 0 }
        };

        // Calculate progress based on student's completed courses
        this.student.completedCourses?.forEach(course => {
            const category = course.subCategory;
            if (progress[category]) {
                progress[category].total++;
                if (!['F', 'D-'].includes(course.grade)) {
                    progress[category].passed++;
                }
            }
        });

        // Add current schedule courses
        schedule.forEach(course => {
            const category = course.subCategory;
            if (progress[category]) {
                progress[category].total++;
            }
        });

        return progress;
    }

    calculateBasicCategoryScore(schedule) {
        const basicCategories = [
            'متطلبات الجامعة الاختيارية',
            'متطلبات الجامعة الإجبارية',
            'متطلبات إجبارية عامة'
        ];
        
        const counts = schedule.reduce((acc, course) => {
            if (basicCategories.includes(course.description)) {
                acc[course.description] = (acc[course.description] || 0) + 1;
            }
            return acc;
        }, {});

        // Max one course per category
        const exceedsPerCategory = Object.values(counts).some(count => count > 1);
        if (exceedsPerCategory) return -1000;

        // Max two courses total
        const totalBasic = Object.values(counts).reduce((a, b) => a + b, 0);
        return totalBasic > 2 ? -800 : 0;
    }

    calculateCourseDifficulty(course) {
        // Base difficulty from course components
        const baseScore = (
            (course.details?.numQuizzes || 0) * 2 +
            (course.details?.numProjects || 0) * 5 +
            (course.details?.numAssignments || 0) * 3 +
            (course.details?.numCertificates || 0) * 2
        );
        
        // Category preference adjustment
        const prefFactor = this.getCategoryPreferenceFactor(course);
        
        // Historical performance adjustment
        const historyFactor = this.getHistoricalPerformanceFactor(course);
        
        return baseScore * prefFactor * historyFactor;
    }

    calculateChainValue(courseId) {
        if (!courseId || !this.courseDetails) return 0;

        const courseDetails = this.courseDetails.get(courseId);
        if (!courseDetails) return 0;

        // Get all courses that require this as prerequisite
        const unlockedCourses = Array.from(this.courseDetails.values())
            .filter(course => course.prerequisites?.includes(courseId));
        
        // Calculate chain depth and breadth
        let chainValue = 0;
        const processCourse = (course, depth = 0) => {
            if (depth > 3) return; // Limit recursion depth
            chainValue += 100 * (1 / (depth + 1)); // Value decreases with depth
            
            // Process next level
            const nextCourses = Array.from(this.courseDetails.values())
                .filter(c => c.prerequisites?.includes(course.courseId));
            nextCourses.forEach(c => processCourse(c, depth + 1));
        };

        unlockedCourses.forEach(course => processCourse(course));
        return chainValue;
    }

    isFailed(course) {
        const previousAttempt = this.student.completedCourses?.find(c => 
            c.courseId === course.courseId
        );
        return previousAttempt && ['F', 'D-'].includes(previousAttempt.grade);
    }

    isImprovement(course) {
        return this.preferences.coursesToImprove?.includes(course.courseId) &&
               !this.isFailed(course);
    }
}

module.exports = ScheduleCalculator;