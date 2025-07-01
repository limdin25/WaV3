import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Smartphone, Loader, CheckCircle, AlertCircle } from 'lucide-react';

const QRModal = ({ qrCode, accountId, onClose, onConnected }) => {
  const [status, setStatus] = useState('waiting');
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes

  useEffect(() => {
    if (!accountId) return;

    // Poll for connection status
    const pollInterval = setInterval(async () => {
      try {
        const response = await axios.get(`/api/whatsapp/status/${accountId}`);
        if (response.data.connected) {
          setStatus('connected');
          clearInterval(pollInterval);
          setTimeout(() => {
            onConnected();
          }, 2000);
        }
      } catch (error) {
        console.error('Status check error:', error);
        setError('Failed to check connection status');
      }
    }, 2000);

    // Countdown timer
    const countdownInterval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(pollInterval);
          clearInterval(countdownInterval);
          setStatus('expired');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(pollInterval);
      clearInterval(countdownInterval);
    };
  }, [accountId, onConnected]);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={handleBackdropClick}>
      <div className="modal-content max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">Connect WhatsApp</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {status === 'waiting' && (
          <>
            <div className="text-center mb-6">
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <img 
                  src={qrCode} 
                  alt="WhatsApp QR Code" 
                  className="w-64 h-64 mx-auto"
                />
              </div>
              
              <div className="flex items-center justify-center text-blue-600 mb-2">
                <Loader className="w-4 h-4 animate-spin mr-2" />
                <span className="font-medium">Waiting for connection...</span>
              </div>
              
              <div className="text-sm text-gray-600">
                Time remaining: <span className="font-mono">{formatTime(timeLeft)}</span>
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg mb-4">
              <h3 className="font-medium text-blue-900 mb-2 flex items-center">
                <Smartphone className="w-4 h-4 mr-2" />
                How to connect:
              </h3>
              <ol className="list-decimal list-inside space-y-1 text-blue-800 text-sm">
                <li>Open WhatsApp on your phone</li>
                <li>Go to Settings → Linked Devices</li>
                <li>Tap "Link a Device"</li>
                <li>Scan this QR code with your camera</li>
              </ol>
            </div>

            {error && (
              <div className="alert alert-error flex items-center">
                <AlertCircle className="w-4 h-4 mr-2" />
                {error}
              </div>
            )}
          </>
        )}

        {status === 'connected' && (
          <div className="text-center py-8">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              WhatsApp Connected!
            </h3>
            <p className="text-gray-600">
              Your WhatsApp account has been successfully connected and is now syncing with GoHighLevel.
            </p>
          </div>
        )}

        {status === 'expired' && (
          <div className="text-center py-8">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              QR Code Expired
            </h3>
            <p className="text-gray-600 mb-4">
              The QR code has expired. Please close this dialog and try connecting again.
            </p>
            <button
              onClick={onClose}
              className="btn-primary"
            >
              Try Again
            </button>
          </div>
        )}

        {status === 'waiting' && (
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="btn-secondary"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default QRModal;