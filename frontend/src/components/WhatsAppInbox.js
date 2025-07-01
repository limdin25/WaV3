import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { MessageCircle, Send, RefreshCw, User, Clock } from 'lucide-react';

const WhatsAppInbox = () => {
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [userSelectedChatId, setUserSelectedChatId] = useState(null); // Track user's manual selection
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchChats();
    
    // DISABLED: Auto-refresh causing chat selection jumping
    // Backend handles real-time sync, frontend only refreshes on manual actions
    // const refreshInterval = setInterval(() => {
    //   fetchChats(true); // Preserve current selection
    // }, 5000);

    // return () => clearInterval(refreshInterval);
  }, []);

  useEffect(() => {
    if (selectedChat) {
      fetchMessages(selectedChat.chatId);
      
      // Backend handles sync, just refresh messages every 2 seconds for active chat
      const activeChatRefresh = setInterval(() => {
        if (selectedChat) {
          fetchMessages(selectedChat.chatId);
        }
      }, 2000);

      return () => clearInterval(activeChatRefresh);
    }
  }, [selectedChat?.chatId]); // Only trigger when chatId changes, not object reference

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchChats = async (preserveSelection = true) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await axios.get('/api/whatsapp/chats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setChats(response.data);
      
      // If user manually selected a chat, maintain that selection
      if (preserveSelection && userSelectedChatId) {
        const userSelectedChat = response.data.find(chat => chat.chatId === userSelectedChatId);
        if (userSelectedChat && (!selectedChat || selectedChat.chatId !== userSelectedChatId)) {
          setSelectedChat(userSelectedChat);
        }
      } else if (!preserveSelection || (!selectedChat && !userSelectedChatId)) {
        // Only auto-select if no user selection and no current selection
        if (response.data.length > 0) {
          setSelectedChat(response.data[0]);
          setUserSelectedChatId(response.data[0].chatId);
        }
      }
    } catch (error) {
      console.error('Error fetching chats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (chatId) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await axios.get(`/api/whatsapp/chats/${chatId}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(response.data.messages.reverse()); // Reverse to show oldest first
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChat || sending) {
      console.log('SendMessage blocked:', { 
        hasMessage: !!newMessage.trim(), 
        hasSelectedChat: !!selectedChat,
        chatId: selectedChat?.chatId,
        sending 
      });
      return;
    }

    console.log('Sending message:', newMessage, 'to chat:', selectedChat.chatId);
    setSending(true);
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('No auth token found');
      }
      
      const response = await axios.post('/api/whatsapp/send', {
        chatId: selectedChat.chatId,
        message: newMessage
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Add message to local state immediately
      setMessages(prev => [...prev, response.data.message]);
      setNewMessage('');
      
      // Update chat's last message
      setChats(prev => prev.map(chat => 
        chat.chatId === selectedChat.chatId 
          ? { ...chat, lastMessage: response.data.message }
          : chat
      ));

      // Backend handles sync, just refresh UI to show sent message immediately
      setTimeout(() => {
        fetchMessages(selectedChat.chatId);
        // Only refresh chat list when sending messages to update last message
        fetchChats(true);
      }, 1000);
    } catch (error) {
      console.error('Error sending message:', error);
      console.error('Error details:', error.response?.data || error.message);
      alert(`Failed to send message: ${error.response?.data?.error || error.message}`);
    } finally {
      setSending(false);
    }
  };

  const syncMessages = async () => {
    if (syncing) return;
    
    setSyncing(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await axios.get('/api/whatsapp/sync', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.syncedCount > 0) {
        fetchChats(); // Refresh chats to get updated last messages
        if (selectedChat) {
          fetchMessages(selectedChat.chatId); // Refresh current chat messages
        }
      }
    } catch (error) {
      console.error('Error syncing messages:', error);
    } finally {
      setSyncing(false);
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatChatTime = (timestamp) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return formatTime(timestamp);
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading-spinner h-12 w-12"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <MessageCircle className="w-8 h-8 text-green-600" />
            <h1 className="text-3xl font-bold text-gray-900">WhatsApp Inbox</h1>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => fetchChats(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh Chats</span>
            </button>
            <button
              onClick={syncMessages}
              disabled={syncing}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              <span>{syncing ? 'Syncing...' : 'Sync Messages'}</span>
            </button>
          </div>
        </div>

        {chats.length === 0 ? (
          <div className="text-center py-12">
            <MessageCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No chats yet</h3>
            <p className="text-gray-600">
              Start a conversation on WhatsApp to see chats here
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-lg overflow-hidden" style={{ height: 'calc(100vh - 200px)' }}>
            <div className="flex h-full">
              {/* Chat List */}
              <div className="w-1/3 border-r border-gray-200 overflow-y-auto">
                <div className="p-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Chats ({chats.length})</h2>
                </div>
                <div className="divide-y divide-gray-200">
                  {chats.map((chat, index) => (
                    <div
                      key={`${chat.chatId}-${index}`}
                      onClick={() => {
                        console.log('User manually selected chat:', chat.contactName, chat.chatId);
                        setSelectedChat(chat);
                        setUserSelectedChatId(chat.chatId); // Lock this selection
                      }}
                      className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                        selectedChat?.chatId === chat.chatId ? 'bg-green-50 border-r-4 border-green-500' : ''
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                          <User className="w-6 h-6 text-green-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-medium text-gray-900 truncate">
                              {chat.contactName}
                            </h3>
                            {chat.lastMessage && (
                              <span className="text-xs text-gray-500">
                                {formatChatTime(chat.lastMessage.timestamp)}
                              </span>
                            )}
                          </div>
                          {chat.lastMessage && (
                            <p className="text-sm text-gray-600 truncate mt-1">
                              {chat.lastMessage.direction === 'outbound' && 'You: '}
                              {chat.lastMessage.message}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Message Area */}
              <div className="flex-1 flex flex-col">
                {selectedChat ? (
                  <>
                    {/* Chat Header */}
                    <div className="p-4 border-b border-gray-200 bg-white">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">
                            {selectedChat.contactName}
                          </h3>
                          <p className="text-sm text-gray-500">
                            Chat ID: {selectedChat.chatId}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${message.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                              message.direction === 'outbound'
                                ? 'bg-green-500 text-white'
                                : 'bg-gray-100 text-gray-900'
                            }`}
                          >
                            <p className="text-sm">{message.message}</p>
                            <div className={`flex items-center mt-1 text-xs ${
                              message.direction === 'outbound' ? 'text-green-100' : 'text-gray-500'
                            }`}>
                              <Clock className="w-3 h-3 mr-1" />
                              {formatTime(message.timestamp)}
                            </div>
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>

                    {/* Message Input */}
                    <div className="p-4 border-t border-gray-200 bg-white">
                      <div className="flex space-x-4">
                        <input
                          type="text"
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                          placeholder="Type a message..."
                          className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          disabled={sending}
                        />
                        <button
                          onClick={sendMessage}
                          disabled={!newMessage.trim() || sending || !selectedChat}
                          className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                        >
                          <Send className="w-4 h-4" />
                          <span>{sending ? 'Sending...' : (!selectedChat ? 'No chat' : 'Send')}</span>
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <MessageCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        Select a chat to start messaging
                      </h3>
                      <p className="text-gray-600">
                        Choose a conversation from the list to view messages
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WhatsAppInbox;