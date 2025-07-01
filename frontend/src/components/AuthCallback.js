import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { CheckCircle, AlertCircle, Loader } from 'lucide-react';

const AuthCallback = () => {
  const [status, setStatus] = useState('processing');
  const [message, setMessage] = useState('Processing authentication...');
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        const error = urlParams.get('error');

        if (error) {
          setStatus('error');
          setMessage(`Authentication failed: ${error}`);
          setTimeout(() => navigate('/dashboard'), 3000);
          return;
        }

        if (!code) {
          setStatus('error');
          setMessage('No authorization code received');
          setTimeout(() => navigate('/dashboard'), 3000);
          return;
        }

        console.log('Calling backend with code:', code, 'state:', state);
        
        // Exchange code for token
        const response = await axios.get(`/api/auth/ghl/callback?code=${code}&state=${state}`);
        
        console.log('Backend response:', response.data);
        
        if (response.data.success) {
          setStatus('success');
          setMessage('GoHighLevel connected successfully!');
          
          // Close the popup window if this is a popup
          if (window.opener) {
            window.opener.postMessage({ type: 'GHL_AUTH_SUCCESS' }, window.location.origin);
            window.close();
          } else {
            // If not a popup, redirect to dashboard
            setTimeout(() => navigate('/dashboard'), 2000);
          }
        } else {
          throw new Error('Authentication failed');
        }
      } catch (error) {
        console.error('Callback error:', error);
        setStatus('error');
        setMessage(error.response?.data?.error || 'Authentication failed');
        
        if (window.opener) {
          window.opener.postMessage({ type: 'GHL_AUTH_ERROR', error: error.message }, window.location.origin);
          window.close();
        } else {
          setTimeout(() => navigate('/dashboard'), 3000);
        }
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
        {status === 'processing' && (
          <>
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <Loader className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Processing Authentication
            </h2>
            <p className="text-gray-600">{message}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Authentication Successful!
            </h2>
            <p className="text-gray-600 mb-4">{message}</p>
            <div className="text-sm text-gray-500">
              {window.opener ? 'You can close this window.' : 'Redirecting to dashboard...'}
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Authentication Failed
            </h2>
            <p className="text-gray-600 mb-4">{message}</p>
            <div className="text-sm text-gray-500">
              {window.opener ? 'You can close this window.' : 'Redirecting to dashboard...'}
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              className="mt-4 btn-primary"
            >
              Return to Dashboard
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthCallback;