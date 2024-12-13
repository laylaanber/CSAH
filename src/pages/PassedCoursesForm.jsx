// frontend/src/pages/PassedCoursesForm.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { canAddCourse, getAvailableGrades } from '../utils/gradeValidation';

const PassedCoursesForm = () => {
  const [courses, setCourses] = useState([]);
  const [passedCourses, setPassedCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/courses');
        const data = await response.json();
        setCourses(data.data.courses);
        setLoading(false);
      } catch (error) {
        setError('Failed to fetch courses');
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleGradeChange = (courseId, newGrade) => {
    setPassedCourses(prev => {
      const courseExists = prev.find(pc => pc.courseId === courseId);
      const course = courses.find(c => c.courseId === courseId);

      if (!canAddCourse(course.description, prev, courses) && !courseExists) {
        return prev;
      }

      if (courseExists) {
        return prev.map(pc => 
          pc.courseId === courseId ? { ...pc, grade: newGrade } : pc
        );
      }

      return [...prev, {
        courseId,
        grade: newGrade,
        semester: `${new Date().getFullYear()}-${Math.floor(new Date().getMonth() / 6) + 1}`
      }];
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:5000/api/auth/passed-courses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ passedCourses })
      });

      if (!response.ok) throw new Error('Failed to save courses');
      navigate('/dashboard');
    } catch (error) {
      setError(error.message);
    }
  };

  const groupCoursesByCategory = (courses) => {
    return courses.reduce((acc, course) => {
      if (!acc[course.description]) {
        acc[course.description] = [];
      }
      acc[course.description].push(course);
      return acc;
    }, {});
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Enter Your Passed Courses</h2>
      
      <div className="flex justify-end mb-6 space-x-4">
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
        >
          Skip for now
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {Object.entries(groupCoursesByCategory(courses)).map(([category, categoryCourses]) => (
          <div key={category} className="border rounded-lg p-4">
            <h3 className="text-lg font-medium mb-4">{category}</h3>
            <div className="space-y-3">
              {categoryCourses.map(course => {
                const existingGrade = passedCourses.find(pc => pc.courseId === course.courseId)?.grade;
                return (
                  <div key={course.courseId} className="flex items-center justify-between">
                    <div>
                      <span className="font-medium">{course.courseId}</span>
                      <span className="ml-2 text-gray-600">{course.courseName}</span>
                    </div>
                    <select
                      value={existingGrade || ''}
                      onChange={(e) => handleGradeChange(course.courseId, e.target.value)}
                      className={`ml-4 rounded-md ${!canAddCourse(course.description, passedCourses, courses) && !existingGrade ? 'opacity-50 cursor-not-allowed' : ''}`}
                      disabled={!canAddCourse(course.description, passedCourses, courses) && !existingGrade}
                    >
                      <option value="">Select Grade</option>
                      {getAvailableGrades(course.description).map(grade => (
                        <option key={grade} value={grade}>{grade}</option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        
        <div className="flex justify-end space-x-4">
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            Save Courses
          </button>
        </div>
      </form>
    </div>
  );
};

export default PassedCoursesForm;