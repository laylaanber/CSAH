// frontend/src/pages/Register.jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const Register = () => {
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    studentId: '',
    gpa: '',
    academicYear: ''
  });

  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const navigate = useNavigate();

  const validateForm = () => {
    const newErrors = {};
    
    // Email validation
    if (!formData.email.endsWith('@ju.edu.jo')) {
      newErrors.email = 'Email must be a valid JU email address';
    }

    // Password validation
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
    if (!passwordRegex.test(formData.password)) {
      newErrors.password = 'Password must be at least 8 characters and contain both letters and numbers';
    }

    // Student ID validation
    const studentIdRegex = /^\d+$/;
    if (!studentIdRegex.test(formData.studentId)) {
      newErrors.studentId = 'Student ID must contain only numbers';
    }

    // GPA validation
    const gpa = parseFloat(formData.gpa);
    if (isNaN(gpa) || gpa < 0 || gpa > 4) {
      newErrors.gpa = 'GPA must be between 0 and 4';
    }

    // Academic Year validation
    const year = parseInt(formData.academicYear);
    if (isNaN(year) || year < 1 || year > 6) {
      newErrors.academicYear = 'Academic year must be between 1 and 6';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
  
    try {
      const response = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
  
      const data = await response.json();
  
      if (!response.ok) {
        setServerError(data.message || 'Registration failed');
        return;
      }
  
      // Save token after successful registration
      localStorage.setItem('token', data.data.token);
      navigate('/passed-courses');
  
    } catch (error) {
      console.error('Registration error:', error);
      setServerError('Registration failed. Please try again.');
    }
  };
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
        </div>
        
        {serverError && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="text-sm text-red-700">{serverError}</div>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <input
                type="email"
                required
                name="email-register"
                autoComplete="new-password"
                spellCheck="false"
                className={`appearance-none rounded-t-md relative block w-full px-3 py-2 border ${
                  errors.email ? 'border-red-300' : 'border-gray-300'
                } placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm`}
                placeholder="Email address"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>

            <div>
              <input
                type="text"
                required
                name="username-register"
                autoComplete="new-password"
                spellCheck="false"
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Username"
                value={formData.username}
                onChange={(e) => setFormData({...formData, username: e.target.value})}
              />
            </div>

            <div>
              <input
                type="password"
                required
                name="password-register"
                autoComplete="new-password"
                className={`appearance-none relative block w-full px-3 py-2 border ${
                  errors.password ? 'border-red-300' : 'border-gray-300'
                } placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm`}
                placeholder="Password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
              />
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
            </div>

            <div>
              <input
                type="text"
                required
                name="studentId-register"
                autoComplete="new-password"
                spellCheck="false"
                className={`appearance-none relative block w-full px-3 py-2 border ${
                  errors.studentId ? 'border-red-300' : 'border-gray-300'
                } placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm`}
                placeholder="Student ID"
                value={formData.studentId}
                onChange={(e) => setFormData({...formData, studentId: e.target.value})}
              />
              {errors.studentId && <p className="text-red-500 text-xs mt-1">{errors.studentId}</p>}
            </div>

            <div>
              <input
                type="number"
                step="0.01"
                required
                name="gpa-register"
                autoComplete="new-password"
                className={`appearance-none relative block w-full px-3 py-2 border ${
                  errors.gpa ? 'border-red-300' : 'border-gray-300'
                } placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm`}
                placeholder="GPA"
                value={formData.gpa}
                onChange={(e) => setFormData({...formData, gpa: e.target.value})}
              />
              {errors.gpa && <p className="text-red-500 text-xs mt-1">{errors.gpa}</p>}
            </div>

            <div>
              <input
                type="number"
                required
                name="academic-year-register"
                autoComplete="new-password"
                className={`appearance-none rounded-b-md relative block w-full px-3 py-2 border ${
                  errors.academicYear ? 'border-red-300' : 'border-gray-300'
                } placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm`}
                placeholder="Academic Year (1-6)"
                value={formData.academicYear}
                onChange={(e) => setFormData({...formData, academicYear: e.target.value})}
              />
              {errors.academicYear && <p className="text-red-500 text-xs mt-1">{errors.academicYear}</p>}
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Register
            </button>
          </div>
        </form>

        <div className="text-center">
          <Link to="/login" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
            Already have an account? Login here
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;