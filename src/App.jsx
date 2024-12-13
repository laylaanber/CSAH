// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './components/layout/DashboardLayout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import CourseSelection from './pages/CourseSelection'; // instead of Courses
import Schedule from './pages/Schedule';
import Preferences from './pages/Preferences';
import EditPassedCourses from './pages/EditPassedCourses';
import Progress from './pages/Progress';

function App() {
  const token = localStorage.getItem('token');

  console.log('Current token:', token); // Debug log

  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={!token ? <Login /> : <Navigate to="/dashboard" />} />
        <Route path="/register" element={!token ? <Register /> : <Navigate to="/dashboard" />} />

        {/* Protected routes */}
        <Route element={token ? <DashboardLayout /> : <Navigate to="/login" />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/courses" element={<CourseSelection />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/preferences" element={<Preferences />} />
          <Route path="/edit-passed-courses" element={<EditPassedCourses />} />
          <Route path="/profile" element={<Progress />} />
        </Route>

        {/* Root redirect */}
        <Route path="/" element={<Navigate to={token ? "/dashboard" : "/login"} />} />
        
        {/* Catch all route */}
        <Route path="*" element={<Navigate to={token ? "/dashboard" : "/login"} />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;