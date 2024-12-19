// src/pages/Preferences.jsx
import { useState, useEffect } from 'react';
import { usePreferences } from '../hooks/usePreferences';
import { toast } from 'react-hot-toast';
import Select from 'react-select';

function Preferences() {
  const {
    preferences,
    setPreferences,
    loading: preferencesLoading,
    error: preferencesError,
    savePreferences,
    saveStatus
  } = usePreferences();

  // Add missing options constants
  const daysOptions = [
    { value: 'sun_tue_thu', label: 'Sun-Tue-Thu' },
    { value: 'mon_wed', label: 'Mon-Wed' },
    { value: 'daily', label: 'Daily' },
    { value: 'idc', label: "Don't Care" }
  ];

  const ratingOptions = [
    { value: 'prefer', label: 'Prefer' },
    { value: 'neutral', label: 'Neutral' },
    { value: 'dislike', label: 'Dislike' }
  ];

  const [formState, setFormState] = useState('viewing');
  const [improvableCourses, setImprovableCourses] = useState([]);
  const [remainingCourses, setRemainingCourses] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [selectedCourses, setSelectedCourses] = useState({
    improvable: [],
    specific: []
  });

  // Add dependency tracking
  const [dataFetched, setDataFetched] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormState('saving');

    try {
      const formattedPreferences = {
        ...preferences,
        coursesToImprove: selectedCourses.improvable.map(course => course.value),
        specificCourses: selectedCourses.specific.map(course => course.value)
      };

      const success = await savePreferences(formattedPreferences);
      if (success) {
        toast.success('Preferences saved successfully');
        setFormState('viewing');
      } else {
        throw new Error('Failed to save preferences');
      }
    } catch (error) {
      console.error('Save error:', error);
      toast.error(error.message || 'Failed to save preferences');
      setFormState('editing');
    }
  };

  useEffect(() => {
    if (!dataFetched) {
      const fetchData = async () => {
        try {
          const token = localStorage.getItem('token');
          const response = await fetch('http://localhost:5000/api/courses/progress', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await response.json();

          if (data.success) {
            const studentCreditHours = data.data.studentCreditHours;

            // Format retake courses
            let retakeCourses = [];
            Object.values(data.data.retakeCourses || {}).forEach(courses => {
              if (Array.isArray(courses)) {
                retakeCourses = retakeCourses.concat(courses);
              }
            });

            const improvableOptions = retakeCourses.map(course => ({
              value: course.courseId,
              label: `${course.courseId} - ${course.courseName} (Current: ${course.currentGrade || 'N/A'})`
            }));
            setImprovableCourses(improvableOptions);

            // Format available courses
            let availableCoursesArray = [];
            Object.values(data.data.availableCourses || {}).forEach(courses => {
              if (Array.isArray(courses)) {
                availableCoursesArray = availableCoursesArray.concat(courses);
              }
            });

            const availableOptions = availableCoursesArray.map(course => {
              const isEconomicsCourse = course.courseId === '0901420';
              const isProjectOrTraining = course.courseId === '0977598' || course.courseId === '0907500';

              let isDisabled = false;
              let creditMsg = '';

              if (isEconomicsCourse && studentCreditHours < 90) {
                isDisabled = true;
                creditMsg = ` (Requires 90 credit hours - you have ${studentCreditHours})`;
              } else if (isProjectOrTraining && studentCreditHours < 120) {
                isDisabled = true;
                creditMsg = ` (Requires 120 credit hours - you have ${studentCreditHours})`;
              }

              return {
                value: course.courseId,
                label: `${course.courseId} - ${course.courseName}${creditMsg}`,
                isDisabled
              };
            });
            setRemainingCourses(availableOptions);

            // Map saved preferences back to full course options
            if (preferences) {
              // Format improvable courses preferences
              const savedImprovable = (preferences.coursesToImprove || [])
                .map(courseId =>
                  improvableOptions.find(opt => opt.value === courseId)
                )
                .filter(Boolean);

              // Format specific courses preferences
              const savedSpecific = (preferences.specificCourses || [])
                .map(courseId =>
                  availableOptions.find(opt => opt.value === courseId)
                )
                .filter(Boolean);

              setSelectedCourses({
                improvable: savedImprovable,
                specific: savedSpecific
              });
            }

            setDataFetched(true);
          }
        } catch (error) {
          console.error('Error:', error);
          toast.error('Failed to load course options');
        }
        setInitialLoading(false);
      };

      fetchData();
    }
  }, [dataFetched, preferences]);

  if (preferencesLoading || initialLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const isFormEditable = formState !== 'viewing';

  // Update the CourseSelect component
  const CourseSelect = ({
    options,
    value,
    onChange,
    isDisabled,
    placeholder
  }) => (
    <Select
      isMulti
      options={options}
      value={value}
      onChange={onChange}
      isDisabled={isDisabled || formState === 'viewing'}
      className="mt-1"
      classNamePrefix="select"
      placeholder={placeholder}
      isOptionDisabled={(option) => {
        // Log the option and its disabled state for debugging
        console.log('Option disabled state:', option.value, option.isDisabled);
        return option.isDisabled;
      }}
      styles={{
        option: (baseStyles, { isDisabled }) => ({
          ...baseStyles,
          backgroundColor: isDisabled ? '#f3f4f6' : baseStyles.backgroundColor,
          color: isDisabled ? '#9ca3af' : baseStyles.color,
          cursor: isDisabled ? 'not-allowed' : 'pointer',
          pointerEvents: isDisabled ? 'none' : 'auto'
        }),
        control: (baseStyles) => ({
          ...baseStyles,
          cursor: formState === 'viewing' ? 'not-allowed' : 'pointer'
        })
      }}
      components={{
        Option: ({ children, ...props }) => {
          const isDisabled = props.isDisabled;
          return (
            <div
              {...props.innerProps}
              className={`px-3 py-2 ${
                isDisabled
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'cursor-pointer hover:bg-blue-50'
              }`}
            >
              {children}
              {isDisabled && (
                <span className="text-xs text-red-500 block">
                  {props.data.label.split('(Requires')[1]?.replace(')', '')}
                </span>
              )}
            </div>
          );
        }
      }}
    />
  );

  // Add ActionButtons component
  const ActionButtons = ({ formState, setFormState, onSubmit, saveStatus }) => {
    if (formState === 'viewing') {
      return (
        <button
          onClick={() => setFormState('editing')}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Edit Preferences
        </button>
      );
    }

    return (
      <div className="flex space-x-4">
        <button
          type="button"
          onClick={() => setFormState('viewing')}
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          disabled={saveStatus.saving}
        >
          Cancel
        </button>
        <button
          onClick={onSubmit}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          disabled={saveStatus.saving}
        >
          {saveStatus.saving ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>
    );
  };

  // Update main return statement
  return (
    <div className="min-h-screen relative">
      {/* Sticky Header */}
      <div className="sticky top-0 z-50 bg-white shadow-md border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Course Preferences</h1>
            <ActionButtons 
              formState={formState}
              setFormState={setFormState}
              onSubmit={handleSubmit}
              saveStatus={saveStatus}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Schedule Preferences Section */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium mb-4">Schedule Preferences</h2>

            <div className="space-y-4">
              {/* Days Preference */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Preferred Days
                </label>
                <select
                  value={preferences?.preferredDays || 'idc'}
                  onChange={(e) => setPreferences({
                    ...preferences,
                    preferredDays: e.target.value
                  })}
                  disabled={!isFormEditable}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100"
                >
                  {daysOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Break Preference */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Break Preference
                </label>
                <select
                  value={preferences.preferBreaks}
                  onChange={(e) => setPreferences({
                    ...preferences,
                    preferBreaks: e.target.value
                  })}
                  disabled={!isFormEditable}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100"
                >
                  <option value="yes">Yes, I want breaks</option>
                  <option value="no">No breaks needed</option>
                  <option value="idc">Don't Care</option>
                </select>
              </div>

              {/* Credit Hours */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Target Credit Hours
                </label>
                <div className="flex items-center">
                  <input
                    type="range"
                    min="12"
                    max="18"
                    value={preferences.targetCreditHours}
                    onChange={(e) => setPreferences({
                      ...preferences,
                      targetCreditHours: parseInt(e.target.value)
                    })}
                    disabled={!isFormEditable}
                    className="flex-1 mr-4"
                  />
                  <span className="w-12 text-center">
                    {preferences.targetCreditHours}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Category Preferences Section */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium mb-4">Category Preferences</h2>

            <div className="grid grid-cols-1 gap-4">
              {Object.entries(preferences.categoryPreferences).map(([category, rating]) => (
                <div key={category} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 capitalize">
                    {category}
                  </span>
                  <select
                    value={rating}
                    onChange={(e) => setPreferences({
                      ...preferences,
                      categoryPreferences: {
                        ...preferences.categoryPreferences,
                        [category]: e.target.value
                      }
                    })}
                    disabled={!isFormEditable}
                    className="ml-3 block w-32 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100"
                  >
                    {ratingOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Course Improvement Preferences Section */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium mb-4">Course Improvement Preferences</h2>

            <div className="space-y-4">
              {/* Courses to Improve */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Courses to Improve
                </label>
                <CourseSelect
                  options={improvableCourses}
                  value={selectedCourses.improvable}
                  onChange={(value) => {
                    setSelectedCourses(prev => ({ ...prev, improvable: value }));
                  }}
                  placeholder="Select courses to improve..."
                />
                <p className="mt-1 text-sm text-gray-500">
                  Select courses where you'd like to improve your grade (C- or lower)
                </p>
              </div>

              {/* Specific Courses */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Specific Course Preferences
                </label>
                <CourseSelect
                  options={remainingCourses}
                  value={selectedCourses.specific}
                  onChange={(value) => {
                    setSelectedCourses(prev => ({ ...prev, specific: value }));
                  }}
                  placeholder="Select specific courses..."
                />
                <p className="mt-1 text-sm text-gray-500">
                  Select specific courses you'd like to take this semester (only shows courses you're eligible to take)
                </p>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Preferences;