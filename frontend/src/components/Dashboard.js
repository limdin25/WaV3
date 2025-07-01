import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Building, MessageCircle, CheckCircle, XCircle, Clock, Settings, Trash2, RefreshCw, Inbox } from 'lucide-react';
import WhatsAppConnectionModal from './WhatsAppConnectionModal';

const Dashboard = () => {
  const navigate = useNavigate();
  const [connections, setConnections] = useState({
    crm: null,
    whatsapp: null
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [connectionLoading, setConnectionLoading] = useState({
    crm: false,
    whatsapp: false
  });

  useEffect(() => {
    console.log('Dashboard loaded');
    fetchConnections();
    
    // Check for WhatsApp connection status from URL params
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('whatsapp_connected') === 'true') {
      setSuccess('WhatsApp connected successfully!');
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (urlParams.get('whatsapp_error') === 'true') {
      setError('WhatsApp connection failed. Please try again.');
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    // Cleanup function to clear any intervals
    return () => {
      // Clear any existing intervals when component unmounts
      for (let i = 0; i < 10000; i++) {
        clearInterval(i);
      }
    };
  }, []);

  const fetchConnections = async () => {
    try {
      const response = await axios.get(`/api/connections?t=${Date.now()}`, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      setConnections(response.data);
    } catch (error) {
      console.error('Error fetching connections:', error);
      setError('Failed to fetch connections');
    } finally {
      setLoading(false);
    }
  };

  const connectCRM = async () => {
    setConnectionLoading(prev => ({ ...prev, crm: true }));
    try {
      const response = await axios.get('/api/auth/crm');
      window.open(response.data.authUrl, '_blank', 'width=600,height=700');
      
      // Controlled polling with proper cleanup
      let pollCount = 0;
      const maxPolls = 20; // Maximum 20 attempts (1 minute)
      
      const pollInterval = setInterval(async () => {
        pollCount++;
        console.log(`Polling attempt ${pollCount}/${maxPolls}`);
        
        try {
          const connectionResponse = await axios.get(`/api/connections?t=${Date.now()}`, {
            headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
          });
          
          if (connectionResponse.data.crm) {
            console.log('✅ CRM connected successfully!');
            setConnections(connectionResponse.data);
            setSuccess('CRM connected successfully!');
            clearInterval(pollInterval);
            setConnectionLoading(prev => ({ ...prev, crm: false }));
            return;
          }
          
          // Stop after max attempts
          if (pollCount >= maxPolls) {
            console.log('⏰ Polling timeout reached');
            clearInterval(pollInterval);
            setConnectionLoading(prev => ({ ...prev, crm: false }));
          }
          
        } catch (error) {
          console.error('Polling error:', error);
          clearInterval(pollInterval);
          setConnectionLoading(prev => ({ ...prev, crm: false }));
        }
      }, 3000);
      
    } catch (error) {
      setError('Failed to initiate CRM connection');
      setConnectionLoading(prev => ({ ...prev, crm: false }));
    }
  };

  const connectWhatsApp = async () => {
    setShowWhatsAppModal(true);
  };

  const disconnectService = async (service) => {
    try {
      await axios.delete(`/api/connections/${service}`);
      setConnections({
        ...connections,
        [service]: null
      });
      setSuccess(`${service === 'crm' ? 'CRM' : 'WhatsApp'} disconnected successfully!`);
    } catch (error) {
      setError(`Failed to disconnect ${service}`);
    }
  };

  const onWhatsAppConnected = () => {
    setShowWhatsAppModal(false);
    setSuccess('WhatsApp connected successfully!');
    setConnectionLoading(prev => ({ ...prev, whatsapp: false }));
    fetchConnections();
  };

  const ConnectionCard = ({ 
    title, 
    description, 
    icon: Icon, 
    connected, 
    onConnect, 
    onDisconnect, 
    loading, 
    disabled = false,
    connectionData 
  }) => (
    <div className="card">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <div className={`p-3 rounded-lg ${connected ? 'bg-green-100' : 'bg-gray-100'}`}>
            <Icon className={`w-6 h-6 ${connected ? 'text-green-600' : 'text-gray-600'}`} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-600">{description}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {connected ? (
            <div className="flex items-center space-x-2">
              <div className="status-connected">
                <CheckCircle className="w-4 h-4 mr-1" />
                <span className="text-sm font-medium">Connected</span>
              </div>
              <button
                onClick={onDisconnect}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Disconnect"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onConnect}
              disabled={disabled || loading}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                disabled
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : loading
                  ? 'bg-blue-400 text-white cursor-wait'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {loading ? (
                <div className="flex items-center">
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Connecting...
                </div>
              ) : (
                'Connect'
              )}
            </button>
          )}
        </div>
      </div>
      
      {connected && connectionData && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-4 text-sm">
            {connectionData.locationId && (
              <div>
                <span className="font-medium text-gray-700">Location ID:</span>
                <p className="text-gray-600 truncate">{connectionData.locationId}</p>
              </div>
            )}
            {connectionData.accountId && (
              <div>
                <span className="font-medium text-gray-700">Account ID:</span>
                <p className="text-gray-600 truncate">{connectionData.accountId}</p>
              </div>
            )}
            {connectionData.createdAt && (
              <div>
                <span className="font-medium text-gray-700">Connected:</span>
                <p className="text-gray-600">{new Date(connectionData.createdAt).toLocaleDateString()}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading-spinner h-12 w-12"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Integration Dashboard</h1>
          <p className="text-gray-600">
            Connect your WhatsApp and CRM accounts to start syncing messages
          </p>
        </div>

        {/* Alerts */}
        {error && (
          <div className="alert alert-error mb-6 fade-in">
            {error}
            <button
              onClick={() => setError('')}
              className="ml-auto text-red-600 hover:text-red-800"
            >
              ×
            </button>
          </div>
        )}
        
        {success && (
          <div className="alert alert-success mb-6 fade-in">
            {success}
            <button
              onClick={() => setSuccess('')}
              className="ml-auto text-green-600 hover:text-green-800"
            >
              ×
            </button>
          </div>
        )}

        {/* Connection Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="card">
            <div className="flex items-center space-x-3">
              <div className={`p-3 rounded-lg ${connections.crm ? 'bg-green-100' : 'bg-gray-100'}`}>
                <Building className={`w-6 h-6 ${connections.crm ? 'text-green-600' : 'text-gray-600'}`} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">CRM</h3>
                <p className={`text-sm ${connections.crm ? 'text-green-600' : 'text-gray-500'}`}>
                  {connections.crm ? 'Connected' : 'Not Connected'}
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center space-x-3">
              <div className={`p-3 rounded-lg ${connections.whatsapp ? 'bg-green-100' : 'bg-gray-100'}`}>
                <MessageCircle className={`w-6 h-6 ${connections.whatsapp ? 'text-green-600' : 'text-gray-600'}`} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">WhatsApp</h3>
                <p className={`text-sm ${connections.whatsapp ? 'text-green-600' : 'text-gray-500'}`}>
                  {connections.whatsapp ? 'Connected' : 'Not Connected'}
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center space-x-3">
              <div className={`p-3 rounded-lg ${connections.crm && connections.whatsapp ? 'bg-green-100' : 'bg-gray-100'}`}>
                <Settings className={`w-6 h-6 ${connections.crm && connections.whatsapp ? 'text-green-600' : 'text-gray-600'}`} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Integration</h3>
                <p className={`text-sm ${connections.crm && connections.whatsapp ? 'text-green-600' : 'text-gray-500'}`}>
                  {connections.crm && connections.whatsapp ? 'Active' : 'Inactive'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Connection Setup */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ConnectionCard
            title="CRM"
            description="Connect your CRM account to sync conversations"
            icon={Building}
            connected={!!connections.crm}
            onConnect={connectCRM}
            onDisconnect={() => disconnectService('crm')}
            loading={connectionLoading.crm}
            connectionData={connections.crm}
          />

          <ConnectionCard
            title="WhatsApp"
            description="Connect WhatsApp via QR code scan"
            icon={MessageCircle}
            connected={!!connections.whatsapp}
            onConnect={connectWhatsApp}
            onDisconnect={() => disconnectService('whatsapp')}
            loading={connectionLoading.whatsapp}
            disabled={!connections.crm}
            connectionData={connections.whatsapp}
          />
        </div>

        {/* Integration Instructions */}
        {!connections.crm && (
          <div className="mt-8 card border-l-4 border-blue-500">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Getting Started</h3>
            <ol className="list-decimal list-inside space-y-2 text-gray-600">
              <li>First, connect your CRM account using OAuth</li>
              <li>Once CRM is connected, you can connect WhatsApp using QR code</li>
              <li>After both connections are active, messages will sync automatically</li>
            </ol>
          </div>
        )}

        {connections.crm && !connections.whatsapp && (
          <div className="mt-8 card border-l-4 border-green-500">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Next Step</h3>
            <p className="text-gray-600">
              Great! CRM is connected. Now connect your WhatsApp account to start syncing messages.
            </p>
          </div>
        )}

        {connections.crm && connections.whatsapp && (
          <div className="mt-8 card border-l-4 border-green-500">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Integration Active</h3>
            <p className="text-gray-600 mb-4">
              Perfect! Both accounts are connected. Messages are now syncing between WhatsApp and your CRM.
            </p>
            <div className="bg-blue-50 p-4 rounded-lg mb-4">
              <h4 className="font-medium text-blue-900 mb-2">How it works:</h4>
              <ul className="list-disc list-inside space-y-1 text-blue-800 text-sm">
                <li>Incoming WhatsApp messages appear in your CRM conversations</li>
                <li>Replies from CRM are sent back to WhatsApp</li>
                <li>All message history is preserved in both platforms</li>
              </ul>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={() => navigate('/inbox')}
                className="flex items-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                <Inbox className="w-5 h-5" />
                <span>Open WhatsApp Inbox</span>
              </button>
              <div className="text-sm text-gray-600 flex items-center">
                <span>View and respond to WhatsApp messages directly from your browser</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* WhatsApp Connection Modal */}
      <WhatsAppConnectionModal
        isOpen={showWhatsAppModal}
        onClose={() => setShowWhatsAppModal(false)}
        onConnected={onWhatsAppConnected}
      />
    </div>
  );
};

export default Dashboard;