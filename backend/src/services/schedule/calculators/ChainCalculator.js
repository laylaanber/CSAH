const ScheduleLogger = require('../ScheduleLogger');

class ChainCalculator {
    constructor(courseDetails, logger = null) {
        this.courseDetails = courseDetails;
        this.visited = new Set();
        this.memo = new Map();
        this.logger = logger || new ScheduleLogger();
    }

    calculateChainScore(course) {
        this.visited.clear(); // Reset visited set for each new calculation
        this.logger.logProgress('Starting chain calculation', {
            courseId: course.courseId,
            courseName: course.courseName
        });

        const result = {
            forward: this.calculateForwardChain(course.courseId), // What this course unlocks
            backward: this.calculateBackwardChain(course.courseId) // What's needed for this course
        };

        this.logger.logProgress('Chain calculation complete', {
            courseId: course.courseId,
            forwardChainValue: result.forward,
            backwardChainValue: result.backward,
            totalChainValue: (result.forward * 0.7) + (result.backward * 0.3)
        });

        return result;
    }

    calculateForwardChain(courseId, depth = 0, chain = []) {
        // Early returns with logging
        if (this.memo.has(courseId)) {
            this.logger.logProgress('Using memoized value', {
                courseId,
                value: this.memo.get(courseId)
            });
            return this.memo.get(courseId);
        }

        if (this.visited.has(courseId)) {
            this.logger.logProgress('Cycle detected', { courseId });
            return 0;
        }

        if (depth > 5) {
            this.logger.logProgress('Max depth reached', { courseId, depth });
            return 0;
        }

        this.visited.add(courseId);
        let score = 0;

        // Find dependent courses
        const dependentCourses = Array.from(this.courseDetails.values())
            .filter(c => c.prerequisites?.includes(courseId));

        this.logger.logProgress('Forward chain analysis', {
            courseId,
            depth,
            dependentCoursesCount: dependentCourses.length,
            dependentCourses: dependentCourses.map(c => ({
                id: c.courseId,
                name: c.courseName
            }))
        });

        for (const dep of dependentCourses) {
            const depthFactor = Math.pow(0.9, depth);
            const categoryFactor = this.getCategoryFactor(dep);
            const chainFactor = this.getChainBranchingFactor(dep);

            const courseScore = (1 + this.calculateForwardChain(dep.courseId, depth + 1)) * 
                              depthFactor * 
                              categoryFactor *
                              chainFactor;

            // Log individual course contribution
            this.logger.logProgress('Course chain contribution', {
                courseId: dep.courseId,
                courseName: dep.courseName,
                depth,
                depthFactor,
                categoryFactor,
                chainFactor,
                courseScore
            });

            score += courseScore;
            chain.push({
                courseId: dep.courseId,
                depth,
                score: courseScore
            });
        }

        this.memo.set(courseId, score);

        // Log complete chain for this course
        this.logger.logProgress('Forward chain complete', {
            courseId,
            totalScore: score,
            chain
        });

        return score;
    }

    calculateBackwardChain(courseId, depth = 0, chain = []) {
        if (depth >= 3) {
            this.logger.logProgress('Max backward depth reached', { courseId, depth });
            return 0;
        }
        
        const course = this.courseDetails.get(courseId);
        if (!course?.prerequisites?.length) {
            this.logger.logProgress('No prerequisites', { courseId });
            return 0;
        }

        this.logger.logProgress('Backward chain analysis', {
            courseId,
            courseName: course.courseName,
            depth,
            prerequisites: course.prerequisites
        });

        let totalScore = 0;
        for (const prereqId of course.prerequisites) {
            const decayFactor = Math.pow(0.7, depth);
            const prereqScore = (1 + this.calculateBackwardChain(prereqId, depth + 1)) * decayFactor;
            
            chain.push({
                prerequisiteId: prereqId,
                depth,
                score: prereqScore
            });

            totalScore += prereqScore;
        }

        // Log complete backward chain
        this.logger.logProgress('Backward chain complete', {
            courseId,
            totalScore,
            chain
        });

        return totalScore;
    }

    getCategoryFactor(course) {
        const factor = course.description === 'متطلبات التخصص الإجبارية' ? 2.0 :
                      course.description === 'متطلبات الكلية الإجبارية' ? 1.5 : 1.0;

        this.logger.logProgress('Category factor', {
            courseId: course.courseId,
            category: course.description,
            factor
        });

        return factor;
    }

    getChainBranchingFactor(course) {
        const dependents = Array.from(this.courseDetails.values())
            .filter(c => c.prerequisites?.includes(course.courseId));
        
        const factor = 1 + (dependents.length * 0.2);

        this.logger.logProgress('Branching factor', {
            courseId: course.courseId,
            dependentsCount: dependents.length,
            factor,
            dependents: dependents.map(d => d.courseId)
        });

        return factor;
    }
}

module.exports = ChainCalculator;