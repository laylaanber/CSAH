const { PRIORITIES, SCHEDULING_RULES, LAB_CONSTRAINTS } = require('../constants/ScheduleConstants');
const ChainCalculator = require('./ChainCalculator');
const ScheduleLogger = require('../ScheduleLogger');

const CATEGORY_BALANCE = {
    'متطلبات الجامعة الإجبارية': { min: 0, max: 1 },
    'متطلبات الجامعة الاختيارية': { min: 0, max: 1 },
    'متطلبات إجبارية عامة': { min: 0, max: 1 },
    'متطلبات الكلية الإجبارية': { min: 1, max: 3 },
    'متطلبات التخصص الإجبارية': { min: 3, max: 4 },
    'متطلبات التخصص الاختيارية': { min: 1, max: 2 }
};

const CATEGORY_WEIGHTS = {
    'متطلبات التخصص الإجبارية': 0.35,
    'متطلبات التخصص الاختيارية': 0.25,
    'متطلبات الكلية الإجبارية': 0.20,
    'متطلبات الجامعة الإجبارية': 0.10,
    'متطلبات الجامعة الاختيارية': 0.05,
    'متطلبات إجبارية عامة': 0.05
};

class ScheduleCalculator {
    constructor(student, preferences, courseDetails) {
        this.student = student;
        this.preferences = preferences;
        this.courseDetails = courseDetails;
        this.logger = new ScheduleLogger();
        this.chainCalculator = new ChainCalculator(courseDetails, this.logger);
    }

    calculatePriority(course) {
        // Initialize priority
        let priority = 0;

        // Calculate chain value first
        const chainScores = this.chainCalculator.calculateChainScore(course);
        const chainValue = (chainScores.forward * 0.7 + chainScores.backward * 0.3);
        
        // High priority for foundation courses with high chain value
        if (course.description === 'متطلبات إجبارية عامة' && chainValue > 0) {
            priority += chainValue * 300; // Increase multiplier for chain value
        }

        // Add other priority factors
        if (this.isFailed(course)) {
            priority += Number.MAX_SAFE_INTEGER;
        } else if (this.isImprovement(course)) {
            priority += 800;
        }

        // Log priority calculation
        this.logger.logProgress('Priority calculation', {
            courseId: course.courseId,
            description: course.description,
            chainValue,
            finalPriority: priority
        });

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
        if (!Array.isArray(schedule)) {
            this.logger.logError('Invalid schedule format in difficulty calculation');
            return { score: 0, level: 'Error' };
        }

        const MAX_DIFFICULTY_PER_COURSE = 10;
        
        const totalScore = schedule.reduce((total, course) => {
            // Log start of course difficulty calculation
            this.logger.logProgress('Calculating course difficulty', {
                courseId: course.courseId,
                courseName: course.courseName
            });

            // Base difficulty by category
            const baseDifficulty = SCHEDULING_RULES.DIFFICULTY_BASE[course.description] || 1;
            
            // Component scores
            const components = {
                // Course structural difficulty
                structure: this.getStructuralDifficulty(course, schedule),
                performance: this.getHistoricalPerformanceFactor(course),
                chainImpact: this.getChainValueImpact(course),
                timeManagement: this.getTimeManagementScore(course, schedule),
                preference: this.getCategoryPreferenceFactor(course)
            };

            // Calculate final course difficulty
            const courseDifficulty = Math.min(
                baseDifficulty * Object.values(components).reduce((sum, val) => sum + val, 0),
                MAX_DIFFICULTY_PER_COURSE
            );

            // Log detailed difficulty breakdown
            this.logger.logProgress('Course difficulty breakdown', {
                courseId: course.courseId,
                baseDifficulty,
                components,
                finalScore: courseDifficulty
            });

            return total + courseDifficulty;
        }, 0);

        const maxPossibleScore = schedule.length * MAX_DIFFICULTY_PER_COURSE;
        const difficultyPercentage = (totalScore / maxPossibleScore) * 100;

        // Log overall schedule difficulty
        this.logger.logProgress('Schedule difficulty calculation complete', {
            totalScore,
            maxPossible: maxPossibleScore,
            percentage: difficultyPercentage,
            level: this.getDifficultyLevel(difficultyPercentage)
        });

        return {
            score: Math.round(difficultyPercentage),
            level: this.getDifficultyLevel(difficultyPercentage)
        };
    }

