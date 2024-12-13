// frontend/src/pages/Progress.jsx
import { useState, useEffect } from 'react';
import { Tab } from '@headlessui/react';
import { BookOpenIcon, ClockIcon, ExclamationTriangleIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { CATEGORY_ORDER } from '../utils/constants';

const Progress = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [courseData, setCourseData] = useState({
    remainingCourses: [],
    availableCourses: [],
    retakeCourses: []
  });

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
      } else {
        throw new Error(data.message);
      }
      setLoading(false);
    } catch (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourseData();
  }, []);

  const groupByCategory = (courses) => {
    return CATEGORY_ORDER.reduce((ordered, category) => {
      const categoryCourses = courses.filter(course => course.description === category);
      if (categoryCourses.length > 0) {
        ordered[category] = categoryCourses;
      }
      return ordered;
    }, {});
  };

  const CourseList = ({ courses, icon: Icon, type }) => {
    const [openCategories, setOpenCategories] = useState({});

    const toggleCategory = (category) => {
      setOpenCategories(prev => ({
        ...prev,
        [category]: !prev[category]
      }));
    };

    return (
      <div className="space-y-4">
        {Object.entries(courses).map(([category, categoryCourses]) => (
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
                {categoryCourses.map((course) => (
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
      <h2 className="text-2xl font-bold text-gray-900 mb-8">Academic Progress</h2>

      <Tab.Group>
        <Tab.List className="flex space-x-1 rounded-xl bg-blue-900/20 p-1 mb-8">
          <Tab className={({ selected }) =>
            `w-full py-2.5 text-sm font-medium leading-5 rounded-lg
             ${selected 
               ? 'bg-white text-blue-700 shadow'
               : 'text-gray-600 hover:bg-white/[0.12] hover:text-gray-800'}`
          }>
            Remaining Courses
          </Tab>
          <Tab className={({ selected }) =>
            `w-full py-2.5 text-sm font-medium leading-5 rounded-lg
             ${selected
               ? 'bg-white text-blue-700 shadow'
               : 'text-gray-600 hover:bg-white/[0.12] hover:text-gray-800'}`
          }>
            Available to Take
          </Tab>
          <Tab className={({ selected }) =>
            `w-full py-2.5 text-sm font-medium leading-5 rounded-lg
             ${selected
               ? 'bg-white text-blue-700 shadow'
               : 'text-gray-600 hover:bg-white/[0.12] hover:text-gray-800'}`
          }>
            Courses to Retake
          </Tab>
        </Tab.List>
        <Tab.Panels>
          <Tab.Panel>
            <CourseList 
              courses={courseData.remainingCourses} 
              icon={BookOpenIcon}
              type="remaining"
            />
          </Tab.Panel>
          <Tab.Panel>
            <CourseList 
              courses={courseData.availableCourses} 
              icon={ClockIcon}
              type="available" 
            />
          </Tab.Panel>
          <Tab.Panel>
            <CourseList 
              courses={courseData.retakeCourses} 
              icon={ExclamationTriangleIcon}
              type="retake"
            />
          </Tab.Panel>
        </Tab.Panels>
      </Tab.Group>
    </div>
  );
};

export default Progress;