import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export const LogoutButton = () => {
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);

    // Clear storage first
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.clear();

    // Force navigation to login
    window.location.replace('/login');
  };

  return (
    <button 
      onClick={handleLogout}
      disabled={isLoggingOut}
      className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium
        ${isLoggingOut ? 'bg-gray-400' : 'bg-red-600 hover:bg-red-700'} 
        text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500`}
    >
      {isLoggingOut ? 'Logging out...' : 'Logout'}
    </button>
  );
};