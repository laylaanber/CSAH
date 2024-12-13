// src/hooks/useCourses.js
import { useState, useEffect } from 'react';

export const useCourses = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoading(true);
        // Make API call to your backend
        const response = await fetch('http://localhost:5000/api/courses');
        const data = await response.json();
        
        console.log('API Response:', data); // This will help us debug
        
        if (data.success) {
          setCourses(data.data);
        } else {
          setError(data.message);
        }
      } catch (err) {
        setError('Failed to fetch courses');
        console.error('Error fetching courses:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, []);

  return { courses, loading, error };
};