export const validateCourseData = (course) => {
    const required = ['courseId', 'creditHours', 'courseName'];
    return required.every(field => {
        const value = course[field];
        return value !== undefined && value !== null && value !== '';
    });
};