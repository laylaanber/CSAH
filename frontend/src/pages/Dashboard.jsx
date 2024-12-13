// src/pages/Dashboard.jsx
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { CurrentSchedulePreview } from '../components/schedule/CurrentSchedulePreview';
import {
  AcademicCapIcon,
  BookOpenIcon,
  ClockIcon,
  ChartBarIcon,
  PencilIcon,
} from '@heroicons/react/24/outline';

function Dashboard() {
  const { user, loading, error } = useAuth();

  const quickActions = [
    {
      name: 'Generate Schedule',
      description: 'Create a new balanced course schedule',
      href: '/schedule',
      icon: ClockIcon,
      color: 'bg-blue-500'
    },
    {
      name: 'Update Preferences',
      description: 'Modify your course selection preferences',
      href: '/preferences',
      icon: AcademicCapIcon,
      color: 'bg-green-500'
    },
    {
      name: 'Browse Courses',
      description: 'Explore available courses and their details',
      href: '/courses',
      icon: BookOpenIcon,
      color: 'bg-purple-500'
    },
    {
      name: 'View Progress',
      description: 'Check your academic progress and remaining requirements',
      href: '/profile',
      icon: ChartBarIcon,
      color: 'bg-orange-500'
    },
    {
      name: 'Manage Passed Courses',
      description: 'View or update your completed courses',
      href: '/edit-passed-courses',
      icon: PencilIcon,
      color: 'bg-yellow-500'
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center text-red-600">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Student Overview Section */}
      <div className="bg-white rounded-lg shadow px-6 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
            {`Welcome back, ${user?.username || 'Student'}`}
            </h1>
            <p className="mt-1 text-gray-500">Here's an overview of your academic status</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Student ID</p>
            <p className="text-lg font-semibold">{user?.studentId}</p>
          </div>
        </div>

        {/* Academic Stats */}
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div className="bg-blue-50 rounded-lg p-5">
            <h3 className="text-sm font-medium text-blue-600">Academic Year</h3>
            <p className="mt-1 text-2xl font-semibold text-blue-900">{user?.academicYear}</p>
          </div>
          <div className="bg-green-50 rounded-lg p-5">
            <h3 className="text-sm font-medium text-green-600">Total Credits</h3>
            <p className="mt-1 text-2xl font-semibold text-green-900">{user?.creditHours || 0}</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-5">
            <h3 className="text-sm font-medium text-purple-600">Current GPA</h3>
            <p className="mt-1 text-2xl font-semibold text-purple-900">{user?.gpa?.toFixed(2) || '0.00'}</p>
          </div>
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {quickActions.map((action) => (
          <Link
            key={action.name}
            to={action.href}
            className="relative group bg-white rounded-lg shadow p-6 hover:shadow-md transition-all duration-200"
          >
            <div className="flex items-center space-x-4">
              <div className={`${action.color} p-3 rounded-lg`}>
                <action.icon className="h-6 w-6 text-white" aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900 group-hover:text-blue-600">
                  {action.name}
                </h3>
                <p className="mt-1 text-sm text-gray-500">{action.description}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Current Schedule Preview */}
      <div className="bg-white rounded-lg shadow px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-medium text-gray-900">Current Schedule</h2>
          <Link 
            to="/schedule" 
            className="text-sm font-medium text-blue-600 hover:text-blue-500"
          >
            View full schedule →
          </Link>
        </div>
        <CurrentSchedulePreview />
      </div>
    </div>
  );
}

export default Dashboard;