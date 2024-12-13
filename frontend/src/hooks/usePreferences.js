// src/hooks/usePreferences.js
import { useState, useEffect } from 'react';

export const usePreferences = () => {
  const [preferences, setPreferences] = useState({
    preferredDays: 'idc',
    preferBreaks: 'idc',
    targetCreditHours: 15,
    specificCourses: [],
    coursesToImprove: [],
    categoryPreferences: {
      networking: 'neutral',
      hardware: 'neutral',
      software: 'neutral',
      electrical: 'neutral'
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saveStatus, setSaveStatus] = useState({ saving: false, error: null });

  const fetchPreferences = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('http://localhost:5000/api/preferences', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      
      if (data.success && data.data) {
        setPreferences(data.data);
      }
    } catch (err) {
      setError('Failed to load preferences');
      console.error('Error loading preferences:', err);
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async (newPreferences) => {
    try {
      setSaveStatus({ saving: true, error: null });
      const response = await fetch('http://localhost:5000/api/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(newPreferences)
      });
      const data = await response.json();
      
      if (data.success) {
        setPreferences(newPreferences);
        return true;
      } else {
        throw new Error(data.message);
      }
    } catch (err) {
      setSaveStatus({ saving: false, error: err.message });
      return false;
    } finally {
      setSaveStatus({ saving: false, error: null });
    }
  };

  useEffect(() => {
    fetchPreferences();
  }, []);

  return {
    preferences,
    setPreferences,
    loading,
    error,
    savePreferences,
    saveStatus,
    refreshPreferences: fetchPreferences
  };
};