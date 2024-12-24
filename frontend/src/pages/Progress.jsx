// frontend/src/pages/Progress.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { Tab } from '@headlessui/react';
import { BookOpenIcon, ClockIcon, ExclamationTriangleIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { CATEGORY_ORDER } from '../utils/constants';
import { PieChart } from 'react-minimal-pie-chart';

// Update helper functions
const hasPassed = (grade) => {
  const passingGrades = ['D', 'D+', 'C-', 'C', 'C+', 'B-', 'B', 'B+', 'A-', 'A'];
  return grade && passingGrades.includes(grade);
};

const hasPassedPrereq = (grade) => {
  const passingGrades = ['P', 'D', 'D+', 'C-', 'C', 'C+', 'B-', 'B', 'B+', 'A-', 'A'];
  return grade && passingGrades.includes(grade);
};

const isFailGrade = (grade) => ['F', 'D-'].includes(grade);

const getMajorElectivesCount = (passedCourses, allCourses) => {
  return passedCourses.filter(course => {
    const courseInfo = allCourses.find(c => c.courseId === course.courseId);
    return courseInfo?.description === 'متطلبات التخصص الاختيارية' && hasPassed(course.grade);
  }).length;
};

const getPassedSubcategories = (passedCourses, allCourses) => {
  const passed = new Set();
  passedCourses.forEach(course => {
    const courseInfo = allCourses.find(c => c.courseId === course.courseId);
    if (courseInfo?.description === 'متطلبات الجامعة الاختيارية' && 
        hasPassed(course.grade) && 
        courseInfo.subCategory) {
      passed.add(courseInfo.subCategory);
    }
  });
  return passed;
};

// Update filterCoursesByConstraints function
const filterCoursesByConstraints = (courses, passedCourses, allCourses) => {
  // Debug logs
  console.log('Filtering with:', {
    totalCourses: courses ? Object.values(courses).flat().length : 0,
    passedCourses: passedCourses?.length,
    allCourses: allCourses?.length
  });

  // Update hasPrerequisitesMet function with new passing logic
  const hasPrerequisitesMet = (course) => {
    if (!course.prerequisites?.length) return true;
    
    return course.prerequisites.every(prereqId => {
      const passedPrereq = passedCourses.find(p => p.courseId === prereqId);
      return passedPrereq && hasPassed(passedPrereq.grade);
    });
  };

  // Track passed courses by category
  const passedByCategory = passedCourses.reduce((acc, course) => {
    const courseInfo = allCourses.find(c => c.courseId === course.courseId);
    if (courseInfo?.description && hasPassed(course.grade)) {
      if (!acc[courseInfo.description]) {
        acc[courseInfo.description] = [];
      }
      acc[courseInfo.description].push(course);
    }
    return acc;
  }, {});

  // Get passed subcategories for university electives
  const passedSubcategories = new Set();
  passedCourses.forEach(course => {
    const courseInfo = allCourses.find(c => c.courseId === course.courseId);
    if (courseInfo?.description === 'متطلبات الجامعة الاختيارية' && 
        hasPassed(course.grade) && 
        courseInfo.subCategory) {
      passedSubcategories.add(courseInfo.subCategory);
    }
  });

  return Object.entries(courses || {}).reduce((filtered, [category, categoryCourses]) => {
    if (!categoryCourses?.length) return filtered;

    let filteredCourses = [...categoryCourses];

    // Major electives cap
    if (category === 'متطلبات التخصص الاختيارية' && 
        (passedByCategory[category]?.length || 0) >= 5) {
      return filtered;
    }

    // University electives subcategories
    if (category === 'متطلبات الجامعة الاختيارية') {
      filteredCourses = filteredCourses.filter(course => 
        !passedSubcategories.has(course.subCategory)
      );
    }

    // Filter based on prerequisites and passing status
    filteredCourses = filteredCourses.filter(course => {
      // Keep course if:
      // 1. Not passed or failed
      // 2. Prerequisites are met
      const passed = passedCourses.find(p => p.courseId === course.courseId);
      return (!passed || !hasPassed(passed.grade)) && hasPrerequisitesMet(course);
    });

    // Debug prerequisite checking
    console.log('Filtered courses for', category, ':', 
      filteredCourses.map(c => ({
        id: c.courseId,
        name: c.courseName,
        prereqsMet: hasPrerequisitesMet(c)
      }))
    );

    if (filteredCourses.length > 0) {
      filtered[category] = filteredCourses;
    }

    return filtered;
  }, {});
};

const REQUIRED_CREDITS = {
  'متطلبات الجامعة الإجبارية': 18,    // 6 courses × 3 credits
  'متطلبات الجامعة الاختيارية': 9,    // 3 courses × 3 credits
  'متطلبات الكلية الإجبارية': 27,     // Mix of 3 and 1 credit courses
  'متطلبات التخصص الإجبارية': 92,     // Mix of credits
  'متطلبات التخصص الاختيارية': 15,    // 5 courses × 3 credits
  'متطلبات إجبارية عامة': 15          // Mix of credits
};

const REQUIRED_COURSES = {
  'متطلبات الجامعة الإجبارية': 6,
  'متطلبات الجامعة الاختيارية': 3,    // 1 course from each subcategory
  'متطلبات الكلية الإجبارية': 11,
  'متطلبات التخصص الإجبارية': 38,
  'متطلبات التخصص الاختيارية': 5,     // Only 5 courses required
  'متطلبات إجبارية عامة': 5
};

// Add constant for zero credit courses
const ZERO_CREDIT_COURSES = [
  '0900150',  // خدمة المجتمع
  '1902098',  // امتحان تصنيفي حاسوب
  
  '3201098',  // امتحان تصنيفي عربي
 
  '3202098',  // امتحان تصنيفي انجليزي
  
];

// Add grade validation helper
const isPassingGrade = (grade) => {
  const failingGrades = ['F', 'D-'];
  return !failingGrades.includes(grade);
};

// Add helper function to count courses
const getCourseCount = (courses) => {
  return Object.values(courses || {}).reduce((sum, categoryCourses) => 
    sum + (Array.isArray(categoryCourses) ? categoryCourses.length : 0), 0
  );
};

// Add new helper functions
const isRetakeGrade = (grade) => ['F', 'D-', 'D', 'D+', 'C-'].includes(grade);

const filterRemainingCourses = (courses, passedCourses) => {
  return Object.entries(courses || {}).reduce((filtered, [category, categoryCourses]) => {
    const filteredCourses = categoryCourses.filter(course => {
      const passedCourse = passedCourses.find(p => p.courseId === course.courseId);
      // Include if not enrolled or failed
      return !passedCourse || isFailGrade(passedCourse.grade);
    });

    if (filteredCourses.length > 0) {
      filtered[category] = filteredCourses;
    }
    return filtered;
  }, {});
};

// Add new helper for credit hour constraints
const meetsHourRequirement = (courseId, creditHours) => {
  switch(courseId) {
    case '0901420': // اقتصاد هندسي
      return creditHours >= 90;
    case '0977598': // مشروع 1 الحاسوب
    case '0947500': // التدريب العملي
      return creditHours >= 120;
    default:
      return true;
  }
};

// Update filterAvailableCourses function
const filterAvailableCourses = (courses, passedCourses, allCourses, studentCreditHours) => {
  return Object.entries(courses || {}).reduce((filtered, [category, categoryCourses]) => {
    const filteredCourses = categoryCourses.filter(course => {
      const passedCourse = passedCourses.find(p => p.courseId === course.courseId);
      
      // Check if course was never taken or failed
      const isAvailable = !passedCourse || isFailGrade(passedCourse.grade);
      
      // Check prerequisites
      const hasPrereqs = !course.prerequisites?.length || course.prerequisites.every(prereqId => {
        const passedPrereq = passedCourses.find(p => p.courseId === prereqId);
        return passedPrereq && hasPassedPrereq(passedPrereq.grade);
      });

      // Check credit hour requirements
      const hasEnoughCredits = meetsHourRequirement(course.courseId, studentCreditHours);

      // Debug logs
      console.log(`Course ${course.courseId}:`, {
        isAvailable,
        hasPrereqs,
        hasEnoughCredits,
        studentCreditHours,
        prerequisites: course.prerequisites,
        prereqGrades: course.prerequisites?.map(prereqId => {
          const prereq = passedCourses.find(p => p.courseId === prereqId);
          return {id: prereqId, grade: prereq?.grade};
        })
      });

      return isAvailable && hasPrereqs && hasEnoughCredits;
    });

    if (filteredCourses.length > 0) {
      filtered[category] = filteredCourses;
    }
    return filtered;
  }, {});
};

const filterRetakeCourses = (courses, passedCourses) => {
  return Object.entries(courses || {}).reduce((filtered, [category, categoryCourses]) => {
    const filteredCourses = categoryCourses.filter(course => {
      const passedCourse = passedCourses.find(p => p.courseId === course.courseId);
      return passedCourse && isRetakeGrade(passedCourse.grade);
    });

    if (filteredCourses.length > 0) {
      filtered[category] = filteredCourses;
    }
    return filtered;
  }, {});
};

// Move CourseList component outside
const CourseList = ({ courses, icon: Icon, type, passedCourses, allCourses, studentCreditHours }) => {
  const [openCategories, setOpenCategories] = useState({});

  const toggleCategory = (category) => {
    setOpenCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  // Filter courses based on type
  const filteredCourses = useMemo(() => {
    switch(type) {
      case 'remaining':
        return filterRemainingCourses(courses, passedCourses);
      case 'available':
        return filterAvailableCourses(courses, passedCourses, allCourses, studentCreditHours);
      case 'retake':
        return filterRetakeCourses(courses, passedCourses);
      default:
        return courses;
    }
  }, [courses, passedCourses, allCourses, type, studentCreditHours]);

  return (
    <div className="space-y-4">
      {Object.entries(filteredCourses).map(([category, courses]) => (
        <div key={category} className="bg-white rounded-lg shadow">
          <button
            onClick={() => toggleCategory(category)}
            className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
          >
            <h3 className="text-lg font-medium text-gray-900">{category}</h3>
            <ChevronDownIcon 
              className={`h-5 w-5 text-gray-500 transition-transform duration-200 ${
                openCategories[category] ? 'transform rotate-180' : ''
              }`}
            />
          </button>
          
          {openCategories[category] && (
            <div className="px-6 pb-4 divide-y divide-gray-200">
              {courses.map((course) => (
                <div key={course.courseId} className="py-4">
                  <div className="flex items-start">
                    <Icon className="h-5 w-5 text-gray-400 mt-1" />
                    <div className="ml-3 flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {course.courseId} - {course.courseName}
                      </p>
                      <p className="mt-1 text-sm text-gray-500">
                        {course.creditHours} Credit Hours 
                        {course.prerequisites?.length > 0 && 
                          ` • Prerequisites: ${course.prerequisites.join(', ')}`}
                      </p>
                      {type === 'retake' && (
                        <p className="mt-1 text-sm text-red-500">
                          Current Grade: {course.currentGrade}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

// Main Progress component
const Progress = () => {
  // 1. Keep all hooks at top level
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [allCourses, setAllCourses] = useState([]);
  const [courseData, setCourseData] = useState({
    remainingCourses: {},
    availableCourses: {},
    retakeCourses: {},
    passedCourses: [],
    studentCreditHours: 0
  });

  // 2. Memoize calculations
  const courseCounts = useMemo(() => ({
    remaining: Object.values(filterRemainingCourses(courseData.remainingCourses, courseData.passedCourses)).flat().length,
    available: Object.values(filterAvailableCourses(courseData.availableCourses, courseData.passedCourses, allCourses, courseData.studentCreditHours)).flat().length,
    retake: Object.values(filterRetakeCourses(courseData.retakeCourses, courseData.passedCourses)).flat().length
  }), [courseData.remainingCourses, courseData.availableCourses, courseData.retakeCourses, courseData.passedCourses, allCourses, courseData.studentCreditHours]);

  // 3. Move useEffect hook
  useEffect(() => {
    fetchCourseData();
  }, []);

  const fetchCourseData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/courses/progress', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      
      if (data.success) {
        setCourseData(data.data);
        // Combine all courses into allCourses
        setAllCourses([
          ...Object.values(data.data.remainingCourses || {}).flat(),
          ...Object.values(data.data.availableCourses || {}).flat(),
          ...Object.values(data.data.retakeCourses || {}).flat(),
          ...data.data.passedCourses || []
        ]);
      } else {
        throw new Error(data.message);
      }
      setLoading(false);
    } catch (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  const groupByCategory = (courses) => {
    return CATEGORY_ORDER.reduce((ordered, category) => {
      const categoryCourses = courses.filter(course => course.description === category);
      if (categoryCourses.length > 0) {
        ordered[category] = categoryCourses;
      }
      return ordered;
    }, {});
  };

  const calculateCourseProgress = () => {
    const allPassedCourses = courseData.passedCourses || [];
    
    // Filter out only zero credit courses, keep all passing grades including P grade
    const validPassedCourses = allPassedCourses.filter(course => 
      !ZERO_CREDIT_COURSES.includes(course.courseId) && 
      (course.description === 'متطلبات إجبارية عامة' ? course.grade === 'P' : isPassingGrade(course.grade))
    );

    // Debug passed courses
    console.log('All passed courses:', allPassedCourses);
    console.log('Valid passed courses:', validPassedCourses);

    const totalCredits = validPassedCourses.reduce((sum, course) => {
      const courseInfo = courseData.remainingCourses[course.description]?.find(c => 
        c.courseId === course.courseId
      ) || courseData.passedCourses.find(c => 
        c.courseId === course.courseId
      );

      // Include credit hours from متطلبات إجبارية عامة if passed with 'P'
      if (course.description === 'متطلبات إجبارية عامة' && course.grade === 'P') {
        return sum + (courseInfo?.creditHours || 0);
      }
      
      // Include other courses with passing grades
      if (course.description !== 'متطلبات إجبارية عامة' && isPassingGrade(course.grade)) {
        return sum + (courseInfo?.creditHours || 0);
      }

      return sum;
    }, 0);

    console.log('Credit calculation details:', {
      byCategory: validPassedCourses.reduce((acc, course) => {
        if (!acc[course.description]) acc[course.description] = 0;
        const credits = courseData.remainingCourses[course.description]?.find(c => 
          c.courseId === course.courseId
        )?.creditHours || 0;
        acc[course.description] += credits;
        return acc;
      }, {}),
      totalCredits
    });

    return {
      percentage: Math.round((validPassedCourses.length / 69) * 100),
      completed: validPassedCourses.length,
      total: 69,
      creditHours: totalCredits
    };
  };

  // Update credit progress calculation
  const calculateCreditProgress = () => {
    const totalRequired = Object.values(REQUIRED_CREDITS)
      .reduce((sum, credits) => sum + credits, 0);
    
    return {
      percentage: Math.round((courseData.studentCreditHours / totalRequired) * 100),
      completed: courseData.studentCreditHours,
      total: totalRequired
    };
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
      <div className="text-center text-red-600 p-4">
        {error}
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Course Progress Card */}
        <div className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 rounded-xl p-6">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Course Progress</h3>
              <div className="flex items-baseline mt-2">
                <p className="text-3xl font-bold text-[#0C5A3E]">
                  {calculateCourseProgress().completed}/{calculateCourseProgress().total}
                </p>
                <p className="ml-2 text-lg text-gray-500">Required Courses</p>
              </div>
            </div>
            <div className="w-24 h-24">
              <PieChart
                data={[
                  { value: calculateCourseProgress().percentage, color: '#0C5A3E' },
                  { value: 100 - calculateCourseProgress().percentage, color: '#f3f4f6' }
                ]}
                totalValue={100}
                lineWidth={15}
                rounded
                animate
                background="#f3f4f6"
                label={() => (
                  <text
                    x={50}
                    y={50}
                    dominantBaseline="middle"
                    textAnchor="middle"
                    style={{
                      fontSize: '18px',
                      fontWeight: 'bold',
                      fill: '#1f2937',
                    }}
                  >
                    {calculateCourseProgress().percentage}%
                  </text>
                )}
                labelPosition={0}
                center={[50, 50]}
                startAngle={-90}
              />
            </div>
          </div>
        </div>

        {/* Credit Hours Card */}
        <div className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 rounded-xl p-6">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Credit Hours</h3>
              <div className="flex items-baseline mt-2">
                <p className="text-3xl font-bold text-[#00263A]">
                  {courseData.studentCreditHours}/{Object.values(REQUIRED_CREDITS).reduce((a, b) => a + b, 0)}
                </p>
                <p className="ml-2 text-lg text-gray-500">Hours Completed</p>
              </div>
            </div>
            <div className="w-24 h-24">
              <PieChart
                data={[
                  { 
                    value: Math.round((courseData.studentCreditHours/Object.values(REQUIRED_CREDITS).reduce((a, b) => a + b, 0)) * 100), 
                    color: '#00263A' 
                  },
                  { 
                    value: 100 - Math.round((courseData.studentCreditHours/Object.values(REQUIRED_CREDITS).reduce((a, b) => a + b, 0)) * 100), 
                    color: '#f3f4f6' 
                  }
                ]}
                totalValue={100}
                lineWidth={15}
                rounded
                animate
                background="#f3f4f6"
                label={() => (
                  <text
                    x={50}
                    y={50}
                    dominantBaseline="middle"
                    textAnchor="middle"
                    style={{
                      fontSize: '18px',
                      fontWeight: 'bold',
                      fill: '#1f2937',
                    }}
                  >
                    {Math.round((courseData.studentCreditHours/Object.values(REQUIRED_CREDITS).reduce((a, b) => a + b, 0)) * 100)}%
                  </text>
                )}
                labelPosition={0}
                center={[50, 50]}
                startAngle={-90}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Interactive Course Lists */}
      <div className="bg-white rounded-xl shadow-sm">
        <Tab.Group>
          <Tab.List className="flex space-x-1 p-2 bg-gray-50 rounded-t-xl border-b">
            <Tab
              className={({ selected }) =>
                `px-4 py-2 text-sm font-medium rounded-lg transition-colors
                ${selected ? 'bg-[#0C5A3E] text-white' : 'text-gray-600 hover:bg-gray-100'}`
              }
            >
              Remaining Courses ({courseCounts.remaining})
            </Tab>
            <Tab
              className={({ selected }) =>
                `px-4 py-2 text-sm font-medium rounded-lg transition-colors
                ${selected ? 'bg-[#0C5A3E] text-white' : 'text-gray-600 hover:bg-gray-100'}`
              }
            >
              Available to Take ({courseCounts.available})
            </Tab>
            <Tab
              className={({ selected }) =>
                `px-4 py-2 text-sm font-medium rounded-lg transition-colors
                ${selected ? 'bg-[#0C5A3E] text-white' : 'text-gray-600 hover:bg-gray-100'}`
              }
            >
              Courses to Retake ({courseCounts.retake})
            </Tab>
          </Tab.List>
          <Tab.Panels className="p-4">
            <Tab.Panel>
              <CourseList 
                courses={courseData.remainingCourses} 
                icon={BookOpenIcon}
                type="remaining"
                passedCourses={courseData.passedCourses}
                allCourses={allCourses}
              />
            </Tab.Panel>
            <Tab.Panel>
              <CourseList 
                courses={courseData.availableCourses} 
                icon={ClockIcon}
                type="available"
                passedCourses={courseData.passedCourses}
                allCourses={allCourses}
                studentCreditHours={courseData.studentCreditHours}
              />
            </Tab.Panel>
            <Tab.Panel>
              <CourseList 
                courses={courseData.retakeCourses} 
                icon={ExclamationTriangleIcon}
                type="retake"
                passedCourses={courseData.passedCourses}
                allCourses={allCourses}
              />
            </Tab.Panel>
          </Tab.Panels>
        </Tab.Group>
      </div>
    </div>
  );
};

export default Progress;