import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Search, MoreVertical, Send, Smile, Paperclip, Mic, ArrowLeft, Home, LayoutDashboard, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';

const WhatsAppInbox = () => {
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [userSelectedChatId, setUserSelectedChatId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const messagesEndRef = useRef(null);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const { logout } = useAuth();

  useEffect(() => {
    fetchChats();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (selectedChat) {
      fetchMessages(selectedChat.chatId);
      
      const activeChatRefresh = setInterval(() => {
        if (selectedChat) {
          fetchMessages(selectedChat.chatId);
        }
      }, 2000);

      return () => clearInterval(activeChatRefresh);
    }
  }, [selectedChat?.chatId]);

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
      
      if (preserveSelection && userSelectedChatId) {
        const userSelectedChat = response.data.find(chat => chat.chatId === userSelectedChatId);
        if (userSelectedChat && (!selectedChat || selectedChat.chatId !== userSelectedChatId)) {
          setSelectedChat(userSelectedChat);
        }
      } else if (!preserveSelection || (!selectedChat && !userSelectedChatId)) {
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
      setMessages(response.data.messages.reverse());
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

      setMessages(prev => [...prev, response.data.message]);
      setNewMessage('');
      
      setChats(prev => prev.map(chat => 
        chat.chatId === selectedChat.chatId 
          ? { ...chat, lastMessage: response.data.message }
          : chat
      ));

      setTimeout(() => {
        fetchMessages(selectedChat.chatId);
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
        fetchChats();
        if (selectedChat) {
          fetchMessages(selectedChat.chatId);
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
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const formatMessageDate = (timestamp, previousTimestamp) => {
    const date = new Date(timestamp);
    const prevDate = previousTimestamp ? new Date(previousTimestamp) : null;
    
    if (!prevDate || date.toDateString() !== prevDate.toDateString()) {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      if (date.toDateString() === today.toDateString()) {
        return 'TODAY';
      } else if (date.toDateString() === yesterday.toDateString()) {
        return 'YESTERDAY';
      } else {
        return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase();
      }
    }
    return null;
  };

  const filteredChats = chats.filter(chat => 
    chat.contactName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <div className="loading-spinner h-12 w-12"></div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-white">
      {/* Sidebar */}
      <div className="w-[400px] bg-gray-100 flex flex-col">
        {/* Sidebar Header */}
        <div className="bg-[#ededed] p-4 border-r border-gray-300">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Chats</h2>
            <div className="flex items-center space-x-4">
              <button onClick={syncMessages} disabled={syncing} className="text-gray-600 hover:text-gray-800">
                <svg className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              <div className="relative" ref={dropdownRef}>
                <button 
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="text-gray-600 hover:text-gray-800"
                >
                  <MoreVertical className="w-5 h-5" />
                </button>
                {showDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-50 border border-gray-200">
                    <button
                      onClick={() => {
                        setShowDropdown(false);
                        navigate('/');
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <Home className="w-4 h-4 mr-2" />
                      Welcome
                    </button>
                    <button
                      onClick={() => {
                        setShowDropdown(false);
                        navigate('/dashboard');
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <LayoutDashboard className="w-4 h-4 mr-2" />
                      Dashboard
                    </button>
                    <div className="border-t border-gray-200"></div>
                    <button
                      onClick={() => {
                        setShowDropdown(false);
                        logout();
                        navigate('/login');
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search or start new chat"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#f0f2f5] text-gray-800 placeholder-gray-500 rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:bg-white transition-colors"
            />
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto bg-white">
          {filteredChats.length === 0 ? (
            <div className="text-center py-12 px-4">
              <p className="text-gray-500 text-sm">No chats found</p>
            </div>
          ) : (
            filteredChats.map((chat, index) => (
              <div
                key={`${chat.chatId}-${index}`}
                onClick={() => {
                  console.log('User manually selected chat:', chat.contactName, chat.chatId);
                  setSelectedChat(chat);
                  setUserSelectedChatId(chat.chatId);
                }}
                className={`flex items-center px-3 py-3 cursor-pointer hover:bg-[#f5f5f5] border-b border-gray-200 ${
                  selectedChat?.chatId === chat.chatId ? 'bg-[#f0f2f5]' : ''
                }`}
              >
                <div className="flex-1 min-w-0 ml-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-normal text-gray-900 truncate">
                      {chat.contactName}
                    </h3>
                    {chat.lastMessage && (
                      <span className="text-xs text-gray-500">
                        {formatChatTime(chat.lastMessage.timestamp)}
                      </span>
                    )}
                  </div>
                  {chat.lastMessage && (
                    <p className="text-sm text-gray-600 truncate mt-0.5">
                      {chat.lastMessage.direction === 'outbound' && 
                        <span className="text-gray-500">You: </span>
                      }
                      {chat.lastMessage.message}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="bg-[#ededed] px-4 py-3 flex items-center justify-between border-b border-gray-300">
              <div className="flex items-center">
                <button className="md:hidden mr-3" onClick={() => setSelectedChat(null)}>
                  <ArrowLeft className="w-6 h-6 text-gray-600" />
                </button>
                <div>
                  <h3 className="font-semibold text-gray-800">{selectedChat.contactName}</h3>
                  <p className="text-xs text-gray-600">Last seen today</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <button className="text-gray-600 hover:text-gray-800">
                  <Search className="w-5 h-5" />
                </button>
                <button className="text-gray-600 hover:text-gray-800">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Messages Area with WhatsApp Background */}
            <div 
              className="flex-1 overflow-y-auto p-4"
              style={{
                backgroundColor: '#e5ddd5',
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d5d5d5' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              }}
            >
              {messages.map((message, index) => {
                const dateHeader = formatMessageDate(
                  message.timestamp, 
                  index > 0 ? messages[index - 1].timestamp : null
                );
                
                return (
                  <React.Fragment key={message.id}>
                    {dateHeader && (
                      <div className="flex justify-center my-3">
                        <span className="bg-[#d5dfe7] text-[#54656f] text-xs px-3 py-1 rounded-full">
                          {dateHeader}
                        </span>
                      </div>
                    )}
                    <div
                      className={`flex mb-2 ${
                        message.direction === 'outbound' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-[65%] rounded-lg px-3 py-2 shadow-sm ${
                          message.direction === 'outbound'
                            ? 'bg-[#d9fdd3]'
                            : 'bg-white'
                        }`}
                      >
                        <p className="text-sm text-gray-900 whitespace-pre-wrap break-words">
                          {message.message}
                        </p>
                        <div className="flex items-center justify-end mt-1 space-x-1">
                          <span className="text-[11px] text-gray-500">
                            {formatTime(message.timestamp)}
                          </span>
                          {message.direction === 'outbound' && (
                            <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 16 15">
                              <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.064-.512zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z"/>
                            </svg>
                          )}
                        </div>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input Area */}
            <div className="bg-[#f0f2f5] px-4 py-3 flex items-center space-x-3 border-t border-gray-300">
              <button className="text-gray-600 hover:text-gray-800">
                <Smile className="w-6 h-6" />
              </button>
              <button className="text-gray-600 hover:text-gray-800">
                <Paperclip className="w-6 h-6 transform rotate-45" />
              </button>
              <div className="flex-1">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Type a message"
                  className="w-full bg-white text-gray-800 placeholder-gray-500 rounded-lg px-4 py-2.5 focus:outline-none border border-gray-300 focus:border-gray-400"
                  disabled={sending}
                />
              </div>
              {newMessage.trim() ? (
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || sending || !selectedChat}
                  className="text-[#128C7E] hover:text-[#075E54] disabled:opacity-50"
                >
                  <Send className="w-6 h-6" />
                </button>
              ) : (
                <button className="text-gray-600 hover:text-gray-800">
                  <Mic className="w-6 h-6" />
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-[#f8f9fa]">
            <div className="text-center">
              <h1 className="text-3xl text-gray-600 font-light mb-4">WhatsApp Web Clone</h1>
              <p className="text-base text-gray-600 mb-6">
                Send and receive messages without keeping your phone online.<br />
                Use WhatsApp on up to 4 linked devices and 1 phone at the same time.
              </p>
              <div className="border-t border-gray-300 pt-6">
                <p className="text-xs text-gray-500">
                  Connected to WhatsApp via Unipile API
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WhatsAppInbox;