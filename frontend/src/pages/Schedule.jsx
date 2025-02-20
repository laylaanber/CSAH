// src/pages/Schedule.jsx
import { useState } from 'react';
import { useSchedule } from '../hooks/useSchedule';
import { ScheduleDetailModal } from '../components/schedule/ScheduleDetailModal';
import { ScheduleFeedback } from '../components/schedule/ScheduleFeedback';

function Schedule() {
  const { 
    schedule, 
    loading, 
    error, 
    generateNewSchedule, 
    acceptSchedule, 
    rejectSchedule, 
    regenerateWithFeedback 
  } = useSchedule();

  const [selectedCourse, setSelectedCourse] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [feedbackError, setFeedbackError] = useState(null);

  const handleGenerateSchedule = async () => {
    try {
      setIsGenerating(true);
      setFeedbackError(null);
      await generateNewSchedule();
    } catch (err) {
      setFeedbackError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFeedbackSubmit = async (feedback) => {
    try {
      setIsGenerating(true);
      setFeedbackError(null);
      await regenerateWithFeedback(feedback);
    } catch (err) {
      setFeedbackError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  // Fix progress calculation
  const calculateProgressWidth = (passed, total) => {
    if (!total) return 0;
    return Math.round((passed / total) * 100);
  };

  if (loading || isGenerating) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto" />
        <p className="mt-4">{isGenerating ? 'Generating new schedule...' : 'Loading schedule...'}</p>
      </div>
    );
  }

  // Show both main error and feedback error
  if (error || feedbackError) {
    return (
      <div className="p-6 text-center">
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-md p-4">
          {error || feedbackError}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Your Schedule</h1>
        <div className="space-x-4">
          <button
            onClick={handleGenerateSchedule}
            disabled={isGenerating}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 
                     disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? 'Generating...' : 'Generate New Schedule'}
          </button>
          {schedule?.status === 'generated' && (
            <>
              <button
                onClick={acceptSchedule}
                className="px-4 py-2 border border-green-500 text-green-500 
                         rounded-md hover:bg-green-50"
              >
                Accept Schedule
              </button>
              <button
                onClick={rejectSchedule}
                className="px-4 py-2 border border-red-500 text-red-500 
                         rounded-md hover:bg-red-50"
              >
                Reject Schedule
              </button>
            </>
          )}
        </div>
      </div>

      {/* Schedule Content */}
      {schedule?.courses?.length > 0 ? (
        <div className="space-y-6">
          {/* Course Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="grid grid-cols-6 gap-4 p-4 bg-gray-50 font-medium">
              <div>Course ID</div>
              <div className="col-span-2">Course Name</div>
              <div>Days</div>
              <div>Time</div>
              <div>Credits</div>
            </div>
            {schedule.courses.map((course) => (
              <div
                key={course.courseId}
                onClick={() => handleCourseClick(course)}
                className="grid grid-cols-6 gap-4 p-4 border-t border-gray-200 
                         hover:bg-gray-50 cursor-pointer"
              >
                <div>{course.courseId}</div>
                <div className="col-span-2">{course.courseName}</div>
                <div>{course.days}</div>
                <div>{course.time}</div>
                <div>{course.creditHours}</div>
              </div>
            ))}
          </div>

          {/* Metrics */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Schedule Metrics</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Existing metrics */}
              <div>
                <p className="text-sm text-gray-500">Total Credit Hours</p>
                <p className="mt-1 text-2xl font-semibold">
                  {schedule.metrics?.totalCreditHours || 0}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Difficulty Score</p>
                <div>
                  <p className="mt-1 text-2xl font-semibold">
                    {schedule.metrics?.difficultyScore?.score}%
                  </p>
                  <p className="text-sm text-blue-600">
                    {schedule.metrics?.difficultyScore?.level}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500">Balance Score</p>
                <p className="mt-1 text-2xl font-semibold">
                  {schedule.metrics?.balanceScore?.toFixed(1)}%
                </p>
              </div>

              {/* Category Distribution section */}
              <div>
                <p className="text-sm text-gray-500">Category Distribution</p>
                <div className="mt-2 space-y-1">
                  {schedule.metrics?.categoryDistribution &&
                    Object.entries(schedule.metrics.categoryDistribution).map(([category, value]) => (
                      <div key={category} className="flex justify-between text-sm">
                        <span className="capitalize">{category}:</span>
                        <span>{value.toFixed(2)}%</span>
                      </div>
                    ))
                  }
                </div>
              </div>

              {/* Fixed Progress Bar */}
              {schedule?.metrics?.subcategoryProgress && (
                <div className="col-span-4 mt-4">
                  <h3 className="text-md font-medium mb-2">Subcategory Progress</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(schedule.metrics.subcategoryProgress).map(([category, { passed, total }]) => (
                      <div key={category} className="p-4 border rounded">
                        <h4 className="capitalize">{category}</h4>
                        <div className="relative pt-1">
                          <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-gray-200">
                            <div
                              style={{ width: `${calculateProgressWidth(passed, total)}%` }}
                              className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500"
                            />
                          </div>
                          <p className="text-sm text-gray-600">{passed}/{total} courses completed</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Feedback Section */}
          <div className="bg-white rounded-lg shadow">
            <ScheduleFeedback onSubmit={handleFeedbackSubmit} />
          </div>
        </div>
      ) : (
        <div className="text-center text-gray-600 mt-8">
          No schedule found. Click "Generate New Schedule" to create one.
        </div>
      )}

      {/* Course Detail Modal */}
      <ScheduleDetailModal
        course={selectedCourse}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}

export default Schedule;