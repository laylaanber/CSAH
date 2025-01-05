const { 
    SEMESTER_CONSTRAINTS,
    CATEGORY_CONSTRAINTS, 
    LAB_CONSTRAINTS,
    SPECIAL_COURSE_CONSTRAINTS,
    UNIVERSITY_ELECTIVES,
    SCHEDULING_RULES // Add this import
} = require('../constants/ScheduleConstants');

class ScheduleValidator {
    constructor(semesterType, student, logger) {
        this.constraints = SEMESTER_CONSTRAINTS[semesterType];
        this.student = student;
        this.semesterType = semesterType;
        this.logger = logger;
    }

    validateSchedule(schedule) {
        if (!Array.isArray(schedule)) {
            return {
                isValid: false,
                checks: {},
                details: [{
                    check: 'invalidSchedule',
                    message: 'Invalid schedule format'
                }]
            };
        }

        const checks = {
            creditHours: this.checkCreditHours(schedule),
            categoryLimits: this.checkCategoryLimits(schedule),
            labDistribution: this.checkLabDistribution(schedule),
            specialRules: this.checkSpecialCourseRules(schedule),
            universityElectives: this.checkUniversityElectives(schedule),
            timeConflicts: this.checkTimeConflicts(schedule),
            categoryDistribution: this.checkCategoryDistribution(schedule)
        };

        return {
            isValid: Object.values(checks).every(check => check === true),
            checks,
            details: this.getValidationDetails(checks)
        };
    }

    checkCreditHours(schedule) {
        const totalCredits = schedule.reduce((sum, course) => {
            const credits = parseInt(course.creditHours) || 0;
            return sum + credits;
        }, 0);

        // Safe logging - only log if logger exists
        if (this.logger?.logProgress) {
            this.logger.logProgress('Credit hour check', {
                total: totalCredits,
                min: this.constraints.minCredits,
                max: this.constraints.maxCredits
            });
        }

        return totalCredits >= this.constraints.minCredits && 
               totalCredits <= this.constraints.maxCredits;
    }

    checkCategoryLimits(schedule) {
        const counts = schedule.reduce((acc, course) => {
            acc[course.description] = (acc[course.description] || 0) + 1;
            return acc;
        }, {});

        // Check university electives limit
        if (counts['متطلبات الجامعة الاختيارية'] > CATEGORY_CONSTRAINTS['متطلبات الجامعة الاختيارية'].maxCourses) {
            return false;
        }

        // Check major electives limit
        if (counts['متطلبات التخصص الاختيارية'] > CATEGORY_CONSTRAINTS['متطلبات التخصص الاختيارية'].maxCourses) {
            return false;
        }

        return true;
    }

    checkCategoryDistribution(schedule) {
        // Basic categories count
        const basicCounts = schedule.reduce((acc, course) => {
            if (SCHEDULING_RULES.BASIC_CATEGORIES.includes(course.description)) {
                acc[course.description] = (acc[course.description] || 0) + 1;
            }
            return acc;
        }, {});

        // Check max 2 basic courses total
        const totalBasic = Object.values(basicCounts).reduce((a, b) => a + b, 0);
        if (totalBasic > 2) return false;

        // Check max 1 per basic category
        if (Object.values(basicCounts).some(count => count > 1)) return false;

        return true;
    }

    checkLabDistribution(schedule) {
        if (this.semesterType === 'SUMMER') return true;

        const labCount = schedule.filter(course => this.isLabCourse(course)).length;
        
        // Log for debugging
        console.log('Lab distribution check:', {
            labCount,
            minRequired: LAB_CONSTRAINTS.MIN_LABS,
            maxAllowed: LAB_CONSTRAINTS.MAX_LABS
        });

        return labCount >= LAB_CONSTRAINTS.MIN_LABS && 
               labCount <= LAB_CONSTRAINTS.MAX_LABS;
    }

    // Add isLabCourse method to ScheduleValidator
    isLabCourse(course) {
        return course.details?.isLab || 
               course.courseName?.toLowerCase().includes('مختبر') ||
               ['0302111', '0302112', '0907101', '0966111'].includes(course.courseId);
    }

    checkSpecialCourseRules(schedule) {
        return schedule.every(course => {
            const rules = SPECIAL_COURSE_CONSTRAINTS[course.courseId];
            if (!rules) return true;

            // Check credit hour requirements
            if (rules.minCreditHours && this.student.creditHours < rules.minCreditHours) {
                return false;
            }

            // Check summer restrictions
            if (this.semesterType === 'SUMMER' && rules.noSummerAllowed) {
                return false;
            }

            return true;
        });
    }

    checkUniversityElectives(schedule) {
        // Group courses by subcategory
        const subcategoryCounts = {};
        let totalCount = 0;
        
        for (const course of schedule) {
            if (course.description === 'متطلبات الجامعة الاختيارية') {
                totalCount++;
                if (!course.subCategory) continue;
                
                subcategoryCounts[course.subCategory] = 
                    (subcategoryCounts[course.subCategory] || 0) + 1;
                    
                // Max 1 course per subcategory
                if (subcategoryCounts[course.subCategory] > 1) return false;
            }
        }
        
        // Max 3 courses total
        return totalCount <= 3;
    }

