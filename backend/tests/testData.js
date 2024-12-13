// tests/testData.js
const testStudent = {
    studentId: "20200123",
    email: "student@ju.edu.jo",
    password: "Test123456",
    academicYear: 2020,
    creditHours: 85,
    gpa: 3.45,
    passedCourses: [
      { courseId: "0907101", grade: "B+" },   // Intro to Programming
      { courseId: "0907102", grade: "A-" },   // Programming Lab
      { courseId: "0907231", grade: "B" },    // Data Structures
      { courseId: "0907241", grade: "C+" },   // Digital Logic Design
      { courseId: "0907251", grade: "B-" }    // Networks
    ]
  };
  
  const testPreferences = {
    studentId: "20200123",
    preferredDays: "sun_tue_thu",
    preferBreaks: "yes",
    targetCreditHours: 15,
    specificCourses: [], // No specific courses requested
    coursesToImprove: [], // No courses to improve
    categoryPreferences: {
      networking: "prefer",
      hardware: "neutral",
      software: "prefer",
      electrical: "dislike"
    }
  };
  
  module.exports = {
    testStudent,
    testPreferences
  };