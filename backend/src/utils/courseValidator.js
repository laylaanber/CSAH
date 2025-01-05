// utils/courseValidator.js
const validateCourseData = (course) => {
    const required = ['courseId', 'courseName', 'creditHours', 'description'];
    const missing = required.filter(field => !course[field]);
    
    if (missing.length > 0) {
        console.warn(`Course ${course.courseId} missing fields:`, missing);
        return false;
    }
    
    if (typeof course.creditHours !== 'number') {
        console.warn(`Course ${course.courseId} has invalid credit hours:`, 
            course.creditHours);
        return false;
    }
    
    return true;
};

module.exports = { validateCourseData };