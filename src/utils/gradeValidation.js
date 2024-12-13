// frontend/src/utils/gradeValidation.js
// Create shared validation logic
export const getCategoryCount = (passedCourses, courses, category) => {
  return passedCourses.filter(pc => 
    courses.find(c => c.courseId === pc.courseId)?.description === category
  ).length;
};

export const canAddCourse = (courseDescription, passedCourses, courses) => {
  if (courseDescription === 'متطلبات الجامعة الاختيارية') {
    return getCategoryCount(passedCourses, courses, courseDescription) < 3;
  }
  if (courseDescription === 'متطلبات التخصص الاختيارية') {
    return getCategoryCount(passedCourses, courses, courseDescription) < 5;
  }
  return true;
};

export const getAvailableGrades = (courseDescription) => {
  if (courseDescription === 'متطلبات إجبارية عامة') {
    return ['P', 'F'];
  }
  return ['A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F'];
};