    checkTimeConflicts(schedule) {
        for (let i = 0; i < schedule.length; i++) {
            for (let j = i + 1; j < schedule.length; j++) {
                if (this.hasTimeConflict(schedule[i], schedule[j])) {
                    return false;
                }
            }
        }
        return true;
    }

    hasTimeConflict(section1, section2) {
        // Skip if no common days
        const days1 = new Set(section1.days.split('-'));
        const days2 = new Set(section2.days.split('-'));
        if (![...days1].some(day => days2.has(day))) return false;

        // Convert times to minutes for comparison
        const [start1, end1] = this.parseTimeToMinutes(section1.time);
        const [start2, end2] = this.parseTimeToMinutes(section2.time);

        return !(end1 <= start2 || start1 >= end2);
    }

    parseTimeToMinutes(timeString) {
        const [start, end] = timeString.split(' - ');
        return [
            this.timeToMinutes(start),
            this.timeToMinutes(end)
        ];
    }

    timeToMinutes(time) {
        const [hours, minutes] = time.split(':').map(Number);
        return hours * 60 + minutes;
    }

    getValidationDetails(checks) {
        return Object.entries(checks)
            .filter(([_, passed]) => !passed)
            .map(([check]) => ({
                check,
                message: this.getFailureMessage(check)
            }));
    }

    getFailureMessage(check) {
        const messages = {
            creditHours: `Credit hours must be between ${this.constraints.minCredits} and ${this.constraints.maxCredits}`,
            categoryLimits: 'Category limits exceeded',
            labDistribution: `Labs must be between ${LAB_CONSTRAINTS.MIN_LABS} and ${LAB_CONSTRAINTS.MAX_LABS}`,
            specialRules: 'Special course rules violated',
            universityElectives: 'University electives distribution invalid',
            timeConflicts: 'Time conflicts detected',
            categoryDistribution: 'Category distribution invalid'
        };
        return messages[check] || 'Validation failed';
    }

    isEligible(course, completedCourses) {
        // Debug logging
        this.logger?.logProgress('Checking eligibility', {
            courseId: course.courseId,
            courseName: course.courseName,
            studentCredits: this.student.creditHours
        });

        // 1. Check if course was failed before (D- or F)
        const previousAttempt = completedCourses?.find(c => c.courseId === course.courseId);
        const isFailed = previousAttempt && ['F', 'D-'].includes(previousAttempt.grade);

        // 2. Check if course is in improvement list
        const isImprovement = this.student?.preferences?.coursesToImprove?.includes(course.courseId);

        // 3. Check if course is specifically requested
        const isSpecificRequest = this.student?.preferences?.specificCourses?.includes(course.courseId);

        // 4. Check if course was already passed successfully
        const isPassed = previousAttempt && !['F', 'D-'].includes(previousAttempt.grade);

        // 5. Check prerequisites
        const hasPrerequisites = this.verifyPrerequisites(course, completedCourses);

        // 6. Check special course rules
        const meetsSpecialRules = this.checkSpecialCourseRules(course);

        // Log eligibility details
        this.logger?.logProgress('Eligibility check results', {
            courseId: course.courseId,
            isFailed,
            isImprovement,
            isSpecificRequest,
            isPassed,
            hasPrerequisites,
            meetsSpecialRules
        });

        // Course is eligible if:
        // - It was failed previously, OR
        // - It's in the improvement list, OR
        // - It's specifically requested, OR
        // - It hasn't been passed yet AND meets all requirements
        return (isFailed || isImprovement || isSpecificRequest || 
               (!isPassed && hasPrerequisites && meetsSpecialRules));
    }

    checkSpecialCourseRules(course) {
        const rules = SPECIAL_COURSE_CONSTRAINTS[course.courseId];
        if (!rules) return true;

        switch(course.courseId) {
            case '0977598': // مشروع 1 الحاسوب
                if (this.student.creditHours < 120) return false;
                if (this.semesterType === 'SUMMER') return false;
                break;

            case '0977599': // مشروع 2 الحاسوب
                if (this.semesterType === 'SUMMER') return false;
                break;

            case '0947500': // التدريب العملي
                if (this.student.creditHours < 120) return false;
                if (this.semesterType === 'REGULAR') {
                    // Can only be taken with مشروع 1 or مشروع 2 in regular semesters
                    return true; // This will be handled in schedule building logic
                }
                break;

            case '0901420': // اقتصاد هندسي
                if (this.student.creditHours < 90) return false;
                break;
        }

        return true;
    }

    verifyPrerequisites(course, completedCourses) {
        if (!course.prerequisites?.length) {
            return true;
        }

        const passedPrereqs = course.prerequisites.every(prereqId => {
            const prereqPassed = completedCourses?.find(c => 
                c.courseId === prereqId && !['F', 'D-'].includes(c.grade)
            );
            
            // Log prerequisite check
            this.logger?.logProgress('Prerequisite check', {
                courseId: course.courseId,
                prereqId,
                passed: !!prereqPassed
            });

            return !!prereqPassed;
        });

        return passedPrereqs;
    }
}

module.exports = ScheduleValidator;