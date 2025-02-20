const ScheduleLogger = require('./ScheduleLogger');
const ScheduleCalculator = require('./calculators/ScheduleCalculator');
const ScheduleValidator = require('./validators/ScheduleValidator');
const { 
    SEMESTER_CONSTRAINTS, 
    LOG_CHECKPOINTS, 
    LAB_CONSTRAINTS,
    SPECIAL_COURSE_CONSTRAINTS,
    SCHEDULING_RULES,
    FEEDBACK_ADJUSTMENTS 
} = require('./constants/ScheduleConstants');

class ScheduleGenerator {
    constructor(studentId, preferences, availableSections, student, feedback = null) {
        // Initialize logger first
        this.logger = new ScheduleLogger();
        
        // Initialize other dependencies with logger
        this.calculator = new ScheduleCalculator(
            student, 
            preferences, 
            new Map(availableSections.courses.map(c => [c.courseId, c]))
        );
        
        this.validator = new ScheduleValidator(
            this.determineSemesterType(),
            student,
            this.logger
        );

        // Default preferences if none provided
        const defaultPreferences = {
            preferredDays: 'any',
            preferBreaks: 'no_preference',
            targetCreditHours: 15,
            categoryPreferences: {
                networking: 'neutral',
                hardware: 'neutral',
                software: 'neutral',
                electrical: 'neutral'
            },
            coursesToImprove: [],
            specificCourses: []
        };

        // Initialize preferences
        this.preferences = {
            ...defaultPreferences,
            ...preferences
        };

        // Initialize other dependencies
        this.courseDetails = new Map();
        this.initializeCourseDetails(availableSections.courses);
        
        // Core properties
        this.studentId = studentId;
        this.availableSections = availableSections;
        this.student = student;
        this.feedback = feedback;

        // Initialize state
        this.semesterType = this.determineSemesterType();
        this.constraints = SEMESTER_CONSTRAINTS[this.semesterType];

        // Log initialization
        this.logger.logInitialization({
            studentId: this.studentId,
            preferences: this.preferences,
            creditHours: this.student.creditHours
        });
    }

