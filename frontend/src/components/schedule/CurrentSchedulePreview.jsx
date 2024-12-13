// src/components/schedule/CurrentSchedulePreview.jsx
import { useCurrentSchedule } from '../../hooks/useCurrentSchedule';
import { Link } from 'react-router-dom';

export function CurrentSchedulePreview() {
  const { schedule, loading } = useCurrentSchedule();

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!schedule?.courses?.length) {
    return (
      <div className="border border-gray-200 rounded-lg p-4 text-center text-gray-500">
        No active schedule found. Generate a new schedule to get started.
      </div>
    );
  }

  // Show first 3 courses
  const previewCourses = schedule.courses.slice(0, 3);

  return (
    <div className="space-y-4">
      <div className="overflow-hidden border border-gray-200 rounded-lg divide-y">
        {previewCourses.map((course) => (
          <div key={course.courseId} className="p-4">
            <div className="font-medium text-gray-900">{course.courseName}</div>
            <div className="mt-1 grid grid-cols-3 gap-4 text-sm text-gray-500">
              <div>{course.courseId}</div>
              <div>{course.days}</div>
              <div>{course.time}</div>
            </div>
          </div>
        ))}
      </div>
      
      {schedule.courses.length > 3 && (
        <p className="text-sm text-center text-gray-500">
          And {schedule.courses.length - 3} more courses...
        </p>
      )}
    </div>
  );
}