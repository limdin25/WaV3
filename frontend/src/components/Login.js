import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Mail, Lock, Eye, EyeOff, AlertCircle, User, Zap } from 'lucide-react';

// Predefined stable login credentials that never change
const STABLE_CREDENTIALS = [
  { email: 'demo@demo.com', password: 'demo123', name: 'Demo User', color: 'blue' },
  { email: 'test@test.com', password: 'test123', name: 'Test User', color: 'green' },
  { email: 'debug@test.com', password: 'debug123', name: 'Debug User', color: 'purple' }
];

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [rememberMe, setRememberMe] = useState(false);
  const [showQuickLogin, setShowQuickLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  // Load saved credentials on component mount
  useEffect(() => {
    const savedEmail = localStorage.getItem('saved_email');
    const savedPassword = localStorage.getItem('saved_password');
    const savedRememberMe = localStorage.getItem('remember_me') === 'true';
    
    if (savedRememberMe && savedEmail && savedPassword) {
      setFormData({
        email: savedEmail,
        password: savedPassword
      });
      setRememberMe(true);
    } else {
      // Auto-populate with demo credentials for quick access
      setFormData({
        email: 'demo@demo.com',
        password: 'demo123'
      });
    }
  }, []);

  // Quick login function for stable credentials
  const handleQuickLogin = async (credentials) => {
    setLoading(true);
    setError('');
    setFormData({
      email: credentials.email,
      password: credentials.password
    });

    console.log('🔍 Quick Login Attempt:', credentials.email);
    
    try {
      const response = await axios.post('/api/auth/login', {
        email: credentials.email,
        password: credentials.password
      });
      
      console.log('✅ Login response:', response.data);
      const { token, user } = response.data;
      
      // Save successful login credentials
      if (rememberMe) {
        localStorage.setItem('saved_email', credentials.email);
        localStorage.setItem('saved_password', credentials.password);
        localStorage.setItem('remember_me', 'true');
      }
      
      login(token, user);
      navigate('/dashboard');
    } catch (error) {
      console.error('❌ Login error:', error.response?.data || error.message);
      const errorMessage = error.response?.data?.error || 'Login failed. Please try again.';
      setError(`Login failed for ${credentials.email}: ${errorMessage}`);
      setFormData({
        email: credentials.email,
        password: credentials.password
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    console.log('🔍 Form Login Attempt:', formData.email);
    
    try {
      const response = await axios.post('/api/auth/login', formData);
      console.log('✅ Form Login response:', response.data);
      const { token, user } = response.data;
      
      // Save credentials if remember me is checked
      if (rememberMe) {
        localStorage.setItem('saved_email', formData.email);
        localStorage.setItem('saved_password', formData.password);
        localStorage.setItem('remember_me', 'true');
      } else {
        // Clear saved credentials if remember me is unchecked
        localStorage.removeItem('saved_email');
        localStorage.removeItem('saved_password');
        localStorage.removeItem('remember_me');
      }
      
      login(token, user);
      navigate('/dashboard');
    } catch (error) {
      console.error('❌ Form Login error:', error.response?.data || error.message);
      const errorMessage = error.response?.data?.error || 'Login failed. Please try again.';
      setError(`Login failed for ${formData.email}: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 bg-gradient-to-r from-blue-600 to-green-600 rounded-full flex items-center justify-center">
            <Lock className="h-6 w-6 text-white" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <Link
              to="/register"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              create a new account
            </Link>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="alert alert-error flex items-center">
              <AlertCircle className="h-4 w-4 mr-2" />
              {error}
            </div>
          )}

          {/* Quick Login Buttons */}
          {showQuickLogin && (
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-700 flex items-center">
                  <Zap className="h-4 w-4 mr-1 text-yellow-500" />
                  Quick Login (Stable Credentials)
                </h3>
                <button
                  type="button"
                  onClick={() => setShowQuickLogin(false)}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Hide
                </button>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {STABLE_CREDENTIALS.map((cred, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleQuickLogin(cred)}
                    disabled={loading}
                    className={`flex items-center justify-between p-3 rounded-md border-2 transition-all duration-200 ${
                      loading 
                        ? 'opacity-50 cursor-not-allowed' 
                        : `border-${cred.color}-200 hover:border-${cred.color}-300 hover:bg-${cred.color}-50`
                    }`}
                  >
                    <div className="flex items-center">
                      <div className={`w-2 h-2 rounded-full bg-${cred.color}-500 mr-2`}></div>
                      <div className="text-left">
                        <div className="text-sm font-medium text-gray-900">{cred.name}</div>
                        <div className="text-xs text-gray-500">{cred.email}</div>
                      </div>
                    </div>
                    <User className="h-4 w-4 text-gray-400" />
                  </button>
                ))}
              </div>
              <div className="mt-3 text-xs text-gray-500 text-center">
                These credentials never change and auto-populate for quick development access
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="form-label">
                Email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="form-input pl-10"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="form-label">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  className="form-input pl-10 pr-10"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Remember my credentials</span>
              </label>
              {!showQuickLogin && (
                <button
                  type="button"
                  onClick={() => setShowQuickLogin(true)}
                  className="text-sm text-blue-600 hover:text-blue-500"
                >
                  Show Quick Login
                </button>
              )}
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className={`group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white ${
                loading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
              } transition-colors duration-200`}
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="loading-spinner h-4 w-4 mr-2"></div>
                  Signing in...
                </div>
              ) : (
                'Sign in'
              )}
            </button>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Don't have an account yet?{' '}
              <Link
                to="/register"
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                Sign up here
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;