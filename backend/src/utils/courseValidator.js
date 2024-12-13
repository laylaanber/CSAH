// utils/courseValidator.js
function validateCourseData(coursesData) {
    const issues = {
        invalidPrerequisites: []
    };
    
    // Create a set of all valid course IDs for quick lookup
    const allCourseIds = new Set(coursesData.map(course => course.courseId));
    
    // Add some helpful statistics about course types
    const stats = {
        totalCourses: coursesData.length,
        byDescription: {},
        withSubCategories: coursesData.filter(c => c.subCategory).length
    };

    // Count courses by description type
    coursesData.forEach(course => {
        stats.byDescription[course.description] = (stats.byDescription[course.description] || 0) + 1;
    });

    // Only validate prerequisites now
    coursesData.forEach(course => {
        if (course.prerequisites && course.prerequisites.length > 0) {
            const invalidPrereqs = course.prerequisites.filter(prereqId => 
                !allCourseIds.has(prereqId)
            );
            
            if (invalidPrereqs.length > 0) {
                issues.invalidPrerequisites.push({
                    courseId: course.courseId,
                    courseName: course.courseName,
                    invalidPrerequisites: invalidPrereqs
                });
            }
        }
    });

    return { issues, stats };
}

function printValidationReport(validation) {
    const { issues, stats } = validation;
    
    console.log('\nCourse Statistics:');
    console.log('=================');
    console.log(`Total Courses: ${stats.totalCourses}`);
    console.log(`Courses with SubCategories: ${stats.withSubCategories}`);
    
    console.log('\nCourses by Description:');
    Object.entries(stats.byDescription).forEach(([description, count]) => {
        console.log(`${description}: ${count}`);
    });
    
    if (issues.invalidPrerequisites.length > 0) {
        console.log('\nCourses with Invalid Prerequisites:');
        console.log('--------------------------------');
        issues.invalidPrerequisites.forEach(course => {
            console.log(`Course ID: ${course.courseId}`);
            console.log(`Course Name: ${course.courseName}`);
            console.log(`Invalid Prerequisites: ${course.invalidPrerequisites.join(', ')}`);
            console.log('---');
        });
    } else {
        console.log('\n✅ All prerequisites are valid');
    }
    
    return issues.invalidPrerequisites.length === 0;
}

module.exports = { validateCourseData, printValidationReport };