    getStructuralDifficulty(course, schedule) {
        if (!course?.details) return 0;

        const components = {
            lab: course.details.isLab ? 2 : 0,
            projects: (course.details.numProjects || 0) * 1.5,
            quizzes: (course.details.numQuizzes || 0) * 0.5,
            assignments: (course.details.numAssignments || 0) * 0.5,
            examType: this.getExamTypeScore(course.details.examType, schedule)
        };

        // Log component breakdown
        this.logger.logProgress('Structural difficulty components', {
            courseId: course.courseId,
            ...components
        });

        return Object.values(components).reduce((sum, val) => sum + val, 0);
    }

    getExamTypeScore(examType, schedule) {
        const scores = {
            'first-second': 2.5,  // Increase weight
            'mid-final': 1.5,     
            'practical': 1.0
        };
        
        // Check exam type combinations in schedule
        const hasMultipleTypes = schedule.some(c => 
            c.details?.examType !== examType
        );
        
        return scores[examType] * (hasMultipleTypes ? 1.3 : 1);
    }

    getTimeManagementScore(course, schedule) {
        let score = 0;

        // Projects increase time management difficulty
        if (course.details?.numProjects) {
            score += course.details.numProjects * 1.5;
        }

        // Frequent assessments (quizzes/assignments) add complexity
        const assessmentCount = (course.details?.numQuizzes || 0) + 
                              (course.details?.numAssignments || 0);
        score += assessmentCount * 0.3;

        // Lab courses require additional time commitment
        if (this.isLabCourse(course)) {
            score += 1.5;
        }

        // Check for multiple exam types in schedule
        if (schedule && course.details?.examType) {
            const hasMultipleTypes = schedule.some(c => 
                c !== course && 
                c.details?.examType && 
                c.details.examType !== course.details.examType
            );
            if (hasMultipleTypes) {
                score *= 1.3; // 30% increase for mixed exam types
            }
        }

        this.logger.logProgress('Time management factors', {
            courseId: course.courseId,
            projectImpact: course.details?.numProjects * 1.5,
            assessmentImpact: assessmentCount * 0.3,
            labImpact: this.isLabCourse(course) ? 1.5 : 0,
            totalScore: score
        });

        return score;
    }

    getChainValueImpact(course) {
        const chainScores = this.chainCalculator.calculateChainScore(course);
        // Reduce normalization factor to increase impact
        return (chainScores.forward * 0.7 + chainScores.backward * 0.3) / 20;
    }

    getDifficultyLevel(percentage) {
        if (percentage >= 80) return "Very Challenging";
        if (percentage >= 65) return "Challenging";
        if (percentage >= 45) return "Moderate";
        if (percentage >= 30) return "Manageable";
        return "Basic";
    }

    calculateBalanceScore(schedule) {
        const categoryScore = this.calculateCategoryBalance(schedule);
        const subcategoryScore = this.calculateSubcategoryBalance(schedule);

        // Calculate distributions for logging
        const distributions = this.calculateDistributions(schedule);

        this.logger.logProgress('Balance calculation details', {
            categoryDistribution: distributions.categoryDist,
            subcategoryDistribution: distributions.subCategoryDist,
            finalScores: {
                category: categoryScore,
                subcategory: subcategoryScore,
                final: Math.round((categoryScore * 0.7) + (subcategoryScore * 0.3))
            }
        });

        return Math.round((categoryScore * 0.7) + (subcategoryScore * 0.3));
    }

