const CourseV2 = require('../models/CourseV2');
const PreferenceV2 = require('../models/PreferenceV2');
const ScheduleV2 = require('../models/ScheduleV2');

class ScheduleGenerator {
    constructor(studentId, preferences, availableSections, student) {
        this.studentId = studentId;
        this.preferences = preferences;
        this.availableSections = availableSections;
        this.student = student;
        this.courseDetails = new Map();
        
        this.timeSlots = {
            'Sunday-Tuesday-Thursday': [
                '08:00 - 09:30',
                '09:30 - 11:00',
                '11:00 - 12:30',
                '12:30 - 14:00',
                '14:00 - 15:30'
            ],
            'Monday-Wednesday': [
                '08:00 - 09:30',
                '09:30 - 11:00',
                '11:00 - 12:30',
                '12:30 - 14:00',
                '14:00 - 15:30'
            ]
        };
    }

    initializeCourseDetails(availableCourses) {
        availableCourses.forEach(course => {
            this.courseDetails.set(course.courseId, course);
        });
    }

    verifyPrerequisites(course) {
        if (!course.prerequisites?.length) return true;

        return course.prerequisites.every(prereqId => {
            const passedPrereq = this.student.completedCourses?.find(
                c => c.courseId === prereqId
            );
            return passedPrereq && !['F', 'D-', 'D', 'D+'].includes(passedPrereq.grade);
        });
    }

    filterEligibleCourses(availableCourses) {
        return availableCourses.filter(course => {
            const hasSections = this.availableSections.courses.some(
                c => c.courseId === course.courseId
            );
            if (!hasSections) return false;

            const passedCourse = this.student.completedCourses?.find(
                c => c.courseId === course.courseId
            );
            
            if (passedCourse) {
                if (!['F', 'D-', 'D', 'D+'].includes(passedCourse.grade)) {
                    return false;
                }
                return this.preferences.coursesToImprove?.includes(course.courseId);
            }

            if (!this.verifyPrerequisites(course)) {
                return false;
            }

            if (course.specialRule) {
                const match = course.specialRule.match(/(\d+)/);
                if (match && parseInt(match[1]) > this.student.creditHours) {
                    return false;
                }
            }

            return true;
        });
    }

    hasTimeConflict(newSection, schedule) {
        return schedule.some(existingCourse => {
            if (existingCourse.days !== newSection.days) return false;

            const [newStart, newEnd] = newSection.time.split(' - ')
                .map(t => new Date(`1970/01/01 ${t}`));
            const [existingStart, existingEnd] = existingCourse.time.split(' - ')
                .map(t => new Date(`1970/01/01 ${t}`));

            return !(newEnd <= existingStart || newStart >= existingEnd);
        });
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
        const availableSectionsForCourse = this.availableSections.courses
            .find(c => c.courseId === course.courseId)?.sections;

        if (!availableSectionsForCourse?.length) return null;

        const courseDetails = this.courseDetails.get(course.courseId);
        if (!courseDetails) return null;

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

        if (!compatibleSections.length) return null;

        return {
            courseId: course.courseId,
            courseName: courseDetails.courseName,
            creditHours: courseDetails.creditHours,
            description: courseDetails.description,
            subCategory: courseDetails.subCategory,
            details: courseDetails.details,
            section: compatibleSections[0].section,
            days: compatibleSections[0].days,
            time: compatibleSections[0].time
        };
    }

    prioritizeCourses(courses) {
        return courses.sort((a, b) => {
            if (a.description.includes('إجبارية') && !b.description.includes('إجبارية')) {
                return -1;
            }
            if (!a.description.includes('إجبارية') && b.description.includes('إجبارية')) {
                return 1;
            }

            const aSpecific = this.preferences.specificCourses?.includes(a.courseId) || false;
            const bSpecific = this.preferences.specificCourses?.includes(b.courseId) || false;
            if (aSpecific !== bSpecific) return bSpecific ? 1 : -1;

            const aPref = this.preferences.categoryPreferences[a.subCategory] || 'neutral';
            const bPref = this.preferences.categoryPreferences[b.subCategory] || 'neutral';
            const prefOrder = { 'prefer': 2, 'neutral': 1, 'dislike': 0 };
            
            if (prefOrder[aPref] !== prefOrder[bPref]) {
                return prefOrder[bPref] - prefOrder[aPref];
            }

            return b.creditHours - a.creditHours;
        });
    }

    calculateCategoryDistribution(schedule) {
        const categories = {
            networking: 0,
            hardware: 0,
            software: 0,
            electrical: 0
        };

        schedule.forEach(course => {
            if (course.subCategory) {
                categories[course.subCategory]++;
            }
        });

        return categories;
    }

    calculateBalanceScore(schedule) {
        const distribution = this.calculateCategoryDistribution(schedule);
        const values = Object.values(distribution);
        const max = Math.max(...values);
        const min = Math.min(...values);
        
        return max === 0 ? 100 : Math.round(100 - ((max - min) / max * 100));
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

    async generateSchedule(availableCourses) {
        try {
            this.initializeCourseDetails(availableCourses);
            
            const eligibleCourses = this.filterEligibleCourses(availableCourses);
            console.log('Eligible courses:', eligibleCourses.length);

            if (!eligibleCourses.length) {
                return {
                    success: false,
                    message: 'No eligible courses found'
                };
            }

            let currentSchedule = [];
            let totalCredits = 0;
            const targetCredits = this.preferences.targetCreditHours || 15;

            const prioritizedCourses = this.prioritizeCourses(eligibleCourses);

            for (const courseId of (this.preferences.specificCourses || [])) {
                const course = prioritizedCourses.find(c => c.courseId === courseId);
                if (course && totalCredits + course.creditHours <= targetCredits) {
                    const assigned = this.assignTimeSlot(course, currentSchedule);
                    if (assigned) {
                        currentSchedule.push(assigned);
                        totalCredits += course.creditHours;
                    }
                }
            }

            for (const course of prioritizedCourses) {
                if (totalCredits >= targetCredits) break;
                
                if (currentSchedule.some(c => c.courseId === course.courseId)) continue;

                if (totalCredits + course.creditHours <= targetCredits) {
                    const assigned = this.assignTimeSlot(course, currentSchedule);
                    if (assigned) {
                        currentSchedule.push(assigned);
                        totalCredits += course.creditHours;
                    }
                }
            }

            if (totalCredits < 12) {
                return {
                    success: false,
                    message: 'Could not generate schedule with minimum 12 credit hours'
                };
            }

            return {
                success: true,
                schedule: currentSchedule,
                metrics: {
                    totalCreditHours: totalCredits,
                    difficultyScore: this.calculateScheduleDifficulty(currentSchedule),
                    balanceScore: this.calculateBalanceScore(currentSchedule),
                    categoryDistribution: this.calculateCategoryDistribution(currentSchedule)
                }
            };

        } catch (error) {
            console.error('Schedule generation error:', error);
            throw error;
        }
    }
}

module.exports = ScheduleGenerator;