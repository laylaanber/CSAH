import { useState } from 'react';

export const ScheduleFeedback = ({ onSubmit }) => {
  const [feedback, setFeedback] = useState({
    dayPreference: 'normal',
    breakPreference: 'no_preference', 
    difficultyRating: 'good',
    labPreference: 'good'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(feedback);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded">
      <h3 className="text-lg font-semibold">Schedule Preferences</h3>
      
      <div>
        <label className="block text-sm font-medium">Day Preference</label>
        <select 
          value={feedback.dayPreference}
          onChange={(e) => setFeedback({...feedback, dayPreference: e.target.value})}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
        >
          <option value="high">Strongly Prefer Selected Days</option>
          <option value="normal">No Strong Preference</option>
          <option value="low">More Flexible with Days</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium">Break Preference</label>
        <select 
          value={feedback.breakPreference}
          onChange={(e) => setFeedback({...feedback, breakPreference: e.target.value})}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
        >
          <option value="longer">Longer Breaks</option>
          <option value="shorter">Shorter Breaks</option>
          <option value="no_preference">No Preference</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium">Current Schedule Difficulty</label>
        <select 
          value={feedback.difficultyRating}
          onChange={(e) => setFeedback({...feedback, difficultyRating: e.target.value})}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
        >
          <option value="too_hard">Too Hard</option>
          <option value="good">Good</option>
          <option value="too_easy">Too Easy</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium">Lab Preference</label>
        <select 
          value={feedback.labPreference}
          onChange={(e) => setFeedback({...feedback, labPreference: e.target.value})}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
        >
          <option value="more">More Labs</option>
          <option value="less">Less Labs</option>
          <option value="good">Current Amount Good</option>
        </select>
      </div>

      <button 
        type="submit"
        className="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
      >
        Regenerate Schedule
      </button>
    </form>
  );
};