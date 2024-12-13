// src/hooks/useSchedule.js
import { useState, useEffect } from 'react';

export const useSchedule = () => {
  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCurrentSchedule = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      
      const response = await fetch('http://localhost:5000/api/schedules/current', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      console.log('Current schedule response:', data);
      
      if (data.success) {
        setSchedule(data.data);
      } else {
        setError(data.message || 'Failed to fetch schedule');
      }
    } catch (err) {
      console.error('Schedule fetch error:', err);
      setError('Failed to fetch schedule');
    } finally {
      setLoading(false);
    }
  };

  const generateNewSchedule = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      
      const response = await fetch('http://localhost:5000/api/schedules/generate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      console.log('Generate schedule response:', data);
      
      if (data.success) {
        setSchedule(data.data);
      } else {
        setError(data.message || 'Failed to generate schedule');
      }
    } catch (err) {
      console.error('Schedule generation error:', err);
      setError('Failed to generate schedule');
    } finally {
      setLoading(false);
    }
  };

  const acceptSchedule = async () => {
    try {
      setError(null);
      const token = localStorage.getItem('token');
      
      const response = await fetch('http://localhost:5000/api/schedules/accept', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSchedule(prev => ({
          ...prev,
          status: 'accepted'
        }));
      } else {
        setError(data.message || 'Failed to accept schedule');
      }
    } catch (err) {
      console.error('Schedule accept error:', err);
      setError('Failed to accept schedule');
    }
  };

  const rejectSchedule = async () => {
    try {
      setError(null);
      const token = localStorage.getItem('token');
      
      const response = await fetch('http://localhost:5000/api/schedules/reject', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSchedule(null);
      } else {
        setError(data.message || 'Failed to reject schedule');
      }
    } catch (err) {
      console.error('Schedule reject error:', err);
      setError('Failed to reject schedule');
    }
  };

  useEffect(() => {
    fetchCurrentSchedule();
  }, []);

  return {
    schedule,
    loading,
    error,
    generateNewSchedule,
    acceptSchedule,
    rejectSchedule,
    refreshSchedule: fetchCurrentSchedule
  };
};