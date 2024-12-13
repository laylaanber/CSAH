// src/pages/Schedule.jsx
import { useState } from 'react';
import { useSchedule } from '../hooks/useSchedule';
import { ScheduleDetailModal } from '../components/schedule/ScheduleDetailModal';

function Schedule() {
  const { schedule, loading, error, generateNewSchedule, acceptSchedule, rejectSchedule } = useSchedule();
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateSchedule = async () => {
    try {
      setIsGenerating(true);
      await generateNewSchedule();
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCourseClick = (course) => {
    setSelectedCourse(course);
    setIsModalOpen(true);
  };

  if (loading || isGenerating) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto" />
        <p className="mt-4">{isGenerating ? 'Generating new schedule...' : 'Loading schedule...'}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-md p-4">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Your Schedule</h1>
        <div className="space-x-4">
          <button 
            onClick={handleGenerateSchedule} 
            disabled={isGenerating}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 
                     disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Generate New Schedule
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
      
      {schedule?.schedule?.length > 0 ? (
        <div>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="grid grid-cols-6 gap-4 p-4 bg-gray-50 font-medium">
              <div>Course ID</div>
              <div className="col-span-2">Course Name</div>
              <div>Days</div>
              <div>Time</div>
              <div>Credits</div>
            </div>
            {schedule.schedule.map((course) => (
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

          <div className="mt-6 bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Schedule Metrics</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-gray-500">Total Credit Hours</p>
                <p className="mt-1 text-2xl font-semibold">
                  {schedule.metrics?.totalCreditHours || 0}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Difficulty Score</p>
                <p className="mt-1 text-2xl font-semibold">
                  {schedule.metrics?.difficultyScore?.toFixed(1) || 0}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Balance Score</p>
                <p className="mt-1 text-2xl font-semibold">
                  {schedule.metrics?.balanceScore?.toFixed(1) || 0}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center text-gray-600 mt-8">
          No schedule found. Click "Generate New Schedule" to create one.
        </div>
      )}

      <ScheduleDetailModal 
        course={selectedCourse}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}

export default Schedule;