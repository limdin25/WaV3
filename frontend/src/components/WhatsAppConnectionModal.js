import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Smartphone, Plus, QrCode, CheckCircle, Clock } from 'lucide-react';

const WhatsAppConnectionModal = ({ isOpen, onClose, onConnected }) => {
  const [availableAccounts, setAvailableAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [newAccountId, setNewAccountId] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchAvailableAccounts();
    }
  }, [isOpen]);

  const fetchAvailableAccounts = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      console.log('🔍 Fetching available WhatsApp accounts...');
      
      const response = await axios.get(`/api/whatsapp/available-accounts?t=${Date.now()}`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      console.log('📦 Available accounts response:', response.data);
      console.log('📊 Number of accounts:', response.data.accounts.length);
      
      setAvailableAccounts(response.data.accounts);
    } catch (error) {
      console.error('Error fetching available accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const connectExistingAccount = async (accountId) => {
    setConnecting(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await axios.post('/api/whatsapp/connect', {
        accountId,
        createNew: false
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        onConnected();
        onClose();
      }
    } catch (error) {
      console.error('Error connecting account:', error);
    } finally {
      setConnecting(false);
    }
  };

  const createNewAccount = async () => {
    console.log('Creating new WhatsApp account...');
    setConnecting(true);
    try {
      const token = localStorage.getItem('auth_token');
      console.log('Token exists:', !!token);
      
      const response = await axios.post('/api/whatsapp/connect', {
        createNew: true
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('Hosted auth response:', response.data);

      if (!response.data.authUrl) {
        throw new Error('No auth URL received from server');
      }

      // Open Unipile's hosted auth page in the same window
      console.log('Redirecting to auth URL:', response.data.authUrl);
      window.location.href = response.data.authUrl;
    } catch (error) {
      console.error('Error creating hosted auth link:', error);
      console.error('Response data:', error.response?.data);
      alert(`Error creating authentication link: ${error.response?.data?.error || error.message}`);
      setConnecting(false);
    }
  };

  const pollConnectionStatus = async (sessionId, authWindow) => {
    const pollInterval = setInterval(async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const response = await axios.get(`/api/whatsapp/status/${sessionId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (response.data.connected) {
          clearInterval(pollInterval);
          setConnecting(false);
          
          // Close the auth window if it's still open
          if (authWindow && !authWindow.closed) {
            authWindow.close();
          }
          
          onConnected();
          onClose();
        }
      } catch (error) {
        console.error('Error checking connection status:', error);
      }
    }, 3000);

    // Stop polling after 5 minutes
    setTimeout(() => {
      clearInterval(pollInterval);
      setConnecting(false);
      
      // Close the auth window if it's still open
      if (authWindow && !authWindow.closed) {
        authWindow.close();
      }
    }, 300000);
  };

  const formatPhoneNumber = (phone) => {
    if (!phone) return 'Unknown';
    return phone.replace(/(\d{2})(\d{4})(\d{3})(\d{3})/, '+$1 $2 $3 $4');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Connect WhatsApp</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {connecting && !loading ? (
            <div className="text-center py-8">
              <div className="loading-spinner h-8 w-8 mx-auto mb-4"></div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Connecting WhatsApp Account
              </h3>
              <p className="text-gray-600 mb-4">
                Please complete the authentication in the popup window
              </p>
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-800">
                  A new window has opened with Unipile's authentication page. 
                  Follow the instructions there to connect your WhatsApp account.
                </p>
              </div>
            </div>
          ) : loading ? (
            <div className="text-center py-8">
              <div className="loading-spinner h-8 w-8 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading WhatsApp accounts...</p>
            </div>
          ) : (
            <div>
              {availableAccounts.length > 0 ? (
                <div className="mb-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">
                    Use Existing Account
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Select a WhatsApp account connected through this app:
                  </p>
                  <div className="space-y-3">
                    {availableAccounts.map((account) => (
                      <div
                        key={account.id}
                        className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                              <Smartphone className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">
                                {formatPhoneNumber(account.phoneNumber)}
                              </p>
                              <div className="flex items-center space-x-1">
                                <CheckCircle className="w-4 h-4 text-green-500" />
                                <span className="text-sm text-green-600">Connected</span>
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => connectExistingAccount(account.id)}
                            disabled={connecting}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors text-sm"
                          >
                            {connecting ? 'Connecting...' : 'Use This Account'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-white text-gray-500">OR</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mb-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800">
                      <strong>No WhatsApp accounts connected yet.</strong><br/>
                      Connect your first WhatsApp account using the authentication page below.
                    </p>
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">
                  Connect New Account
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  You'll be redirected to Unipile's secure authentication page where you can scan a QR code with WhatsApp:
                </p>
                <button
                  onClick={createNewAccount}
                  disabled={connecting}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  <span>{connecting ? 'Redirecting...' : 'Go to Authentication Page'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WhatsAppConnectionModal;