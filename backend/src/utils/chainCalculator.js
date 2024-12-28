class ChainCalculator {
    constructor(courseDetails) {
        this.courseDetails = courseDetails;
        this.visited = new Set();
        this.memo = new Map();
    }

    calculateChainScore(course) {
        return {
            forward: this.calculateForwardChain(course.courseId),
            backward: this.calculateBackwardChain(course.courseId)
        };
    }

    calculateForwardChain(courseId, depth = 0) {
        if (this.memo.has(courseId)) return this.memo.get(courseId);
        if (this.visited.has(courseId)) return 0;
        if (depth > 5) return 0;

        this.visited.add(courseId);
        let score = 0;

        // Find all courses that require this as prerequisite
        const dependentCourses = Array.from(this.courseDetails.values())
            .filter(c => c.prerequisites?.includes(courseId));

        for (const dep of dependentCourses) {
            const depthFactor = Math.pow(0.9, depth);
            const categoryFactor = this.getCategoryFactor(dep);
            const chainFactor = this.getChainBranchingFactor(dep);

            score += (1 + this.calculateForwardChain(dep.courseId, depth + 1)) * 
                     depthFactor * 
                     categoryFactor *
                     chainFactor;
        }

        this.memo.set(courseId, score);
        return score;
    }

    calculateBackwardChain(courseId, depth = 0) {
        if (depth >= 3) return 0;
        
        const course = this.courseDetails.get(courseId);
        if (!course?.prerequisites?.length) return 0;

        return course.prerequisites.reduce((score, prereqId) => {
            return score + (1 + this.calculateBackwardChain(prereqId, depth + 1)) * 
                   Math.pow(0.7, depth);
        }, 0);
    }

    getCategoryFactor(course) {
        if (course.description === 'متطلبات التخصص الإجبارية') return 2.0;
        if (course.description === 'متطلبات الكلية الإجبارية') return 1.5;
        return 1.0;
    }

    getChainBranchingFactor(course) {
        const dependents = Array.from(this.courseDetails.values())
            .filter(c => c.prerequisites?.includes(course.courseId));
        return 1 + (dependents.length * 0.2);
    }
}

module.exports = ChainCalculator;