    calculateCategoryBalance(schedule) {
        const availableCats = Object.entries(CATEGORY_BALANCE)
            .filter(([category]) => this.hasAvailableCoursesInCategory(category));
        
        let totalScore = 0;
        let totalWeight = 0;

        for (const [category, limits] of availableCats) {
            const count = schedule.filter(course => course.description === category).length;
            const weight = CATEGORY_WEIGHTS[category] || 0.1;
            
            let categoryScore;
            if (count < limits.min) {
                categoryScore = (count / limits.min) * 100;
            } else if (count > limits.max) {
                // Much stronger penalty for exceeding max
                categoryScore = Math.max(0, 100 - ((count - limits.max) / limits.max * 300));
            } else {
                categoryScore = 100;
            }

            // Apply extra penalty for متطلبات إجبارية عامة if more than one
            if (category === 'متطلبات إجبارية عامة' && count > 1) {
                categoryScore = 0;
            }

            totalScore += categoryScore * weight;
            totalWeight += weight;

            this.logger.logProgress('Category balance', {
                category,
                count,
                limits,
                weight,
                score: categoryScore,
                weightedScore: categoryScore * weight
            });
        }

        return Math.round(totalWeight ? totalScore / totalWeight : 100);
    }

    calculateSubcategoryBalance(schedule) {
        const relevantCategories = [
            'متطلبات الكلية الإجبارية',
            'متطلبات التخصص الإجبارية',
            'متطلبات التخصص الاختيارية'
        ];

        const weights = this.calculateSubcategoryWeights(relevantCategories);
        const scheduledSubcats = new Set(
            schedule
                .filter(c => relevantCategories.includes(c.description))
                .map(c => c.subCategory)
                .filter(Boolean)
        );

        // Required minimum coverage per category type
        const minCoverage = {
            'متطلبات التخصص الإجبارية': 0.7,
            'متطلبات التخصص الاختيارية': 0.4,
            'متطلبات الكلية الإجبارية': 0.5
        };

        let score = 0;
        let totalWeight = 0;

        Object.entries(weights).forEach(([subcat, weight]) => {
            const categoryType = this.getSubcategoryMainCategory(subcat);
            const minRequired = minCoverage[categoryType] || 0.4;
            
            totalWeight += weight * minRequired;
            if (scheduledSubcats.has(subcat)) {
                score += weight;
            }
        });

        const coverageScore = Math.round((score / totalWeight) * 100);

        this.logger.logProgress('Subcategory balance', {
            weights,
            scheduledSubcategories: Array.from(scheduledSubcats),
            coverageRequired: totalWeight,
            actualCoverage: score,
            finalScore: coverageScore
        });

        return coverageScore;
    }

    getAvailableSubcategories(categories) {
        return Array.from(this.courseDetails.values())
            .filter(course => 
                categories.includes(course.description) && 
                course.subCategory &&
                !this.student.completedCourses.some(c => 
                    c.courseId === course.courseId && 
                    !['F', 'D-'].includes(c.grade)
                )
            )
            .map(c => c.subCategory)
            .filter(Boolean);
    }

    hasAvailableCoursesInCategory(category) {
        return Array.from(this.courseDetails.values()).some(course => 
            course.description === category && 
            !this.student.completedCourses.some(c => 
                c.courseId === course.courseId && 
                !['F', 'D-'].includes(c.grade)
            )
        );
    }

    calculateSubcategoryWeights(categories) {
        const weights = {};
        let total = 0;

        // Count courses per subcategory
        Array.from(this.courseDetails.values())
            .filter(course => categories.includes(course.description))
            .forEach(course => {
                if (course.subCategory) {
                    weights[course.subCategory] = (weights[course.subCategory] || 0) + 1;
                    total++;
                }
            });

        // Convert to percentages
        Object.keys(weights).forEach(key => {
            weights[key] = weights[key] / total;
        });

        return weights;
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

    getSubcategoryMainCategory(subcat) {
        // Implementation depends on your data structure
        const course = Array.from(this.courseDetails.values())
            .find(c => c.subCategory === subcat);
        return course?.description || '';
    }
}

module.exports = ScheduleCalculator;