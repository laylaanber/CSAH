// frontend/src/pages/EditPassedCourses.jsx
import { useState, useEffect } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { CATEGORY_ORDER } from '../utils/constants';

// Add ActionButtons component at the top of the file
const ActionButtons = ({ isEditing, onEdit, onCancel, onSubmit, loading, hasErrors }) => {
  if (!isEditing) {
    return (
      <button
        onClick={onEdit}
        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        Edit Courses
      </button>
    );
  }

  return (
    <div className="flex space-x-3">
      <button
        onClick={onCancel}
        className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
      >
        Cancel
      </button>
      <button
        onClick={onSubmit}
        disabled={loading || hasErrors}
        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Saving...' : 'Save Changes'}
      </button>
    </div>
  );
};

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
  const [immediateErrors, setImmediateErrors] = useState(new Map());
  const [floatingError, setFloatingError] = useState('');
  const [stickyError, setStickyError] = useState('');
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
      handleError(error.message);
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

  const clearAllErrors = () => {
    setError(null);
    setValidationError(null);
    setInvalidCourses(new Map());
    setPersistentErrors([]);
    setImmediateErrors(new Map());
    setFloatingError('');
    setStickyError('');
  };

  const cancelEditing = () => {
    setEditedCourses([]);
    setIsEditing(false);
    clearAllErrors();
  };

  // Add immediate validation function
  const validateCoursePrerequisites = (courseId, grade, allCourses) => {
    const courseInfo = courses.find(c => c.courseId === courseId);
    if (!courseInfo?.prerequisites?.length) return null;

    const missingPrereqs = courseInfo.prerequisites.filter(prereqId => {
      const prereqPassed = allCourses.find(c => 
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
      
      return {
        courseId,
        error: `Missing prerequisites: ${prereqNames.join(', ')}`
      };
    }
    return null;
  };

  // Update handleGradeChange to handle validation result safely
  const handleGradeChange = (courseId, newGrade) => {
    setEditedCourses(prev => {
      const updatedCourses = [...prev];
      const courseIndex = updatedCourses.findIndex(c => c.courseId === courseId);

      // Handle grade change
      if (newGrade === '') {
        if (courseIndex !== -1) {
          updatedCourses.splice(courseIndex, 1);
        }
      } else {
        const course = courses.find(c => c.courseId === courseId);
        const isGeneralReq = course?.description === 'متطلبات إجبارية عامة';

        if (courseIndex !== -1) {
          updatedCourses[courseIndex] = { 
            ...updatedCourses[courseIndex], 
            grade: newGrade,
            creditHours: course?.creditHours || 0
          };
        } else {
          updatedCourses.push({
            courseId,
            grade: newGrade,
            creditHours: course?.creditHours || 0,
            semester: `${new Date().getFullYear()}-${Math.floor(new Date().getMonth() / 6) + 1}`
          });
        }
      }

      // Debug total credit hours
      const totalCredits = calculateTotalCreditHours(updatedCourses);
      console.log('New total credits:', totalCredits);

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

      // Immediate prerequisite validation
      const error = validateCoursePrerequisites(courseId, newGrade, updatedCourses);
      if (error) {
        setImmediateErrors(prev => new Map(prev.set(courseId, error.error)));
      } else {
        setImmediateErrors(prev => {
          const newMap = new Map(prev);
          newMap.delete(courseId);
          return newMap;
        });
      }

      // Validate all constraints
      validatePrerequisites(updatedCourses);
      validateOptionalUniversityCourses(updatedCourses);

      return updatedCourses;
    });
  };

  // Add helper to get course name by ID
  const getCourseName = (courseId) => {
    const course = courses.find(c => c.courseId === courseId);
    return course?.courseName || courseId;
  };

  // Add credit hour calculation helper
  const calculateTotalCreditHours = (coursesWithGrades) => {
    // First calculate base credits without special courses
    const baseCredits = coursesWithGrades.reduce((total, passedCourse) => {
      // Skip if no grade or failed
      if (!passedCourse.grade || ['F', 'D-'].includes(passedCourse.grade)) {
        return total;
      }
  
      const course = courses.find(c => c.courseId === passedCourse.courseId);
      if (!course) return total;
  
      // Special handling for متطلبات إجبارية عامة courses
      if (course.description === 'متطلبات إجبارية عامة') {
        // Only count if grade is 'P'
        return passedCourse.grade === 'P' ? total + (course.creditHours || 0) : total;
      }
  
      // Regular courses
      return total + (course.creditHours || 0);
    }, 0);
  
    // Debug logging
    console.log('Credit hours calculation:', {
      coursesWithGrades: coursesWithGrades.map(c => ({
        id: c.courseId,
        grade: c.grade,
        credits: courses.find(course => course.courseId === c.courseId)?.creditHours || 0
      })),
      baseCredits
    });
  
    return baseCredits;
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
    const optionalMajorCourses = coursesWithGrades.filter(course => {
      const courseInfo = courses.find(c => c.courseId === course.courseId);
      return courseInfo?.description === 'متطلبات التخصص الاختيارية' && course.grade;
    });
  
    if (optionalMajorCourses.length > 5) {
      const selectedCourses = optionalMajorCourses.map(course => {
        const courseInfo = courses.find(c => c.courseId === course.courseId);
        return `${courseInfo?.courseName} (${course.courseId})`;
      }).join(', ');
  
      return {
        isValid: false,
        message: `You can only select 5 major elective courses. Currently selected (${optionalMajorCourses.length}): ${selectedCourses}`
      };
    }
  
    return { isValid: true };
  };

  // Update validation helper
  const validatePrerequisites = (coursesWithGrades) => {
    const errors = new Map();
    const totalCreditHours = calculateTotalCreditHours(coursesWithGrades);

    coursesWithGrades.forEach(selectedCourse => {
      if (!selectedCourse.grade || selectedCourse.grade === '') return;
      
      const courseInfo = courses.find(c => c.courseId === selectedCourse.courseId);
      if (!courseInfo) return;

      // Check credit hours for special courses
      switch (courseInfo.courseId) {
        case '0901420': // اقتصاد هندسي
          if (totalCreditHours < 90) {
            errors.set(courseInfo.courseId, 
              `Cannot take ${courseInfo.courseName} - Requires 90 credit hours (current: ${totalCreditHours})`
            );
          }
          break;
          
        case '0977598': // مشروع 1
          if (totalCreditHours < 120) {
            errors.set(courseInfo.courseId, 
              `Cannot take ${courseInfo.courseName} - Requires 120 credit hours (current: ${totalCreditHours})`
            );
          }
          break;
          
        case '0947500': // التدريب العملي (للحاسوب)
          if (totalCreditHours < 120) {
            errors.set(courseInfo.courseId, 
              `Cannot take ${courseInfo.courseName} - Requires 120 credit hours (current: ${totalCreditHours})`
            );
          }
          break;
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

          errors.set(courseInfo.courseId, 
            `Prerequisites needed for ${courseInfo.courseName}: ${prereqNames.join(', ')}`
          );
        }
      }
    });

    setImmediateErrors(errors);
    return errors.size === 0;
  };

  // Update handleSubmit to check both validations
  const handleSubmit = async () => {
    try {
      const uniOptionalValidation = validateOptionalUniversityCourses(editedCourses);
      const majorOptionalValidation = validateOptionalMajorCourses(editedCourses);
      const prerequisiteErrors = validatePrerequisites(editedCourses);
  
      if (!uniOptionalValidation.isValid || !majorOptionalValidation.isValid || !prerequisiteErrors) {
        if (!majorOptionalValidation.isValid) {
          setPersistentErrors(prev => [...prev, majorOptionalValidation.message]);
        }
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
        clearAllErrors();
        toast.success('Changes saved successfully');
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  // Update error handling to show in both places
  const handleError = (message) => {
    setError(message);
    setFloatingError(message);
    setStickyError(message);
  };

  // Clear both errors
  const clearErrors = () => {
    setError(null);
    setFloatingError('');
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
      <div key={course.courseId}>
        <div 
          className={`px-6 py-4 flex items-center justify-between transition-colors duration-150
            ${invalidCourses.has(course.courseId) ? 'bg-red-50' : 'hover:bg-gray-50'}
            ${immediateErrors.has(course.courseId) ? 'bg-red-50' : 'hover:bg-gray-50'}`}
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
        {immediateErrors.has(course.courseId) && (
          <div className="px-6 py-2 bg-red-50">
            <p className="text-sm text-red-600">{immediateErrors.get(course.courseId)}</p>
          </div>
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

  // Move ErrorSummary inside EditPassedCourses
  const ErrorSummary = ({ immediateErrors, persistentErrors, validationError }) => {
    const totalErrors = immediateErrors.size + persistentErrors.length + (validationError ? 1 : 0);
    
    if (totalErrors === 0) return null;

    const formatPrereqError = (courseId, error) => {
      const course = courses.find(c => c.courseId === courseId);
      return `Prerequisites missing for ${course?.courseName || ''} (${courseId})`;
    };

    const formatMultipleSelectionError = (error) => {
      if (error.includes('Multiple courses selected from')) {
        return error.replace(/(\d{7})/g, (id) => {
          const course = courses.find(c => c.courseId === id);
          return course ? `${course.courseName} (${id})` : id;
        });
      }
      return error;
    };

    return (
      <div className="flex-1 mr-4">
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-3 rounded">
          <div className="flex items-center mb-2">
            <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">
              {totalErrors} error{totalErrors > 1 ? 's' : ''} to resolve:
            </span>
          </div>
          <div className="ml-7 text-sm space-y-2 max-h-32 overflow-y-auto">
            {Array.from(immediateErrors.entries()).map(([courseId, error], idx) => (
              <div key={`immediate-${idx}`} className="flex items-start">
                <span className="mr-2">•</span>
                <span>{formatPrereqError(courseId, error)}</span>
              </div>
            ))}
            {persistentErrors.map((error, idx) => (
              <div key={`persistent-${idx}`} className="flex items-start">
                <span className="mr-2">•</span>
                <span>{formatMultipleSelectionError(error)}</span>
              </div>
            ))}
            {validationError && (
              <div className="flex items-start">
                <span className="mr-2">•</span>
                <span>{validationError}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen relative">
      {/* Keep only the Sticky Header with buttons */}
      <div className="sticky top-0 z-50 bg-white shadow-md border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <ErrorSummary 
              immediateErrors={immediateErrors}
              persistentErrors={persistentErrors}
              validationError={validationError}
            />
            <ActionButtons 
              isEditing={isEditing}
              onEdit={startEditing}
              onCancel={cancelEditing}
              onSubmit={handleSubmit}
              loading={loading}
              hasErrors={invalidCourses.size > 0}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="bg-white shadow-sm rounded-lg px-6 py-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Passed Courses</h1>
            <p className="mt-1 text-sm text-gray-500">
              {isEditing ? 'Edit your course grades' : 'View and manage your completed courses'}
            </p>
          </div>
        </div>

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
    <div key={course.courseId}>
      <div className={`px-6 py-4 flex items-center justify-between ${
        invalidCourses.has(course.courseId) ? 'bg-red-50' : 'hover:bg-gray-50'
      }`}>
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
      {immediateErrors.has(course.courseId) && (
        <div className="px-6 py-2 bg-red-50">
          <p className="text-sm text-red-600">{immediateErrors.get(course.courseId)}</p>
        </div>
      )}
    </div>
  );
};

export default EditPassedCourses;