    async generateSchedule(availableCourses) {
        try {
            // Validate course data
            if (this.courseDetails.size === 0) {
                return {
                    success: false,
                    error: 'No valid courses available',
                    details: {
                        currentPhase: LOG_CHECKPOINTS.INIT,
                        warnings: this.logger.logs.warnings
                    }
                };
            }

            // Filter eligible courses
            const eligibleCourses = this.filterEligibleCourses(availableCourses);
            this.logger.logCourseFiltering(eligibleCourses);

            if (eligibleCourses.length === 0) {
                return {
                    success: false,
                    error: 'No eligible courses found',
                    details: this.logger.getLogSummary()
                };
            }

            // Get prioritized courses
            const prioritizedCourses = this.calculator.prioritizeCourses(eligibleCourses);

            // Try generating schedule with different credit targets
            for (const targetCredits of this.getCreditTargets()) {
                const schedule = await this.buildSchedule(prioritizedCourses, targetCredits);
                
                if (schedule) {
                    const validation = this.validateScheduleResult(schedule);
                    if (!validation.isValid) {
                        continue;
                    }

                    const metrics = this.calculator.calculateMetrics(schedule);
                    this.logger.logScheduleCompletion(schedule, metrics);

                    return {
                        success: true,
                        schedule,
                        metrics,
                        totalCreditHours: validation.totalCredits
                    };
                }
            }

            return {
                success: false,
                error: 'Could not generate valid schedule',
                details: this.logger.getLogSummary()
            };

        } catch (error) {
            this.logger.logError('Schedule generation failed', {
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    // Helper methods moved to appropriate utility classes

    determineSemesterType() {
        const currentMonth = new Date().getMonth() + 1;
        return (currentMonth >= 6 && currentMonth <= 8) ? 'SUMMER' : 'REGULAR';
    }

    initializeCourseDetails(courses) {
        this.courseDetails.clear();
        let valid = true;
        let totalCourses = 0;

        courses.forEach(course => {
            // Skip courses without credit hours
            if (typeof course.creditHours !== 'number') {
                this.logger.logWarning(`Invalid credit hours for course ${course.courseId}:`, {
                    type: typeof course.creditHours
                });
                return;
            }

            this.courseDetails.set(course.courseId, {
                ...course,
                creditHours: course.creditHours
            });
            totalCourses++;
        });

        // Log initialization results
        this.logger.logProgress('Credit hours initialization', {
            totalCourses
        });

        if (totalCourses === 0) {
            throw new Error('No valid courses found with credit hours');
        }

        return totalCourses > 0;
    }

    filterEligibleCourses(courses) {
        // Group courses by basic category
        const basicCoursesByCategory = {};
        SCHEDULING_RULES.BASIC_CATEGORIES.forEach(category => {
            basicCoursesByCategory[category] = courses.filter(course => 
                course.description === category &&
                !this.student.completedCourses?.some(c => 
                    c.courseId === course.courseId && 
                    (c.grade === 'P' || (!['F', 'D-'].includes(c.grade)))
                )
            );
        });

        // Calculate chain values and sort for each category
        const prioritizedByCategory = {};
        Object.entries(basicCoursesByCategory).forEach(([category, categoryCourses]) => {
            prioritizedByCategory[category] = categoryCourses
                .map(course => ({
                    ...course,
                    chainValue: this.calculator.chainCalculator.calculateChainScore(course)
                }))
                .sort((a, b) => {
                    const aValue = a.chainValue.forward + a.chainValue.backward;
                    const bValue = b.chainValue.forward + b.chainValue.backward;
                    return bValue - aValue;
                });
        });

        // Select top course from each category with available courses
        const selectedBasicCourses = [];
        Object.entries(prioritizedByCategory)
            .filter(([_, courses]) => courses.length > 0)
            .sort((a, b) => {
                const maxChainA = Math.max(...a[1].map(c => c.chainValue.forward + c.chainValue.backward));
                const maxChainB = Math.max(...b[1].map(c => c.chainValue.forward + c.chainValue.backward));
                return maxChainB - maxChainA;
            })
            .slice(0, 1) // Take top 1 categories
            .forEach(([category, courses]) => {
                if (courses.length > 0) {
                    selectedBasicCourses.push(courses[0]); // Take top course from category
                }
            });

        // Get non-basic courses
        const otherCourses = courses.filter(course => 
            !SCHEDULING_RULES.BASIC_CATEGORIES.includes(course.description) &&
            this.validator.isEligible(course, this.student.completedCourses)
        );

        this.logger.logProgress('Course filtering', {
            basicCategoryCounts: Object.fromEntries(
                Object.entries(basicCoursesByCategory)
                    .map(([k, v]) => [k, v.length])
            ),
            selectedBasicCourses: selectedBasicCourses.map(c => ({
                courseId: c.courseId,
                category: c.description,
                chainValue: c.chainValue
            })),
            otherCoursesCount: otherCourses.length
        });

        return [...selectedBasicCourses, ...otherCourses];
    }

    getCreditTargets() {
        const { minCredits, maxCredits } = this.constraints;
        const target = this.preferences.targetCreditHours;

        // Generate array of possible credit targets
        let targets = [];
        
        // Start with preferred target
        if (target <= maxCredits) {
            targets.push(target);
        }

        // Add values above target up to max
        for (let i = target + 1; i <= maxCredits; i++) {
            targets.push(i);
        }

        // Add values below target down to min
        for (let i = target - 1; i >= minCredits; i--) {
            targets.push(i);
        }

        // Filter and sort targets
        targets = [...new Set(targets)]
            .filter(t => t >= minCredits && t <= maxCredits)
            .sort((a, b) => {
                // Sort by distance from target
                const aDist = Math.abs(a - target);
                const bDist = Math.abs(b - target);
                return aDist - bDist;
            });

        this.logger.logProgress('Credit targets calculation', {
            targetRequested: target,
            minAllowed: minCredits,
            maxAllowed: maxCredits,
            possibleTargets: targets
        });

        return targets;
    }

    async buildSchedule(prioritizedCourses, targetCredits) {
        let schedule = [];
        let currentCredits = 0;

        // First add all failed courses
        const failedCourses = prioritizedCourses.filter(course => 
            this.calculator.isFailed(course)
        );

        this.logger.logProgress('Processing failed courses', {
            count: failedCourses.length,
            courses: failedCourses.map(c => c.courseId)
        });

        // Add each failed course first
        for (const course of failedCourses) {
            const section = await this.findCompatibleSection(course, schedule);
            if (section) {
                schedule.push(section);
                currentCredits += section.creditHours;
            } else {
                this.logger.logError('Could not find section for failed course', {
                    courseId: course.courseId
                });
                return null; // Failed to add required course
            }
        }

        // Then add other courses
        const remainingCourses = prioritizedCourses.filter(course => 
            !failedCourses.some(f => f.courseId === course.courseId)
        );

        let labCount = 0;
        let basicCategoryCount = 0;

        const addCourseToSchedule = (section) => {
            if (!section.creditHours) {
                this.logger.logWarning('Course has no credit hours', {
                    courseId: section.courseId,
                    courseName: section.courseName
                });
                return false;
            }
        
            schedule.push(section);
            currentCredits += section.creditHours;
            
            if (this.isLabCourse(section)) labCount++;
            if (this.isBasicCategory(section)) basicCategoryCount++;
            
            this.logger.logProgress('Added course', {
                courseId: section.courseId,
                courseName: section.courseName,
                credits: section.creditHours,
                currentTotal: currentCredits,
                target: targetCredits,
                remaining: targetCredits - currentCredits
            });
        
            return true;
        };

        // Sort courses by credit hours descending
        const sortedCourses = [...remainingCourses]
            .sort((a, b) => (b.creditHours || 0) - (a.creditHours || 0));

        // Try to fill schedule to target
        for (const course of sortedCourses) {
            if (currentCredits >= targetCredits) break;

            // Skip if would exceed max credits
            if (currentCredits + (course.creditHours || 0) > targetCredits) {
                continue;
            }

            const section = await this.findCompatibleSection(course, schedule);
            if (section) {
                addCourseToSchedule(section);
            }
        }

        // Try to add 1-credit courses if needed
        if (currentCredits < targetCredits) {
            const oneCredits = sortedCourses.filter(c => c.creditHours === 1);
            for (const course of oneCredits) {
                if (currentCredits >= targetCredits) break;
                
                const section = await this.findCompatibleSection(course, schedule);
                if (section) {
                    addCourseToSchedule(section);
                }
            }
        }

        this.logger.logProgress('Schedule build complete', {
            courses: schedule.length,
            totalCredits: currentCredits,
            targetCredits
        });

        return schedule;
    }

    async findBestCourse(validCourses, schedule) {
        for (const course of validCourses) {
            const section = await this.findCompatibleSection(course, schedule);
            if (section) return section;
        }
        return null;
    }

    async findCompatibleSection(course, schedule) {
        try {
            // First get course details
            const courseDetails = this.courseDetails.get(course.courseId);
            if (!courseDetails) {
                this.logger.logWarning(`No course details found for ${course.courseId}`);
                return null;
            }

            if (!courseDetails.creditHours) {
                this.logger.logWarning(`Course ${course.courseId} has no credit hours`);
                return null;
            }

            const availableSections = this.availableSections.courses
                .find(c => c.courseId === course.courseId)?.sections;

            if (!availableSections?.length) {
                this.logger.logWarning(`No sections found for ${course.courseId}`);
                return null;
            }

            // Find compatible section
            const compatibleSection = availableSections.find(section => {
                if (!section?.days || !section?.time) return false;
                return !schedule.some(scheduled => this.hasTimeConflict(section, scheduled));
            });

            if (compatibleSection) {
                return {
                    ...courseDetails,
                    section: compatibleSection.section,
                    days: compatibleSection.days,
                    time: compatibleSection.time,
                    creditHours: courseDetails.creditHours
                };
            }
            return null;
        } catch (error) {
            this.logger.logError('Error finding compatible section:', error);
            return null;
        }
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

    checkCreditHours(schedule) {
        const totalCredits = this.calculateTotalCredits(schedule);
        return totalCredits >= this.constraints.minCredits && 
               totalCredits <= this.constraints.maxCredits &&
               Math.abs(totalCredits - this.preferences.targetCreditHours) <= 3;
    }

    getLabDistributionScore(course, currentLabCount = 0) {
        if (!this.isLabCourse(course)) return 0;

        // Required lab courses have higher priority
        const isRequiredLab = ['0302111', '0907101'].includes(course.courseId);
        
        if (currentLabCount >= LAB_CONSTRAINTS.MAX_LABS) {
            return -2000; // Stronger penalty
        }
        
        if (currentLabCount === 0 && isRequiredLab) {
            return 1000; // High priority for first required lab
        }
        
        if (currentLabCount === 1 && isRequiredLab) {
            return 500; // Medium priority for second required lab
        }

        if (currentLabCount >= 2) {
            return -1000; // Discourage more than 2 labs
        }

        return 0;
    }

    // Add isLabCourse method
    isLabCourse(course) {
        return this.calculator.isLabCourse(course);
    }

    getFailedCourses() {
        return this.student.completedCourses?.filter(course => 
            ['F', 'D-'].includes(course.grade)
        ) || [];
    }

    getImprovementCourses() {
        const coursesToImprove = this.preferences.coursesToImprove || [];
        return this.student.completedCourses?.filter(course =>
            coursesToImprove.includes(course.courseId) &&
            !['F', 'D-'].includes(course.grade)
        ) || [];
    }

    getSpecificCourses() {
        const specificRequests = this.preferences.specificCourses || [];
        return specificRequests.map(courseId => 
            this.courseDetails.get(courseId)
        ).filter(Boolean);
    }

    getRegularCourses() {
        const priorityCategories = [
            'متطلبات التخصص الإجبارية',
            'متطلبات الكلية الإجبارية',
            'متطلبات الجامعة الإجبارية',
            'متطلبات إجبارية عامة'  // Add this category
        ];

        return Array.from(this.courseDetails.values())
            .filter(course => priorityCategories.includes(course.description));
    }

    wouldExceedConstraints({schedule, course, labCount, currentCredits, targetCredits}) {
        // Credit check
        if (currentCredits + (course.creditHours || 0) > targetCredits + 1) {
            return true;
        }
    
        // Lab check
        if (this.isLabCourse(course) && labCount >= LAB_CONSTRAINTS.MAX_LABS) {
            return true;
        }
    
        // Count basic courses by category
        const basicCourseCounts = schedule.reduce((counts, c) => {
            if (SCHEDULING_RULES.BASIC_CATEGORIES.includes(c.description)) {
                counts[c.description] = (counts[c.description] || 0) + 1;
            }
            return counts;
        }, {});
    
        // Check متطلبات إجبارية عامة limit FIRST
        if (course.description === 'متطلبات إجبارية عامة') {
            const currentCount = basicCourseCounts['متطلبات إجبارية عامة'] || 0;
            if (currentCount >= 1) {
                this.logger.logProgress('Basic requirement limit exceeded', {
                    type: 'basic_requirement',
                    courseId: course.courseId,
                    currentCount,
                    allowed: false
                });
                return true;
            }
        }
    
        // Then check total basic category limit
        const totalBasicCount = Object.values(basicCourseCounts).reduce((a, b) => a + b, 0);
        if (SCHEDULING_RULES.BASIC_CATEGORIES.includes(course.description) && 
            totalBasicCount >= 2) {
            this.logger.logProgress('Basic category limit exceeded', {
                type: 'basic_total',
                courseId: course.courseId,
                currentCount: totalBasicCount,
                allowed: false
            });
            return true;
        }
    
        return false;
    }

    getBasicCategoryCount(schedule) {
        return schedule.filter(course => 
            SCHEDULING_RULES.BASIC_CATEGORIES.includes(course.description)
        ).length;
    }

    isBasicCategory(course) {
        return SCHEDULING_RULES.BASIC_CATEGORIES.includes(course.description);
    }

    validateScheduleResult(schedule) {
        // First check that all failed courses are included
        const failedCourses = this.getFailedCourses();
        const missingFailed = failedCourses.filter(failed => 
            !schedule.some(course => course.courseId === failed.courseId)
        );

        if (missingFailed.length > 0) {
            this.logger.logError('Missing failed courses in schedule', {
                missingCourses: missingFailed.map(c => c.courseId)
            });
            return {
                isValid: false,
                error: 'Schedule must include all failed courses'
            };
        }

        // Rest of validation...
        if (!Array.isArray(schedule) || schedule.length === 0) {
            return {
                isValid: false,
                error: 'Invalid schedule format'
            };
        }

        const totalCredits = schedule.reduce((sum, course) => 
            sum + (course.creditHours || 0), 0);

        this.logger.logProgress('Schedule validation', {
            totalCredits,
            target: this.preferences.targetCreditHours,
            min: this.constraints.minCredits,
            max: this.constraints.maxCredits
        });

        // Allow schedules that meet minimum requirements
        if (totalCredits >= this.constraints.minCredits && 
            totalCredits <= this.constraints.maxCredits) {
            return {
                isValid: true,
                totalCredits,
                targetMatch: totalCredits === this.preferences.targetCreditHours
            };
        }

        return {
            isValid: false,
            error: `Total credits (${totalCredits}) outside valid range`
        };
    }
}

module.exports = ScheduleGenerator;