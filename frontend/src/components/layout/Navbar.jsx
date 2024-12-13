// src/components/layout/Navbar.jsx
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bars3Icon } from '@heroicons/react/24/outline';
import { 
  UserCircleIcon, 
  KeyIcon, 
  AcademicCapIcon, 
  ChartBarIcon, 
  ExclamationCircleIcon, 
  ArrowRightOnRectangleIcon // Correct icon for logout
} from '@heroicons/react/24/outline';

const validatePassword = (password) => {
  const minLength = 8;
  const hasLetterAndNumber = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
  
  if (!password) return null;
  if (password.length < minLength) {
    return 'Password must be at least 8 characters';
  }
  if (!hasLetterAndNumber.test(password)) {
    return 'Password must contain both letters and numbers';
  }
  return null;
};

const Navbar = ({ onMenuClick }) => {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState({
    username: '',
    password: '',
    gpa: '',
    academicYear: ''
  });
  const [errors, setErrors] = useState({
    general: '',
    fields: {}
  });
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Load initial profile data
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    setProfileData({
      username: userData.username || '',
      password: '',
      gpa: userData.gpa || '',
      academicYear: userData.academicYear || ''
    });

    // Click outside handler
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    
    // Reset errors
    setErrors({ general: '', fields: {} });

    // Validate password if provided
    if (profileData.password) {
      const passwordError = validatePassword(profileData.password);
      if (passwordError) {
        setErrors({
          general: '',
          fields: { password: passwordError }
        });
        return;
      }
    }

    try {
      const changedFields = {};
      const originalData = JSON.parse(localStorage.getItem('user') || '{}');
      
      // Only include changed fields
      if (profileData.password) {
        changedFields.password = profileData.password;
      }
      if (profileData.username && profileData.username !== originalData.username) {
        changedFields.username = profileData.username;
      }
      if (profileData.gpa && profileData.gpa !== originalData.gpa) {
        const gpa = parseFloat(profileData.gpa);
        if (gpa >= 0 && gpa <= 4) {
          changedFields.gpa = gpa;
        }
      }
      if (profileData.academicYear && profileData.academicYear !== originalData.academicYear) {
        const year = parseInt(profileData.academicYear);
        if (year >= 1 && year <= 6) {
          changedFields.academicYear = year;
        }
      }

      // Only proceed if there are valid changes
      if (Object.keys(changedFields).length === 0) {
        setErrors({
          general: 'No valid changes to save',
          fields: {}
        });
        return;
      }

      console.log('Sending update with:', changedFields);

      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(changedFields)
      });

      const data = await response.json();
      console.log('Server response:', data);

      if (data.success) {
        localStorage.setItem('user', JSON.stringify(data.data));
        setIsEditing(false);
        setShowProfileMenu(false);
        window.location.reload();
      } else {
        if (data.errors) {
          const fieldErrors = {};
          data.errors.forEach(error => {
            fieldErrors[error.param] = error.msg;
          });
          setErrors({
            general: '',
            fields: fieldErrors
          });
        } else {
          setErrors({
            general: data.message || 'Failed to update profile',
            fields: {}
          });
        }
      }
    } catch (err) {
      console.error('Profile update error:', err);
      setErrors({
        general: 'Failed to update profile. Please try again.',
        fields: {}
      });
    }
  };

  const handleLogout = () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    localStorage.clear();
    window.location.href = '/login';
  };

  return (
    <div className="sticky top-0 z-10 bg-white shadow">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between">
          <div className="flex">
            <div className="flex flex-shrink-0 items-center md:hidden">
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                onClick={onMenuClick}
              >
                <span className="sr-only">Open sidebar</span>
                <Bars3Icon className="h-6 w-6" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="flex items-center">
            <div className="relative ml-3" ref={dropdownRef}>
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex rounded-full bg-gradient-to-r from-blue-500 to-blue-600 h-10 w-10 items-center justify-center text-white text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                {profileData.username?.charAt(0).toUpperCase() || 'U'}
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-96 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                  <div className="px-4 py-3">
                    {errors.general && (
                      <div className="text-sm text-red-600 mb-4">{errors.general}</div>
                    )}
                    
                    {isEditing ? (
                      <form onSubmit={handleProfileUpdate} className="space-y-6">
                        {errors.general && (
                          <div className="bg-red-50 border-l-4 border-red-400 p-4">
                            <div className="flex">
                              <ExclamationCircleIcon className="h-5 w-5 text-red-400" />
                              <p className="ml-3 text-sm text-red-700">{errors.general}</p>
                            </div>
                          </div>
                        )}

                        <div className="space-y-4">
                          {/* Username field */}
                          <div>
                            <label className="block text-sm font-medium text-gray-900">
                              Username
                              <span className="text-gray-400 text-xs ml-1">(optional)</span>
                            </label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <UserCircleIcon className="h-5 w-5 text-gray-400" />
                              </div>
                              <input
                                type="text"
                                value={profileData.username}
                                onChange={(e) => setProfileData({...profileData, username: e.target.value})}
                                className={`block w-full pl-10 pr-3 py-2.5 rounded-lg border ${
                                  errors.fields.username 
                                    ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500' 
                                    : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                                } shadow-sm transition-all duration-200`}
                                placeholder="Enter new username"
                              />
                              {errors.fields.username && (
                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                  <ExclamationCircleIcon className="h-5 w-5 text-red-500" />
                                </div>
                              )}
                            </div>
                            {errors.fields.username && (
                              <p className="mt-2 text-sm text-red-600">{errors.fields.username}</p>
                            )}
                          </div>

                          {/* Password field */}
                          <div>
                            <label className="block text-sm font-medium text-gray-900">
                              New Password
                              <span className="text-gray-400 text-xs ml-1">(optional)</span>
                            </label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <KeyIcon className="h-5 w-5 text-gray-400" />
                              </div>
                              <input
                                type="password"
                                value={profileData.password}
                                onChange={(e) => setProfileData({...profileData, password: e.target.value})}
                                className={`block w-full pl-10 pr-3 py-2.5 rounded-lg border ${
                                  errors.fields.password 
                                    ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500' 
                                    : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                                } shadow-sm transition-all duration-200`}
                                placeholder="Enter new password"
                              />
                              {errors.fields.password && (
                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                  <ExclamationCircleIcon className="h-5 w-5 text-red-500" />
                                </div>
                              )}
                            </div>
                            {errors.fields.password ? (
                              <p className="mt-2 text-sm text-red-600">{errors.fields.password}</p>
                            ) : (
                              <p className="mt-2 text-xs text-gray-500">
                                Must be at least 8 characters with letters and numbers
                              </p>
                            )}
                          </div>

                          {/* GPA field */}
                          <div>
                            <label className="block text-sm font-medium text-gray-900">
                              GPA
                              <span className="text-gray-400 text-xs ml-1">(optional)</span>
                            </label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <ChartBarIcon className="h-5 w-5 text-gray-400" />
                              </div>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                max="4"
                                value={profileData.gpa}
                                onChange={(e) => setProfileData({...profileData, gpa: e.target.value})}
                                className={`block w-full pl-10 pr-3 py-2.5 rounded-lg border ${
                                  errors.fields.gpa 
                                    ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500' 
                                    : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                                } shadow-sm transition-all duration-200`}
                                placeholder="Enter GPA (0-4)"
                              />
                              {errors.fields.gpa && (
                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                  <ExclamationCircleIcon className="h-5 w-5 text-red-500" />
                                </div>
                              )}
                            </div>
                            {errors.fields.gpa ? (
                              <p className="mt-2 text-sm text-red-600">{errors.fields.gpa}</p>
                            ) : (
                              <p className="mt-2 text-xs text-gray-500">Enter a value between 0 and 4</p>
                            )}
                          </div>

                          {/* Academic Year field */}
                          <div>
                            <label className="block text-sm font-medium text-gray-900">
                              Academic Year
                              <span className="text-gray-400 text-xs ml-1">(optional)</span>
                            </label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <AcademicCapIcon className="h-5 w-5 text-gray-400" />
                              </div>
                              <input
                                type="number"
                                min="1"
                                max="6"
                                value={profileData.academicYear}
                                onChange={(e) => setProfileData({...profileData, academicYear: e.target.value})}
                                className={`block w-full pl-10 pr-3 py-2.5 rounded-lg border ${
                                  errors.fields.academicYear 
                                    ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500' 
                                    : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                                } shadow-sm transition-all duration-200`}
                                placeholder="Enter year (1-6)"
                              />
                              {errors.fields.academicYear && (
                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                  <ExclamationCircleIcon className="h-5 w-5 text-red-500" />
                                </div>
                              )}
                            </div>
                            {errors.fields.academicYear ? (
                              <p className="mt-2 text-sm text-red-600">{errors.fields.academicYear}</p>
                            ) : (
                              <p className="mt-2 text-xs text-gray-500">Enter a value between 1 and 6</p>
                            )}
                          </div>

                          {/* Action buttons */}
                          <div className="pt-5 border-t border-gray-200">
                            <div className="flex justify-end space-x-3">
                              <button
                                type="button"
                                onClick={() => setIsEditing(false)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-sm hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 transform hover:scale-105"
                              >
                                Save Changes
                              </button>
                            </div>
                          </div>
                        </div>
                      </form>
                    ) : (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <UserCircleIcon className="h-5 w-5 text-gray-400" />
                            <div>
                              <p className="text-sm text-gray-500">Username</p>
                              <p className="font-medium">{profileData.username}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <ChartBarIcon className="h-5 w-5 text-gray-400" />
                            <div>
                              <p className="text-sm text-gray-500">GPA</p>
                              <p className="font-medium">{profileData.gpa}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <AcademicCapIcon className="h-5 w-5 text-gray-400" />
                            <div>
                              <p className="text-sm text-gray-500">Academic Year</p>
                              <p className="font-medium">{profileData.academicYear}</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="mt-4 flex justify-center">
                          <button
                            onClick={() => setIsEditing(true)}
                            className="w-full px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-sm hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 transform hover:scale-105"
                          >
                            Edit Profile
                          </button>
                        </div>

                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <button
                            onClick={handleLogout}
                            className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-200"
                          >
                            <ArrowRightOnRectangleIcon className="h-5 w-5 text-gray-400 mr-2" />
                            Logout
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Navbar;