// src/pages/CourseSelection.jsx
import { useState, useEffect } from 'react';
import { 
  ChevronDownIcon, 
  AcademicCapIcon, 
  ClipboardDocumentListIcon,
  DocumentCheckIcon,
  BookOpenIcon,
  ClockIcon,
  TagIcon
} from '@heroicons/react/24/outline';
import { CATEGORY_ORDER } from '../utils/constants';

const CourseSelection = () => {
  const [courses, setCourses] = useState([]);
  const [sectionsData, setSectionsData] = useState({});
  const [courseNames, setCourseNames] = useState({});
  const [openCategories, setOpenCategories] = useState({});
  const [openSections, setOpenSections] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [coursesRes, sectionsRes] = await Promise.all([
          fetch('http://localhost:5000/api/courses'),
          fetch('http://localhost:5000/api/schedules/sections')
        ]);

        const [coursesData, sectionsData] = await Promise.all([
          coursesRes.json(),
          sectionsRes.json()
        ]);

        if (coursesData.success) {
          setCourses(coursesData.data.courses);
          // Create courseId to courseName mapping
          const nameMap = coursesData.data.courses.reduce((acc, course) => {
            acc[course.courseId] = course.courseName;
            return acc;
          }, {});
          setCourseNames(nameMap);
        }

        const sectionsMap = sectionsData.data.sections.reduce((acc, item) => {
          acc[item.courseId] = item.sections;
          return acc;
        }, {});
        setSectionsData(sectionsMap);

      } catch (error) {
        setError(error.message);
      }
      setLoading(false);
    };

    fetchData();
  }, []);

  const groupedCourses = CATEGORY_ORDER.reduce((acc, category) => {
    const categoryCourses = courses.filter(course => course.description === category);
    if (categoryCourses.length > 0) {
      acc[category] = categoryCourses;
    }
    return acc;
  }, {});

  const toggleCategory = (category) => {
    setOpenCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const toggleSections = (courseId) => {
    setOpenSections(prev => ({
      ...prev,
      [courseId]: !prev[courseId]
    }));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Course Catalog</h1>
        <p className="mt-2 text-gray-600">Browse and explore available courses</p>
      </div>

      <div className="space-y-6">
        {Object.entries(groupedCourses).map(([category, categoryCourses]) => (
          <div key={category} className="bg-white shadow-sm rounded-lg overflow-hidden">
            <button
              onClick={() => toggleCategory(category)}
              className="w-full px-6 py-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <h2 className="text-xl font-semibold text-gray-900">{category}</h2>
              <ChevronDownIcon className={`h-5 w-5 transform transition-transform duration-200 ${openCategories[category] ? 'rotate-180' : ''}`} />
            </button>

            {openCategories[category] && (
              <div className="p-6 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                {categoryCourses.map((course) => {
                  const sections = sectionsData[course.courseId];
                  
                  return (
                    <div key={course.courseId} 
                         className="flex flex-col h-full bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200">
                      <div className="p-5 flex flex-col flex-grow">
                        {/* Header Section */}
                        <div className="mb-4">
                          <div className="flex items-start justify-between">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {course.courseId} - {course.courseName}
                            </h3>
                            <span className="flex items-center text-sm text-gray-500">
                              <AcademicCapIcon className="h-4 w-4 mr-1" />
                              {course.creditHours}cr
                            </span>
                          </div>
                          {course.subCategory && (
                            <p className="mt-1 text-sm text-blue-600 flex items-center">
                              <TagIcon className="h-4 w-4 mr-1" />
                              {course.subCategory}
                            </p>
                          )}
                        </div>

                        {/* Course Details Grid */}
                        {course.details && (
                          <div className="bg-gray-50 rounded-md p-4 mb-4">
                            <div className="grid grid-cols-2 gap-3">
                              {course.details.numQuizzes > 0 && (
                                <div className="flex items-center text-sm">
                                  <ClipboardDocumentListIcon className="h-4 w-4 mr-2 text-gray-400" />
                                  <span>{course.details.numQuizzes} Quizzes</span>
                                </div>
                              )}
                              {course.details.numProjects > 0 && (
                                <div className="flex items-center text-sm">
                                  <DocumentCheckIcon className="h-4 w-4 mr-2 text-gray-400" />
                                  <span>{course.details.numProjects} Projects</span>
                                </div>
                              )}
                              {course.details.numAssignments > 0 && (
                                <div className="flex items-center text-sm">
                                  <BookOpenIcon className="h-4 w-4 mr-2 text-gray-400" />
                                  <span>{course.details.numAssignments} Assignments</span>
                                </div>
                              )}
                              {course.details.examType && (
                                <div className="flex items-center text-sm col-span-2">
                                  <ClockIcon className="h-4 w-4 mr-2 text-gray-400" />
                                  <span>Exam: {course.details.examType}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Prerequisites */}
                        {course.prerequisites?.length > 0 && (
                          <div className="text-sm text-gray-600 mb-4">
                            <span className="font-medium">Prerequisites:</span>{' '}
                            {course.prerequisites.map(prereqId => courseNames[prereqId] || prereqId).join(', ')}
                          </div>
                        )}

                        {/* Sections - Auto-expand if few sections */}
                        <div className="mt-auto pt-4 border-t border-gray-100">
                          {sections && sections.length > 0 ? (
                            <div>
                              <button
                                onClick={() => toggleSections(course.courseId)}
                                className="flex items-center text-blue-600 hover:text-blue-800"
                              >
                                <ChevronDownIcon className={`h-4 w-4 mr-1 transition-transform duration-200 ${openSections[course.courseId] ? 'rotate-180' : ''}`} />
                                {sections.length} {sections.length === 1 ? 'Section' : 'Sections'} Available
                              </button>
                              {openSections[course.courseId] && (
                                <div className="mt-2 space-y-1">
                                  {sections.map((section, idx) => (
                                    <div key={idx} className="text-sm ml-5 text-gray-600">
                                      Section {section.section} • {section.days} • {section.time}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : (
                            <p className="text-sm text-red-600">Not available this semester</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CourseSelection;