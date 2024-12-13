// frontend/src/pages/EditPassedCourses.jsx
import { useState, useEffect } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { CATEGORY_ORDER } from '../utils/constants';

const EditPassedCourses = () => {
  const [courses, setCourses] = useState([]);
  const [passedCourses, setPassedCourses] = useState([]);
  const [editedCourses, setEditedCourses] = useState([]);
  const [openCategories, setOpenCategories] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [invalidCourses, setInvalidCourses] = useState(new Map());
  const [validationError, setValidationError] = useState(null);
  const [persistentErrors, setPersistentErrors] = useState([]);
  const token = localStorage.getItem('token');

  const fetchData = async () => {
    try {
      const [profileRes, coursesRes] = await Promise.all([
        fetch('http://localhost:5000/api/auth/profile', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('http://localhost:5000/api/courses')
      ]);

      const [profileData, coursesData] = await Promise.all([
        profileRes.json(),
        coursesRes.json()
      ]);

      if (coursesData.success && coursesData.data?.courses) {
        setCourses(coursesData.data.courses);
      }

      if (profileData.success && profileData.data) {
        setPassedCourses(profileData.data.completedCourses || []);
      }

      setLoading(false);
    } catch (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const startEditing = () => {
    setEditedCourses([...passedCourses]);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setEditedCourses([]);
    setIsEditing(false);
    setValidationError(null); // Clear validation error
    setInvalidCourses(new Map()); // Clear invalid courses
    setPersistentErrors([]); // Add this line to clear persistent errors
  };

  // Update handleGradeChange to handle validation result safely
  const handleGradeChange = (courseId, newGrade) => {
    setEditedCourses(prev => {
      const updatedCourses = [...prev];
      const courseIndex = updatedCourses.findIndex(c => c.courseId === courseId);

      if (newGrade === '') {
        if (courseIndex !== -1) {
          updatedCourses.splice(courseIndex, 1);
        }
      } else if (courseIndex !== -1) {
        updatedCourses[courseIndex] = { ...updatedCourses[courseIndex], grade: newGrade };
      } else {
        updatedCourses.push({
          courseId,
          grade: newGrade,
          semester: `${new Date().getFullYear()}-${Math.floor(new Date().getMonth() / 6) + 1}`
        });
      }

      // Validate and update errors
      const validation = validateOptionalUniversityCourses(updatedCourses);
      if (!validation.isValid) {
        // Check if violations exist before mapping
        const errors = validation.violations ? 
          validation.violations.map(v => `Multiple courses selected from ${v.subcategory}:\n${v.courses}`) :
          ['Invalid course selection'];
        
        setPersistentErrors(errors);
        setInvalidCourses(validation.invalidCourses || new Map());
      } else {
        setPersistentErrors([]);
        setInvalidCourses(new Map());
      }

      return updatedCourses;
    });
  };

  // Add helper to get course name by ID
  const getCourseName = (courseId) => {
    const course = courses.find(c => c.courseId === courseId);
    return course?.courseName || courseId;
  };

  // Add credit hour calculation helper
  const calculateTotalCreditHours = (passedCourses) => {
    const baseCredits = passedCourses.reduce((total, passedCourse) => {
      if (!passedCourse.grade || ['F', 'D-'].includes(passedCourse.grade)) {
        return total;
      }
  
      const course = courses.find(c => c.courseId === passedCourse.courseId);
      if (!course || course.description === 'متطلبات إجبارية عامة') {
        return total;
      }
  
      // First calculate without constraint courses
      if (!['0901420', '0977598', '0907500'].includes(course.courseId)) {
        return total + course.creditHours;
      }
  
      return total;
    }, 0);
  
    // Now check constraint courses and add their credits if requirements are met
    const constraintCredits = passedCourses.reduce((total, passedCourse) => {
      if (!passedCourse.grade || ['F', 'D-'].includes(passedCourse.grade)) {
        return total;
      }
  
      const course = courses.find(c => c.courseId === passedCourse.courseId);
      if (!course) return total;
  
      switch (course.courseId) {
        case '0901420': // اقتصاد هندسي
          return baseCredits >= 90 ? total + 3 : total;
        case '0977598': // مشروع 1
          return baseCredits >= 120 ? total + 1 : total;
        case '0907500': // التدريب العملي
          return baseCredits >= 120 ? total + 3 : total;
        default:
          return total;
      }
    }, 0);
  
    return baseCredits + constraintCredits;
  };

  // Update validateOptionalUniversityCourses function
  const validateOptionalUniversityCourses = (coursesWithGrades) => {
    const optionalCourses = coursesWithGrades.filter(course => {
      const courseInfo = courses.find(c => c.courseId === course.courseId);
      return courseInfo?.description === 'متطلبات الجامعة الاختيارية' && course.grade;
    });

    // Group courses by subcategory
    const subcategoryCounts = {};
    const violations = new Map();

    optionalCourses.forEach(course => {
      const courseInfo = courses.find(c => c.courseId === course.courseId);
      if (courseInfo?.subCategory) {
        if (!subcategoryCounts[courseInfo.subCategory]) {
          subcategoryCounts[courseInfo.subCategory] = [course];
        } else {
          subcategoryCounts[courseInfo.subCategory].push(course);
          // If more than one course in subcategory, mark all as violations
          subcategoryCounts[courseInfo.subCategory].forEach(violatingCourse => {
            violations.set(violatingCourse.courseId, 
              `Multiple courses selected from ${courseInfo.subCategory}`);
          });
        }
      }
    });

    if (violations.size > 0) {
      const errors = Object.entries(subcategoryCounts)
        .filter(([_, courses]) => courses.length > 1)
        .map(([subcat, courses]) => ({
          subcategory: subcat,
          courses: courses.map(c => {
            const courseInfo = courses.find(course => 
              course.courseId === c.courseId
            );
            return courses.find(course => 
              course.courseId === c.courseId
            )?.courseName || c.courseId;
          }).join(', ')
        }));

      return {
        isValid: false,
        violations: errors,
        invalidCourses: violations
      };
    }

    return { 
      isValid: true,
      invalidCourses: new Map()
    };
  };

  const validateOptionalMajorCourses = (coursesWithGrades) => {
    const majorOptionalCount = coursesWithGrades.filter(course => {
      const courseInfo = courses.find(c => c.courseId === course.courseId);
      return courseInfo?.description === 'متطلبات التخصص الاختيارية' && course.grade;
    }).length;

    if (majorOptionalCount > 5) {
      return {
        isValid: false,
        message: 'You can only select 5 major elective courses'
      };
    }

    return { isValid: true };
  };

  // Update validation helper
  const validatePrerequisites = (coursesWithGrades) => {
    const errors = [];
    const newInvalidCoursesMap = new Map();
  
    const totalCreditHours = calculateTotalCreditHours(coursesWithGrades);
    console.log('Calculated credit hours:', totalCreditHours);
  
    coursesWithGrades.forEach(selectedCourse => {
      if (!selectedCourse.grade || selectedCourse.grade === '') return;
      
      const courseInfo = courses.find(c => c.courseId === selectedCourse.courseId);
      if (!courseInfo) return;
  
      let courseErrors = [];
  
      // Check credit hours for special courses
      if (courseInfo.courseId === '0901420') { // اقتصاد هندسي (3 credit hours)
        if (totalCreditHours < 90) {
          courseErrors.push(
            `Cannot take اقتصاد هندسي - Requires 90 credit hours (you have ${totalCreditHours})`
          );
        }
      }
  
      if (courseInfo.courseId === '0977598') { // مشروع 1 (1 credit hour)
        if (totalCreditHours < 120) {
          courseErrors.push(
            `Cannot take مشروع 1 - Requires 120 credit hours (you have ${totalCreditHours})`
          );
        }
      }
  
      if (courseInfo.courseId === '0907500') { // التدريب العملي (3 credit hours)
        if (totalCreditHours < 120) {
          courseErrors.push(
            `Cannot take التدريب العملي - Requires 120 credit hours (you have ${totalCreditHours})`
          );
        }
      }
  
      // Check prerequisites
      if (courseInfo.prerequisites?.length > 0) {
        const missingPrereqs = courseInfo.prerequisites.filter(prereqId => {
          const prereqPassed = coursesWithGrades.find(c => 
            c.courseId === prereqId && 
            c.grade && 
            !['F', 'D-'].includes(c.grade)
          );
          return !prereqPassed;
        });
  
        if (missingPrereqs.length > 0) {
          const prereqNames = missingPrereqs.map(prereqId => {
            const prereq = courses.find(c => c.courseId === prereqId);
            return prereq?.courseName || prereqId;
          });
  
          courseErrors.push(
            `You must pass the following prerequisites first:`,
            ...prereqNames.map(name => `• ${name}`)
          );
        }
      }
  
      if (courseErrors.length > 0) {
        newInvalidCoursesMap.set(selectedCourse.courseId, courseErrors);
        errors.push({
          courseId: selectedCourse.courseId,
          courseName: courseInfo.courseName,
          errors: courseErrors
        });
      }
    });
  
    if (errors.length > 0) {
      let errorMessage = 'Cannot save due to the following issues:\n\n';
      
      errors.forEach(error => {
        errorMessage += `${error.courseName}:\n`;
        errorMessage += error.errors.join('\n');
        errorMessage += '\n\n';
      });
  
      toast.error(errorMessage, {
        duration: 8000,
        style: {
          maxWidth: '500px',
          whiteSpace: 'pre-wrap'
        }
      });
  
      setInvalidCourses(newInvalidCoursesMap);
      return false;
    }
  
    setInvalidCourses(new Map());
    return true;
  };

  // Update handleSubmit to check both validations
  const handleSubmit = async () => {
    try {
      const uniOptionalValidation = validateOptionalUniversityCourses(editedCourses);
      const majorOptionalValidation = validateOptionalMajorCourses(editedCourses);
      const prerequisiteErrors = validatePrerequisites(editedCourses);
  
      if (!uniOptionalValidation.isValid || !majorOptionalValidation.isValid || !prerequisiteErrors) {
        return; // Prevent saving if any validation fails
      }
  
      const response = await fetch('http://localhost:5000/api/auth/passed-courses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ passedCourses: editedCourses })
      });
  
      const data = await response.json();
  
      if (data.success) {
        setPassedCourses(editedCourses);
        setEditedCourses([]);
        setIsEditing(false);
        toast.success('Changes saved successfully');
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  // Add grouping function before the return statement
  const groupedCourses = CATEGORY_ORDER.reduce((ordered, category) => {
    const categoryCourses = courses.filter(course => course.description === category);
    if (categoryCourses.length > 0) {
      ordered[category] = categoryCourses;
    }
    return ordered;
  }, {});

  // Add helper function to group courses by subcategory
  const getSubcategoriesForCategory = (category) => {
    return courses
      .filter(course => course.description === category && course.subCategory)
      .reduce((acc, course) => {
        if (!acc.includes(course.subCategory)) {
          acc.push(course.subCategory);
        }
        return acc;
      }, []);
  };

  // Update course display to show subcategories
  const renderCourseList = (category, categoryCourses) => {
    const subcategories = getSubcategoriesForCategory(category);
    
    return (
      <div className="divide-y divide-gray-200">
        {category === 'متطلبات الجامعة الاختيارية' ? (
          // Group by subcategory
          subcategories.map(subcategory => (
            <div key={subcategory} className="py-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">{subcategory}</h4>
              {categoryCourses
                .filter(course => course.subCategory === subcategory)
                .map(course => renderCourseRow(course))}
            </div>
          ))
        ) : (
          // Regular course list
          categoryCourses.map(course => renderCourseRow(course))
        )}
      </div>
    );
  };

  // Update course row rendering
  const renderCourseRow = (course) => {
    const existingCourse = (isEditing ? editedCourses : passedCourses)
      .find(pc => pc.courseId === course.courseId);
    
    return (
      <div 
        key={course.courseId} 
        className={`px-6 py-4 flex items-center justify-between transition-colors duration-150
          ${invalidCourses.has(course.courseId) ? 'bg-red-50' : 'hover:bg-gray-50'}`}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline">
            <span className="text-sm font-medium text-gray-900">{course.courseId}</span>
            <span className="ml-2 text-sm text-gray-500">{course.courseName}</span>
            {course.subCategory && (
              <span className="ml-2 text-xs text-blue-600">({course.subCategory})</span>
            )}
          </div>
          {invalidCourses.has(course.courseId) && (
            <p className="mt-1 text-sm text-red-600">
              {invalidCourses.get(course.courseId)}
            </p>
          )}
        </div>
        
        {/* Grade Selection */}
        {isEditing ? (
          <select
            value={existingCourse?.grade || ''}
            onChange={(e) => handleGradeChange(course.courseId, e.target.value)}
            className={`ml-4 block w-32 rounded-md border-gray-300 shadow-sm 
              focus:border-blue-500 focus:ring-blue-500 sm:text-sm
              ${invalidCourses.has(course.courseId) ? 'border-red-300' : ''}`}
          >
            <option value="">Not Taken</option>
            {course.description === 'متطلبات إجبارية عامة' 
              ? ['P', 'F'].map(grade => (
                  <option key={grade} value={grade}>{grade}</option>
                ))
              : ['A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F'].map(grade => (
                  <option key={grade} value={grade}>{grade}</option>
                ))
            }
          </select>
        ) : (
          existingCourse && (
            <span className="text-sm font-medium text-gray-900">
              Grade: {existingCourse.grade}
            </span>
          )
        )}
      </div>
    );
  };

  // Add this function inside EditPassedCourses component
  const toggleCategory = (category) => {
    setOpenCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header Section */}
      <div className="bg-white shadow-sm rounded-lg px-6 py-4 mb-6">
        <div className="sm:flex sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Passed Courses</h1>
            <p className="mt-1 text-sm text-gray-500">
              {isEditing ? 'Edit your course grades' : 'View and manage your completed courses'}
            </p>
          </div>
          <div className="mt-4 sm:mt-0">
            {!isEditing ? (
              <button
                onClick={startEditing}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Edit Courses
              </button>
            ) : (
              <div className="flex space-x-3">
                <button
                  onClick={cancelEditing}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  Save Changes
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Persistent Errors */}
      {persistentErrors.length > 0 && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-red-800 mb-2">Please fix the following issues:</h3>
          <div className="space-y-2">
            {persistentErrors.map((error, index) => (
              <div key={index} className="text-sm text-red-600">
                {error}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Categories Section */}
      <div className="space-y-6">
        {Object.entries(groupedCourses).map(([category, categoryCourses]) => (
          <div key={category} className="bg-white shadow-sm rounded-lg overflow-hidden">
            <button
              onClick={() => toggleCategory(category)}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center">
                <h2 className="text-lg font-medium text-gray-900">{category}</h2>
                <span className="ml-2 text-sm text-gray-500">
                  ({categoryCourses.length} courses)
                </span>
              </div>
              <ChevronDownIcon 
                className={`h-5 w-5 text-gray-400 transform transition-transform duration-200 
                  ${openCategories[category] ? 'rotate-180' : ''}`}
              />
            </button>

            {openCategories[category] && (
              <div className="border-t border-gray-200">
                {category === 'متطلبات الجامعة الاختيارية' ? (
                  // Group by subcategory
                  Object.entries(groupBySubcategory(categoryCourses)).map(([subcat, courses]) => (
                    <div key={subcat} className="border-b border-gray-100 last:border-b-0">
                      <div className="px-6 py-3 bg-gray-50">
                        <h3 className="text-sm font-medium text-gray-700">{subcat}</h3>
                      </div>
                      <div className="divide-y divide-gray-100">
                        {courses.map(course => renderCourseRow(course))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="divide-y divide-gray-100">
                    {categoryCourses.map(course => renderCourseRow(course))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// Helper function to group courses by subcategory
const groupBySubcategory = (courses) => {
  return courses.reduce((acc, course) => {
    if (course.subCategory) {
      if (!acc[course.subCategory]) {
        acc[course.subCategory] = [];
      }
      acc[course.subCategory].push(course);
    }
    return acc;
  }, {});
};

// Course row component
const renderCourseRow = (course) => {
  const existingCourse = (isEditing ? editedCourses : passedCourses)
    .find(pc => pc.courseId === course.courseId);
  
  return (
    <div 
      key={course.courseId} 
      className={`px-6 py-4 flex items-center justify-between ${
        invalidCourses.has(course.courseId) ? 'bg-red-50' : 'hover:bg-gray-50'
      }`}
    >
      <div className="flex-1">
        <div className="flex items-center">
          <span className="text-sm font-medium text-gray-900">{course.courseId}</span>
          <span className="ml-2 text-sm text-gray-500">{course.courseName}</span>
        </div>
        {invalidCourses.has(course.courseId) && (
          <p className="mt-1 text-sm text-red-600">
            {invalidCourses.get(course.courseId)}
          </p>
        )}
      </div>
      {isEditing ? (
        <select
          value={existingCourse?.grade || ''}
          onChange={(e) => handleGradeChange(course.courseId, e.target.value)}
          className="ml-4 block w-32 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        >
          <option value="">Not Taken</option>
          {course.description === 'متطلبات إجبارية عامة' 
            ? ['P', 'F'].map(grade => (
                <option key={grade} value={grade}>{grade}</option>
              ))
            : ['A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F'].map(grade => (
                <option key={grade} value={grade}>{grade}</option>
              ))
          }
        </select>
      ) : existingCourse && (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          Grade: {existingCourse.grade}
        </span>
      )}
    </div>
  );
};

export default EditPassedCourses;