const { LOG_CHECKPOINTS } = require('./constants/ScheduleConstants');

class ScheduleLogger {
    constructor() {
        this.logs = {
            errors: [],
            warnings: [],
            stats: {
                attemptCount: 0,
                coursesTried: 0,
                labsAdded: 0,
                timeConflicts: 0
            },
            phase: null
        };
    }

    logPhase(phase, data = {}) {
        this.logs.phase = phase;
        this.print('PHASE', `[${phase}]`, data);
    }

    logError(message, data = {}) {
        this.logs.errors.push({
            timestamp: new Date().toISOString(),
            message,
            data
        });
        this.print('ERROR', '❌ ' + message, data);
    }

    logWarning(message, data = {}) {
        this.logs.warnings.push({
            timestamp: new Date().toISOString(),
            message,
            data
        });
        this.print('WARN', '⚠️ ' + message, data);
    }

    logSuccess(message, data = {}) {
        this.print('SUCCESS', '✅ ' + message, data);
    }

    logProgress(message, data = {}) {
        this.print('INFO', '🔄 ' + message, data);
    }

    logStat(key, value) {
        this.logs.stats[key] = (this.logs.stats[key] || 0) + value;
    }

    // Specific logging methods for schedule generation
    logInitialization(data) {
        this.logPhase(LOG_CHECKPOINTS.INIT, {
            studentId: data.studentId,
            preferences: data.preferences,
            creditHours: data.creditHours,
            timestamp: new Date().toISOString()
        });
    }

    logCourseFiltering(eligibleCourses) {
        this.logPhase(LOG_CHECKPOINTS.FILTER, {
            total: eligibleCourses.length,
            byCategory: this.groupByCategory(eligibleCourses),
            courses: eligibleCourses.map(c => c.courseId)
        });
    }

    logPriorityCalculation(courseId, components, total) {
        this.print('DEBUG', `Priority for ${courseId}`, {
            components,
            total
        });
    }

    logScheduleValidation(validation) {
        this.print('INFO', 'Schedule Validation', {
            isValid: validation.isValid,
            checks: validation.checks,
            creditHours: validation.creditHours
        });
    }

    logScheduleCompletion(schedule, metrics) {
        this.logPhase(LOG_CHECKPOINTS.COMPLETE, {
            success: true,
            courses: schedule.map(c => ({
                id: c.courseId,
                name: c.courseName,
                credits: c.creditHours
            })),
            metrics,
            stats: this.logs.stats
        });
    }

    // Helper methods
    print(level, message, data = {}) {
        const timestamp = new Date().toISOString();
        const hasData = Object.keys(data).length > 0;
        
        console.log('\n' + '='.repeat(50));
        console.log(`[${timestamp}] ${level}`);
        console.log(message);
        if (hasData) {
            console.log('Details:', JSON.stringify(data, null, 2));
        }
        console.log('='.repeat(50) + '\n');
    }

    groupByCategory(courses) {
        return courses.reduce((acc, course) => {
            acc[course.description] = (acc[course.description] || 0) + 1;
            return acc;
        }, {});
    }

    getLogSummary() {
        return {
            stats: this.logs.stats,
            errors: this.logs.errors,
            warnings: this.logs.warnings,
            currentPhase: this.logs.phase
        };
    }

    reset() {
        this.logs = {
            errors: [],
            warnings: [],
            stats: {
                attemptCount: 0,
                coursesTried: 0,
                labsAdded: 0,
                timeConflicts: 0
            },
            phase: null
        };
    }
}

module.exports = ScheduleLogger;