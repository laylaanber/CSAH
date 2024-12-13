// backend/src/services/scheduleService.test.js
const ScheduleGenerator = require('./scheduleService');
describe('ScheduleGenerator - filterEligibleCourses', () => {
    let generator;
    let mockStudent;
    let mockPreferences;
    let mockAvailableSections;

    beforeEach(() => {
        mockStudent = {
            studentId: 'test123',
            completedCourses: [],
            creditHours: 60
        };

        mockPreferences = {
            targetCreditHours: 15,
            preferredDays: 'sun_tue_thu',
            coursesToImprove: ['COURSE2']
        };

        mockAvailableSections = {
            courses: [
                { courseId: 'COURSE1', sections: [{ id: 1 }] },
                { courseId: 'COURSE2', sections: [{ id: 2 }] },
                { courseId: 'COURSE3', sections: [{ id: 3 }] }
            ]
        };

        generator = new ScheduleGenerator('test123', mockPreferences, mockAvailableSections);
        generator.student = mockStudent;
    });

    test('should filter out courses without available sections', () => {
        const courses = [
            { courseId: 'COURSE1' },
            { courseId: 'COURSE4' }  // No sections available
        ];

        const result = generator.filterEligibleCourses(courses);
        expect(result).toHaveLength(1);
        expect(result[0].courseId).toBe('COURSE1');
    });

    test('should filter out courses already passed with good grades', () => {
        mockStudent.completedCourses = [
            { courseId: 'COURSE1', grade: 'A' },
            { courseId: 'COURSE2', grade: 'D' }
        ];

        const courses = [
            { courseId: 'COURSE1' },
            { courseId: 'COURSE2' },
            { courseId: 'COURSE3' }
        ];

        const result = generator.filterEligibleCourses(courses);
        expect(result).toHaveLength(2);
        expect(result.map(c => c.courseId)).toContain('COURSE2');
        expect(result.map(c => c.courseId)).toContain('COURSE3');
    });

    test('should allow improvement courses if in preferences', () => {
        mockStudent.completedCourses = [
            { courseId: 'COURSE2', grade: 'D' }
        ];

        const courses = [
            { courseId: 'COURSE2' }
        ];

        const result = generator.filterEligibleCourses(courses);
        expect(result).toHaveLength(1);
        expect(result[0].courseId).toBe('COURSE2');
    });

    test('should filter based on prerequisites', () => {
        const courses = [
            { courseId: 'COURSE1' },
            { 
                courseId: 'COURSE2',
                prerequisites: ['PREREQ1']
            }
        ];

        const result = generator.filterEligibleCourses(courses);
        expect(result).toHaveLength(1);
        expect(result[0].courseId).toBe('COURSE1');
    });

    test('should filter based on special rules (credit hours)', () => {
        mockStudent.creditHours = 30;
        
        const courses = [
            { courseId: 'COURSE1' },
            { 
                courseId: 'COURSE2',
                specialRule: 'Requires 45 credit hours'
            }
        ];

        const result = generator.filterEligibleCourses(courses);
        expect(result).toHaveLength(1);
        expect(result[0].courseId).toBe('COURSE1');
    });

    test('should handle empty course list', () => {
        const result = generator.filterEligibleCourses([]);
        expect(result).toHaveLength(0);
    });

    test('should handle null/undefined values in course data', () => {
        const courses = [
            { courseId: 'COURSE1', prerequisites: null },
            { courseId: 'COURSE2', specialRule: undefined }
        ];

        const result = generator.filterEligibleCourses(courses);
        expect(result).toHaveLength(2);
    });

    test('should handle complex filtering scenario', () => {
        mockStudent.completedCourses = [
            { courseId: 'PREREQ1', grade: 'B' },
            { courseId: 'COURSE2', grade: 'D' }
        ];
        mockStudent.creditHours = 50;

        const courses = [
            { 
                courseId: 'COURSE1',
                prerequisites: ['PREREQ1'],
                specialRule: 'Requires 45 credit hours'
            },
            { courseId: 'COURSE2' },  // Available for improvement
            { 
                courseId: 'COURSE3',
                prerequisites: ['MISSING_PREREQ']
            }
        ];

// backend/src/services/scheduleService.test.js 
// Add missing closing brackets:

const result = generator.filterEligibleCourses(courses);
expect(result).toHaveLength(2);
expect(result.map(c => c.courseId)).toContain('COURSE1');
expect(result.map(c => c.courseId)).toContain('COURSE2');
});
});