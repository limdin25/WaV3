require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const fs = require('fs').promises;
const path = require('path');

const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'https://wa.lemlin.com'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// In-memory storage (replace with database in production)
let users = [];
let connections = [];
let messages = [];
let chats = [];

// Helper functions
const saveData = async () => {
  try {
    console.log(`Saving data: ${users.length} users, ${connections.length} connections, ${messages.length} messages, ${chats.length} chats`);
    await fs.writeFile(path.join(__dirname, 'users.json'), JSON.stringify(users, null, 2));
    await fs.writeFile(path.join(__dirname, 'connections.json'), JSON.stringify(connections, null, 2));
    await fs.writeFile(path.join(__dirname, 'messages.json'), JSON.stringify(messages, null, 2));
    await fs.writeFile(path.join(__dirname, 'chats.json'), JSON.stringify(chats, null, 2));
    console.log('Data saved successfully');
  } catch (error) {
    console.error('Error saving data:', error);
  }
};

const loadData = async () => {
  try {
    const usersData = await fs.readFile(path.join(__dirname, 'users.json'), 'utf8');
    const connectionsData = await fs.readFile(path.join(__dirname, 'connections.json'), 'utf8');
    users = JSON.parse(usersData);
    connections = JSON.parse(connectionsData);
    console.log(`Loaded ${users.length} users and ${connections.length} connections`);
  } catch (error) {
    console.log('No existing users/connections files found, starting fresh');
    users = [];
    connections = [];
  }
  
  try {
    const messagesData = await fs.readFile(path.join(__dirname, 'messages.json'), 'utf8');
    const chatsData = await fs.readFile(path.join(__dirname, 'chats.json'), 'utf8');
    messages = JSON.parse(messagesData);
    chats = JSON.parse(chatsData);
    console.log(`Loaded ${messages.length} messages and ${chats.length} chats`);
  } catch (error) {
    console.log('No existing messages/chats files found, starting fresh');
    messages = [];
    chats = [];
  }
};

// JWT middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.sendStatus(401);
  }

  jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret', (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    if (users.find(u => u.email === email)) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = {
      id: uuidv4(),
      email,
      password: hashedPassword,
      name,
      createdAt: new Date().toISOString()
    };

    users.push(user);
    await saveData();

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '24h' }
    );

    res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = users.find(u => u.email === email);

    if (!user || !await bcrypt.compare(password, user.password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '24h' }
    );

    res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// CRM OAuth Routes
app.get('/api/auth/crm', authenticateToken, async (req, res) => {
  const state = uuidv4();
  const crmAuthUrl = `https://marketplace.leadconnectorhq.com/oauth/chooselocation?response_type=code&client_id=${process.env.CRM_CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.REDIRECT_URI)}&scope=conversations.readonly+conversations.write+conversations%2Freports.readonly+conversations%2Flivechat.write+contacts.readonly+contacts.write+saas%2Flocation.read+oauth.write+oauth.readonly+locations.readonly+locations%2FcustomValues.readonly+locations%2FcustomValues.write+locations%2FcustomFields.readonly+locations%2FcustomFields.write+locations%2Ftags.readonly+locations%2Ftags.write&state=${state}`;
  
  // Store state temporarily
  connections.push({
    userId: req.user.userId,
    type: 'crm_oauth_state',
    state,
    timestamp: Date.now()
  });
  
  // Immediately save the state
  await saveData();
  
  console.log('Generated OAuth state:', state, 'for user:', req.user.userId);
  console.log('Total connections after saving:', connections.length);
  console.log('OAuth URL:', crmAuthUrl);
  
  res.json({ authUrl: crmAuthUrl });
});

app.get('/api/auth/crm/callback', async (req, res) => {
  const { code, state } = req.query;
  console.log('CRM callback received:', { code: !!code, state, allQuery: req.query });
  
  try {
    if (!code) {
      console.log('No authorization code received');
      return res.status(400).json({ error: 'No authorization code received' });
    }

    // Verify state
    const stateConnection = connections.find(c => c.state === state && c.type === 'crm_oauth_state');
    if (!stateConnection) {
      console.log('Invalid state parameter:', state);
      console.log('Available states:', connections.filter(c => c.type === 'crm_oauth_state').map(c => c.state));
      return res.status(400).json({ error: 'Invalid state parameter' });
    }

    // Exchange code for token
    const tokenParams = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: process.env.CRM_CLIENT_ID,
      client_secret: process.env.CRM_CLIENT_SECRET,
      code,
      redirect_uri: process.env.REDIRECT_URI
    });

    const tokenResponse = await axios.post('https://services.leadconnectorhq.com/oauth/token', tokenParams, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    // Extract location ID from token response
    const locationId = tokenResponse.data.locationId;

    // Save connection
    const existingConnection = connections.find(c => 
      c.userId === stateConnection.userId && c.type === 'crm'
    );

    if (existingConnection) {
      existingConnection.accessToken = tokenResponse.data.access_token;
      existingConnection.refreshToken = tokenResponse.data.refresh_token;
      existingConnection.locationId = locationId;
      existingConnection.updatedAt = new Date().toISOString();
    } else {
      connections.push({
        id: uuidv4(),
        userId: stateConnection.userId,
        type: 'crm',
        accessToken: tokenResponse.data.access_token,
        refreshToken: tokenResponse.data.refresh_token,
        locationId: locationId,
        expiresAt: new Date(Date.now() + (tokenResponse.data.expires_in * 1000)).toISOString(),
        createdAt: new Date().toISOString()
      });
    }

    // Remove state connection
    connections = connections.filter(c => c.state !== state);
    await saveData();

    // Redirect to frontend with success message
    res.redirect('http://localhost:3000/dashboard?crm_connected=true');
  } catch (error) {
    console.error('CRM OAuth error details:');
    console.error('- Status:', error.response?.status);
    console.error('- Data:', JSON.stringify(error.response?.data, null, 2));
    console.error('- Message:', error.message);
    console.error('- Stack:', error.stack);
    
    if (error.response?.status === 400) {
      return res.status(400).json({ error: error.response.data?.error || 'Invalid OAuth request' });
    }
    
    res.status(500).json({ 
      error: 'CRM authentication failed',
      details: error.response?.data || error.message 
    });
  }
});

// Unipile WhatsApp Routes
app.get('/api/whatsapp/available-accounts', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 API called: /api/whatsapp/available-accounts');
    console.log('👤 User ID:', req.user.userId);
    
    // Find completed WhatsApp connections for this user
    const whatsappConnections = connections.filter(c => 
      c.userId === req.user.userId && 
      c.type === 'whatsapp' && 
      c.status === 'connected' &&
      c.accountId
    );
    
    console.log('📱 Found WhatsApp connections:', whatsappConnections.length);
    
    // For each connection, try to get account details from Unipile API
    const accounts = [];
    
    for (const connection of whatsappConnections) {
      try {
        console.log('🔄 Fetching account details for:', connection.accountId);
        
        const response = await axios.get(`${process.env.UNIPILE_DSN}/api/v1/accounts/${connection.accountId}`, {
          headers: {
            'X-API-KEY': process.env.UNIPILE_API_KEY
          }
        });
        
        if (response.data) {
          const account = {
            id: connection.accountId,
            phoneNumber: response.data.account_configuration?.phone_number || response.data.username || 'Unknown',
            status: 'connected',
            provider: 'WHATSAPP',
            connectedAt: connection.connectedAt
          };
          
          accounts.push(account);
          console.log('✅ Added account:', account.phoneNumber);
        }
      } catch (apiError) {
        console.error('❌ Failed to fetch account details for', connection.accountId, ':', apiError.message);
        
        // Still add the account with basic info
        const account = {
          id: connection.accountId,
          phoneNumber: 'Unknown',
          status: 'connected',
          provider: 'WHATSAPP',
          connectedAt: connection.connectedAt
        };
        
        accounts.push(account);
      }
    }
    
    console.log('✅ Returning', accounts.length, 'WhatsApp accounts connected via our app');
    
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    
    return res.json({ accounts });
  } catch (error) {
    console.error('Error in available-accounts endpoint:', error);
    res.status(500).json({ error: 'Failed to fetch WhatsApp accounts' });
  }
});

app.post('/api/whatsapp/connect', authenticateToken, async (req, res) => {
  try {
    const { accountId, createNew } = req.body;

    if (accountId && !createNew) {
      // Connect to existing Unipile account
      const existingConnection = connections.find(c => 
        c.userId === req.user.userId && c.type === 'whatsapp'
      );

      if (existingConnection) {
        existingConnection.accountId = accountId;
        existingConnection.updatedAt = new Date().toISOString();
      } else {
        connections.push({
          id: uuidv4(),
          userId: req.user.userId,
          type: 'whatsapp',
          accountId: accountId,
          status: 'connected',
          createdAt: new Date().toISOString()
        });
      }

      await saveData();
      return res.json({ success: true, accountId, connected: true });
    }

    // Create new WhatsApp connection using Hosted Auth Wizard
    const expirationTime = new Date();
    expirationTime.setHours(expirationTime.getHours() + 1); // 1 hour expiration

    const authRequest = {
      type: 'create',
      providers: ['WHATSAPP'],
      api_url: process.env.UNIPILE_DSN,
      expiresOn: expirationTime.toISOString(),
      name: req.user.userId, // Use user ID as internal identifier
      notify_url: process.env.WEBHOOK_BASE_URL ? `${process.env.WEBHOOK_BASE_URL}/api/auth/unipile/callback` : undefined,
      success_redirect_url: 'http://localhost:3000/dashboard?whatsapp_connected=true',
      failure_redirect_url: 'http://localhost:3000/dashboard?whatsapp_error=true'
    };

    console.log('Creating hosted auth with request:', authRequest);

    const response = await axios.post(`${process.env.UNIPILE_DSN}/api/v1/hosted/accounts/link`, authRequest, {
      headers: {
        'X-API-KEY': process.env.UNIPILE_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    console.log('Hosted auth response:', response.data);

    // Store pending connection with auth session ID
    const sessionId = uuidv4();
    connections.push({
      id: sessionId,
      userId: req.user.userId,
      type: 'whatsapp_pending',
      authUrl: response.data.url,
      createdAt: new Date().toISOString()
    });
    
    await saveData();

    res.json({ 
      authUrl: response.data.url,
      sessionId: sessionId
    });
  } catch (error) {
    console.error('💥 Unipile hosted auth error:');
    console.error('Status:', error.response?.status);
    console.error('Data:', JSON.stringify(error.response?.data, null, 2));
    console.error('Message:', error.message);
    console.error('Full error:', error);
    
    res.status(500).json({ 
      error: 'Failed to create hosted auth link',
      details: error.response?.data || error.message 
    });
  }
});

app.get('/api/whatsapp/status/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    // Check if there's a completed connection for this session
    const connection = connections.find(c => 
      c.id === sessionId && c.userId === req.user.userId
    );

    if (!connection) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const connected = connection.type === 'whatsapp';
    
    res.json({ 
      connected,
      accountId: connection.accountId || null
    });
  } catch (error) {
    console.error('WhatsApp status check error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to check WhatsApp status' });
  }
});

// Test endpoint to verify callback URL is accessible
app.get('/api/auth/unipile/callback', (req, res) => {
  console.log('GET request to callback endpoint - URL is accessible');
  res.json({ message: 'Callback endpoint is working', timestamp: new Date().toISOString() });
});

// Unipile auth callback endpoint (for hosted auth wizard)
app.post('/api/auth/unipile/callback', express.json(), async (req, res) => {
  try {
    console.log('🎯 Unipile auth callback received!');
    console.log('📦 Callback payload:', JSON.stringify(req.body, null, 2));
    console.log('📋 Headers:', req.headers);
    
    const data = req.body;
    
    if (data.status === 'CREATION_SUCCESS') {
      console.log('✅ Account creation successful!');
      console.log('👤 User ID:', data.name);
      console.log('🆔 Account ID:', data.account_id);
      
      // Find pending connection by user ID (stored as 'name' in auth request)
      const pendingConnection = connections.find(c => 
        c.userId === data.name && 
        c.type === 'whatsapp_pending'
      );

      console.log('🔍 Found pending connection:', !!pendingConnection);

      if (pendingConnection) {
        // Update connection to completed
        pendingConnection.type = 'whatsapp';
        pendingConnection.accountId = data.account_id;
        pendingConnection.status = 'connected';
        pendingConnection.connectedAt = new Date().toISOString();
        delete pendingConnection.authUrl;
        
        await saveData();
        console.log('💾 WhatsApp account connected and saved:', data.account_id);
      } else {
        console.log('❌ No pending connection found for user:', data.name);
        console.log('📋 Current connections:', connections.filter(c => c.type === 'whatsapp_pending'));
      }
    } else {
      console.log('❌ Callback status:', data.status);
    }

    // Set CORS headers for the callback
    res.set({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST',
      'Access-Control-Allow-Headers': 'Content-Type'
    });

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('💥 Unipile auth callback error:', error);
    res.status(500).json({ error: 'Callback processing failed' });
  }
});

// Connection Status Routes
app.get('/api/connections', authenticateToken, (req, res) => {
  // Add cache-busting headers
  res.set({
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });

  const userConnections = connections.filter(c => 
    c.userId === req.user.userId && 
    ['crm', 'whatsapp'].includes(c.type)
  );

  const connectionStatus = {
    crm: userConnections.find(c => c.type === 'crm') || null,
    whatsapp: userConnections.find(c => c.type === 'whatsapp') || null
  };

  res.json(connectionStatus);
});

app.delete('/api/connections/:type', authenticateToken, async (req, res) => {
  try {
    const { type } = req.params;
    
    connections = connections.filter(c => 
      !(c.userId === req.user.userId && c.type === type)
    );
    
    await saveData();
    res.json({ success: true, message: `${type} disconnected successfully` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to disconnect' });
  }
});

// WhatsApp Inbox Routes
app.get('/api/whatsapp/chats', authenticateToken, async (req, res) => {
  try {
    const userConnection = connections.find(c => 
      c.userId === req.user.userId && c.type === 'whatsapp'
    );

    if (!userConnection) {
      return res.status(404).json({ error: 'WhatsApp not connected' });
    }

    // Get chats for this user's WhatsApp account
    const userChats = chats.filter(c => c.accountId === userConnection.accountId)
      .map(chat => ({
        ...chat,
        lastMessage: messages
          .filter(m => m.chatId === chat.chatId)
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0] || null
      }))
      .sort((a, b) => {
        const aTime = a.lastMessage ? new Date(a.lastMessage.timestamp) : new Date(a.createdAt);
        const bTime = b.lastMessage ? new Date(b.lastMessage.timestamp) : new Date(b.createdAt);
        return bTime - aTime;
      });

    res.json(userChats);
  } catch (error) {
    console.error('Error fetching chats:', error);
    res.status(500).json({ error: 'Failed to fetch chats' });
  }
});

app.get('/api/whatsapp/chats/:chatId/messages', authenticateToken, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const userConnection = connections.find(c => 
      c.userId === req.user.userId && c.type === 'whatsapp'
    );

    if (!userConnection) {
      return res.status(404).json({ error: 'WhatsApp not connected' });
    }

    // Verify chat belongs to user
    const chat = chats.find(c => 
      c.chatId === chatId && c.accountId === userConnection.accountId
    );

    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    // Get messages for this chat
    const chatMessages = messages
      .filter(m => m.chatId === chatId)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(Number(offset), Number(offset) + Number(limit));

    res.json({
      messages: chatMessages,
      total: messages.filter(m => m.chatId === chatId).length
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

app.post('/api/whatsapp/send', authenticateToken, async (req, res) => {
  try {
    const { chatId, message } = req.body;
    console.log(`📤 Sending message to chatId: ${chatId}, contact: ${chats.find(c => c.chatId === chatId)?.contactName || 'Unknown'}`);
    console.log(`📤 Message: "${message}"`);

    // Find the correct WhatsApp account for this chat
    const chat = chats.find(c => c.chatId === chatId);
    if (!chat) {
      console.error(`❌ Chat not found for chatId: ${chatId}`);
      return res.status(404).json({ error: 'Chat not found' });
    }

    const userConnection = connections.find(c => 
      c.userId === req.user.userId && c.type === 'whatsapp' && c.accountId === chat.accountId
    );

    if (!userConnection) {
      console.error(`❌ WhatsApp account not connected for chat: ${chatId}, accountId: ${chat.accountId}`);
      return res.status(404).json({ error: 'WhatsApp account not connected for this chat' });
    }

    console.log(`🔗 Using account: ${userConnection.accountId} for chat: ${chat.contactName}`);

    // Send message via Unipile API
    const response = await axios.post(`${process.env.UNIPILE_DSN}/api/v1/chats/${chatId}/messages`, {
      text: message
    }, {
      headers: {
        'X-API-KEY': process.env.UNIPILE_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    // Store sent message locally
    const messageData = {
      id: uuidv4(),
      messageId: response.data.message_id || uuidv4(),
      chatId,
      accountId: userConnection.accountId,
      message,
      direction: 'outbound',
      sender: {
        attendee_name: 'You',
        attendee_id: userConnection.accountId
      },
      timestamp: new Date().toISOString(),
      status: 'sent'
    };

    messages.push(messageData);
    await saveData();

    // Also forward to CRM if connected
    const crmConnection = connections.find(c => 
      c.userId === req.user.userId && c.type === 'crm'
    );

    // Removed CRM forwarding as it was causing issues

    console.log(`✅ Message sent successfully to ${chat.contactName}`);
    res.json({ success: true, message: messageData });
  } catch (error) {
    console.error(`❌ Error sending message to ${chatId}:`);
    console.error('- Status:', error.response?.status);
    console.error('- Error data:', JSON.stringify(error.response?.data, null, 2));
    console.error('- Error message:', error.message);
    
    res.status(500).json({ 
      error: 'Failed to send message',
      details: error.response?.data || error.message 
    });
  }
});

app.get('/api/whatsapp/sync', authenticateToken, async (req, res) => {
  try {
    const userConnections = connections.filter(c => 
      c.userId === req.user.userId && c.type === 'whatsapp'
    );

    if (userConnections.length === 0) {
      return res.status(404).json({ error: 'WhatsApp not connected' });
    }

    let totalSyncedCount = 0;

    // Sync messages from each connected account
    for (const userConnection of userConnections) {
      // Get all chats for this account
      const accountChats = chats.filter(c => c.accountId === userConnection.accountId);
      
      // Sync messages for each chat
      for (const chat of accountChats) {
        try {
          const response = await axios.get(`${process.env.UNIPILE_DSN}/api/v1/chats/${chat.chatId}/messages`, {
            headers: {
              'X-API-KEY': process.env.UNIPILE_API_KEY
            },
            params: {
              limit: 20 // Get recent messages only
            }
          });

          const newMessages = response.data.items || [];

          for (const msg of newMessages) {
            // Check if message already exists  
            const existingMessage = messages.find(m => m.messageId === msg.id);
            if (existingMessage) continue;

            // Store message
            const messageData = {
              id: uuidv4(),
              messageId: msg.id,
              chatId: chat.chatId,
              accountId: userConnection.accountId,
              message: msg.text || '',
              direction: msg.is_sender ? 'outbound' : 'inbound',
              sender: {
                attendee_name: msg.is_sender ? userConnection.accountId : chat.contactName,
                attendee_id: msg.sender_id || 'unknown'
              },
              timestamp: msg.timestamp,
              attachments: msg.attachments || []
            };

            messages.push(messageData);
            totalSyncedCount++;
          }
        } catch (chatError) {
          console.error(`Error syncing chat ${chat.chatId}:`, chatError.message);
        }
      }
    }

    await saveData();

    res.json({ 
      success: true, 
      syncedCount: totalSyncedCount,
      totalMessages: messages.length 
    });
  } catch (error) {
    console.error('Error syncing messages:', error);
    res.status(500).json({ 
      error: 'Failed to sync messages',
      details: error.response?.data || error.message 
    });
  }
});

// Webhook Routes
app.post('/api/webhooks/unipile', express.json(), async (req, res) => {
  try {
    console.log('Unipile webhook received:', req.body);
    console.log('🔍 Current connections in memory:', connections.length);
    console.log('🔍 Connection account IDs:', connections.map(c => c.accountId));
    
    // Process Unipile webhook
    const data = req.body;
    
    if (data.type === 'MESSAGE') {
      console.log('📨 Processing MESSAGE webhook');
      // Find user connection
      const connection = connections.find(c => c.accountId === data.account_id);
      if (!connection) {
        console.log('❌ Connection not found for account ID:', data.account_id);
        return res.status(404).json({ error: 'Connection not found' });
      }
      console.log('✅ Found connection for user:', connection.userId);

      // Check if message already exists
      const existingMessage = messages.find(m => m.messageId === data.message_id);
      if (!existingMessage) {
        console.log('💬 New message detected:', data.message);
        // Create chat if it doesn't exist
        let chat = chats.find(c => c.chatId === data.chat_id);
        if (!chat) {
          chat = {
            id: uuidv4(),
            chatId: data.chat_id,
            accountId: data.account_id,
            contactName: data.sender?.attendee_name || 'Unknown Contact',
            createdAt: new Date().toISOString()
          };
          chats.push(chat);
        }

        // Store message
        const messageData = {
          id: uuidv4(),
          messageId: data.message_id,
          chatId: data.chat_id,
          accountId: data.account_id,
          message: data.message,
          direction: 'inbound',
          sender: data.sender,
          timestamp: data.timestamp,
          attachments: data.attachments || []
        };

        messages.push(messageData);
        console.log('📝 Message added to array. Total messages:', messages.length);
        await saveData();
        
        // Forward inbound message to GHL if CRM is connected
        try {
          const crmConnection = connections.find(c => 
            c.userId === connection.userId && c.type === 'crm'
          );
          
          if (crmConnection) {
            console.log('📨 Forwarding inbound message to GHL conversation provider');
            await forwardInboundToGHL(messageData, crmConnection);
          }
        } catch (ghlError) {
          console.error('❌ GHL forwarding error (non-critical):', ghlError.message);
          // Don't fail the webhook, just log the error
        }
        console.log('💾 Data saved after webhook message');
      }

      // Get CRM connection for the same user
      const crmConnection = connections.find(c => 
        c.userId === connection.userId && c.type === 'crm'
      );

      if (crmConnection) {
        // Forward message to CRM
        await forwardMessageToCRM({
          body: data.message,
          sender: data.sender,
          chat_id: data.chat_id,
          direction: 'inbound'
        }, crmConnection);
      }
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Unipile webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

app.post('/api/webhooks/crm', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    console.log('CRM webhook received:', req.body);
    
    // Process CRM webhook
    const data = JSON.parse(req.body);
    
    if (data.type === 'ConversationProviderMessageAdded') {
      // Find user connection by location ID
      const crmConnection = connections.find(c => c.locationId === data.locationId);
      if (!crmConnection) {
        return res.status(404).json({ error: 'Connection not found' });
      }

      // Get WhatsApp connection for the same user
      const whatsappConnection = connections.find(c => 
        c.userId === crmConnection.userId && c.type === 'whatsapp'
      );

      if (whatsappConnection) {
        // Forward message to WhatsApp
        await forwardMessageToWhatsApp(data, whatsappConnection);
      }
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('CRM webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Conversation Provider Webhook - Handle outbound messages from GHL
app.post('/api/webhooks/conversation-provider', express.json(), async (req, res) => {
  try {
    console.log('🎯 Conversation Provider webhook received:', JSON.stringify(req.body, null, 2));
    
    const data = req.body;
    
    // Handle GHL webhook validation - respond with 200 for validation requests
    if (!data || Object.keys(data).length === 0 || data.test) {
      console.log('✅ Webhook validation request - responding with success');
      return res.status(200).json({ 
        received: true, 
        status: 'validated',
        provider: 'LeWhatsApp'
      });
    }
    
    // Validate required fields according to GHL conversation provider webhook structure
    if (!data.contactId || !data.locationId || !data.message) {
      console.error('❌ Missing required fields in conversation provider webhook');
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Extract message details
    const { contactId, locationId, messageId, type, message, phone, userId } = data;
    
    console.log(`📤 Processing outbound ${type} message to phone: ${phone}`);
    console.log(`📝 Message: ${message}`);
    
    // Use the primary WhatsApp account for +447863992303 (ending in 303)
    // Based on your setup, this should be account: 6EeLOpVOTEmFNiaTyIt1HQ
    const primaryWhatsAppAccount = '6EeLOpVOTEmFNiaTyIt1HQ';
    
    console.log(`📱 Using primary WhatsApp account: ${primaryWhatsAppAccount} for +447863992303`);
    
    // Send message via Unipile to WhatsApp
    await sendMessageViaUnipile(primaryWhatsAppAccount, phone, message);
    
    // Respond to GHL that message was received and processed
    res.status(200).json({ 
      received: true, 
      messageId: messageId,
      status: 'sent',
      provider: 'LeWhatsApp'
    });
    
  } catch (error) {
    console.error('❌ Conversation Provider webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// GET endpoint for webhook validation (some services check this)
app.get('/api/webhooks/conversation-provider', (req, res) => {
  console.log('🎯 Conversation Provider webhook GET validation');
  res.status(200).json({ 
    status: 'active',
    provider: 'LeWhatsApp',
    webhook: 'conversation-provider',
    methods: ['POST']
  });
});

// Auto-sync function that runs continuously
const autoSyncMessages = async () => {
  try {
    // Get all active WhatsApp connections
    const whatsappConnections = connections.filter(c => 
      c.type === 'whatsapp' && c.status === 'connected' && c.accountId
    );

    if (whatsappConnections.length === 0) {
      return; // No connections to sync
    }

    let totalSyncedCount = 0;

    // Sync messages from each connected account
    for (const userConnection of whatsappConnections) {
      // Get all chats for this account
      const accountChats = chats.filter(c => c.accountId === userConnection.accountId);
      
      // Sync messages for each chat (limit to recent chats to avoid overload)
      const recentChats = accountChats.slice(0, 10); // Only sync 10 most recent chats
      
      for (const chat of recentChats) {
        try {
          const response = await axios.get(`${process.env.UNIPILE_DSN}/api/v1/chats/${chat.chatId}/messages`, {
            headers: {
              'X-API-KEY': process.env.UNIPILE_API_KEY
            },
            params: {
              limit: 5 // Get only 5 most recent messages to reduce load
            }
          });

          const newMessages = response.data.items || [];

          for (const msg of newMessages) {
            // Check if message already exists  
            const existingMessage = messages.find(m => m.messageId === msg.id);
            if (existingMessage) continue;

            // Store message
            const messageData = {
              id: uuidv4(),
              messageId: msg.id,
              chatId: chat.chatId,
              accountId: userConnection.accountId,
              message: msg.text || '',
              direction: msg.is_sender ? 'outbound' : 'inbound',
              sender: {
                attendee_name: msg.is_sender ? userConnection.accountId : chat.contactName,
                attendee_id: msg.sender_id || 'unknown'
              },
              timestamp: msg.timestamp,
              attachments: msg.attachments || []
            };

            messages.push(messageData);
            totalSyncedCount++;
            
            // Skip inbound forwarding for now - it was causing issues
          }
        } catch (chatError) {
          // Skip failed chats but don't log to avoid spam
          if (chatError.response?.status !== 404) {
            console.error(`Error syncing chat ${chat.chatId}:`, chatError.message);
          }
        }
      }
    }

    // Only save if we actually synced new messages
    if (totalSyncedCount > 0) {
      await saveData();
      console.log(`🔄 Auto-synced ${totalSyncedCount} new messages`);
    }
    
    // Log every 30 seconds to show auto-sync is working
    if (Date.now() % 30000 < 1000) {
      console.log(`🔄 Auto-sync running... (${whatsappConnections.length} accounts, ${messages.length} total messages)`);
    }
  } catch (error) {
    console.error('Auto-sync error:', error.message);
  }
};

// Helper function to find or create contact in GHL
const findOrCreateContact = async (unipileMessage, crmConnection) => {
  try {
    console.log('📨 Attempting to forward message to GHL CRM...');
    
    // First, we need to find or create a contact in GHL
    const contact = await findOrCreateContactByPhone(unipileMessage.from || unipileMessage.phone, crmConnection);
    if (!contact) {
      console.error('❌ Failed to create/find contact in CRM');
      return;
    }

    // DEPRECATED: Try multiple approaches to send message to GHL  
    console.log('🔄 Trying approach 1: Livechat message endpoint...');
    
    try {
      // Approach 1: Use SMS type for inbound messages (not custom provider)
      const response1 = await axios.post(
        `https://services.leadconnectorhq.com/conversations/messages`,
        {
          type: 'SMS',
          contactId: contact.id,
          locationId: crmConnection.locationId,
          message: unipileMessage.body
        },
        {
          headers: {
            Authorization: `Bearer ${crmConnection.accessToken}`,
            'Version': '2021-07-28',
            'Content-Type': 'application/json'
          }
        }
      );
      console.log('✅ Message forwarded to CRM successfully (approach 1):', response1.data?.id);
      return;
    } catch (error1) {
      console.log('❌ Approach 1 failed:', error1.response?.status, error1.response?.data?.message);
      
      // Approach 1B: Try with different message type
      console.log('🔄 Trying approach 1B: Direct message send...');
      
      try {
        const response1b = await axios.post(
          `https://services.leadconnectorhq.com/conversations/messages`,
          {
            type: 'SMS',
            contactId: contact.id,
            locationId: crmConnection.locationId,
            message: unipileMessage.body
          },
          {
            headers: {
              Authorization: `Bearer ${crmConnection.accessToken}`,
              'Version': '2021-07-28',
              'Content-Type': 'application/json'
            }
          }
        );
        console.log('✅ Message forwarded to CRM successfully (approach 1B):', response1b.data?.id);
        return;
      } catch (error1b) {
        console.log('❌ Approach 1B failed:', error1b.response?.status, error1b.response?.data?.message);
      }
      
      // Approach 2: Get existing conversation, then add message
      console.log('🔄 Trying approach 2: Get existing conversation...');
      
      try {
        // First get conversations for this contact
        const convListResponse = await axios.get(
          `https://services.leadconnectorhq.com/conversations/search`,
          {
            headers: {
              Authorization: `Bearer ${crmConnection.accessToken}`,
              'Version': '2021-07-28'
            },
            params: {
              contactId: contact.id,
              locationId: crmConnection.locationId,
              limit: 10
            }
          }
        );
        
        let conversationId = null;
        if (convListResponse.data?.conversations && convListResponse.data.conversations.length > 0) {
          conversationId = convListResponse.data.conversations[0].id;
          console.log('✅ Found existing conversation:', conversationId);
        } else {
          // Create new conversation if none exists
          console.log('📝 Creating new conversation...');
          const convResponse = await axios.post(
            `https://services.leadconnectorhq.com/conversations/`,
            {
              contactId: contact.id,
              locationId: crmConnection.locationId,
              lastMessageType: 'TYPE_SMS'
            },
            {
              headers: {
                Authorization: `Bearer ${crmConnection.accessToken}`,
                'Version': '2021-07-28',
                'Content-Type': 'application/json'
              }
            }
          );
          conversationId = convResponse.data?.conversation?.id;
          console.log('✅ Created new conversation:', conversationId);
        }
        
        if (conversationId) {
          // Now add message to conversation using conversation-specific endpoint
          const messageResponse = await axios.post(
            `https://services.leadconnectorhq.com/conversations/${conversationId}/messages`,
            {
              type: 'SMS',
              message: unipileMessage.body,
              direction: unipileMessage.direction || 'inbound'
            },
            {
              headers: {
                Authorization: `Bearer ${crmConnection.accessToken}`,
                'Version': '2021-07-28',
                'Content-Type': 'application/json'
              }
            }
          );
          console.log('✅ Message forwarded to CRM successfully (approach 2):', messageResponse.data?.id);
          return;
        }
      } catch (error2) {
        console.log('❌ Approach 2 failed:', error2.response?.status, error2.response?.data?.message);
        
        // Approach 3: Try the documented inbound message endpoint with proper format
        console.log('🔄 Trying approach 3: Documented inbound message endpoint...');
        
        try {
          const response3 = await axios.post(
            `https://services.leadconnectorhq.com/conversations/messages/inbound`,
            {
              type: 'SMS',
              contactId: contact.id,
              locationId: crmConnection.locationId,
              message: unipileMessage.body,
              provider: 'whatsapp',
              from: unipileMessage.sender?.attendee_name || '+447863992555'
            },
            {
              headers: {
                Authorization: `Bearer ${crmConnection.accessToken}`,
                'Version': '2021-07-28',
                'Content-Type': 'application/json'
              }
            }
          );
          console.log('✅ Message forwarded to CRM successfully (approach 3):', response3.data?.id);
          return;
        } catch (error3) {
          console.log('❌ Approach 3 failed:', error3.response?.status, error3.response?.data?.message);
          
          // Approach 4: Try with conversation-specific inbound endpoint
          console.log('🔄 Trying approach 4: Conversation-specific inbound endpoint...');
          
          try {
            // First get the conversation again for approach 4
            const convListResponse4 = await axios.get(
              `https://services.leadconnectorhq.com/conversations/search`,
              {
                headers: {
                  Authorization: `Bearer ${crmConnection.accessToken}`,
                  'Version': '2021-07-28'
                },
                params: {
                  contactId: contact.id,
                  locationId: crmConnection.locationId,
                  limit: 10
                }
              }
            );
            
            if (convListResponse4.data?.conversations && convListResponse4.data.conversations.length > 0) {
              const conversationId = convListResponse4.data.conversations[0].id;
              
              const response4 = await axios.post(
                `https://services.leadconnectorhq.com/conversations/${conversationId}/messages/inbound`,
                {
                  type: 'SMS',
                  message: unipileMessage.body,
                  provider: 'whatsapp',
                  from: unipileMessage.sender?.attendee_name || '+447863992555'
                },
                {
                  headers: {
                    Authorization: `Bearer ${crmConnection.accessToken}`,
                    'Version': '2021-07-28',
                    'Content-Type': 'application/json'
                  }
                }
              );
              console.log('✅ Message forwarded to CRM successfully (approach 4):', response4.data?.id);
              return;
            }
          } catch (error4) {
            console.log('❌ Approach 4 failed:', error4.response?.status, error4.response?.data?.message);
            // Approach 5: Try simple message creation with correct format
            console.log('🔄 Trying approach 5: Simple message creation...');
            
            try {
              const response5 = await axios.post(
                `https://services.leadconnectorhq.com/conversations/messages`,
                {
                  type: 'WhatsApp',
                  contactId: contact.id,
                  locationId: crmConnection.locationId,
                  message: unipileMessage.body,
                  direction: 'inbound'
                },
                {
                  headers: {
                    Authorization: `Bearer ${crmConnection.accessToken}`,
                    'Version': '2021-07-28',
                    'Content-Type': 'application/json'
                  }
                }
              );
              console.log('✅ Message forwarded to CRM successfully (approach 5):', response5.data?.id);
              return;
            } catch (error5) {
              console.log('❌ Approach 5 failed:', error5.response?.status, error5.response?.data?.message);
              console.error('❌ All approaches failed to forward message to CRM');
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('❌ Error in forwardMessageToCRM:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
  }
};


// Helper function to extract phone number from message
const extractPhoneNumber = (unipileMessage) => {
  // Try to extract from sender info
  if (unipileMessage.sender?.attendee_name) {
    const phoneMatch = unipileMessage.sender.attendee_name.match(/\+?[\d\s\-\(\)]+/);
    if (phoneMatch) {
      let phone = phoneMatch[0].replace(/[\s\-\(\)]/g, '');
      // Ensure phone starts with +
      if (!phone.startsWith('+')) {
        phone = '+' + phone;
      }
      return phone;
    }
  }
  
  // Try to get from chat name (contact name might contain phone)
  const chat = chats.find(c => c.chatId === unipileMessage.chat_id);
  if (chat?.contactName) {
    const phoneMatch = chat.contactName.match(/\+?[\d\s\-\(\)]+/);
    if (phoneMatch) {
      let phone = phoneMatch[0].replace(/[\s\-\(\)]/g, '');
      if (!phone.startsWith('+')) {
        phone = '+' + phone;
      }
      return phone;
    }
  }
  
  console.log('⚠️ Could not extract phone number from:', {
    senderName: unipileMessage.sender?.attendee_name,
    chatName: chat?.contactName
  });
  return null;
};

const forwardMessageToWhatsApp = async (crmMessage, whatsappConnection) => {
  try {
    const response = await axios.post(
      `${process.env.UNIPILE_DSN}/api/v1/messages`,
      {
        account_id: whatsappConnection.accountId,
        text: crmMessage.body,
        chat_id: crmMessage.contactId
      },
      {
        headers: {
          'X-API-KEY': process.env.UNIPILE_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log('Message forwarded to WhatsApp:', response.data);
  } catch (error) {
    console.error('Error forwarding to WhatsApp:', error.response?.data || error.message);
  }
};

// Test GHL API endpoint
// Function to send messages via Unipile (GHL → WhatsApp)
const sendMessageViaUnipile = async (accountId, toPhone, message) => {
  try {
    console.log(`📤 Sending message via Unipile to ${toPhone}:`);
    console.log(`📱 Account ID: ${accountId}`);
    console.log(`💬 Message: ${message}`);
    
    // First, find an existing chat for this phone number or use the first available chat
    const existingChat = chats.find(c => c.contactName.includes(toPhone) || c.chatId.includes(toPhone.replace(/\+/g, '')));
    const chatId = existingChat ? existingChat.chatId : chats[0]?.chatId;
    
    if (!chatId) {
      throw new Error('No available chat found to send message');
    }
    
    console.log(`📱 Using chat ID: ${chatId} for phone: ${toPhone}`);
    
    // Send message via Unipile API (using the same pattern as existing code)
    const response = await axios.post(`${process.env.UNIPILE_DSN}/api/v1/chats/${chatId}/messages`, {
      text: message
    }, {
      headers: {
        'X-API-KEY': process.env.UNIPILE_API_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Message sent successfully via Unipile:', response.data?.id);
    
    // Store the sent message in our database
    const messageData = {
      id: `ghl-out-${Date.now()}`,
      chat_id: `chat-${toPhone.replace(/\+/g, '')}`,
      account_id: accountId,
      direction: 'outbound',
      type: 'text',
      text: message,
      sender: { attendee_name: '+447863992303' }, // Our WhatsApp number
      receiver: { attendee_name: toPhone },
      timestamp: new Date().toISOString(),
      source: 'ghl-conversation-provider'
    };
    
    messages.push(messageData);
    
    // Update or create chat record
    let chat = chats.find(c => c.chatId.includes(toPhone.replace(/\+/g, '')));
    if (!chat) {
      chat = {
        id: `chat-${toPhone.replace(/\+/g, '')}`,
        chatId: `chat-${toPhone.replace(/\+/g, '')}`,
        contactName: toPhone,
        accountId: accountId,
        lastMessage: message,
        lastMessageTime: new Date().toISOString()
      };
      chats.push(chat);
    } else {
      chat.lastMessage = message;
      chat.lastMessageTime = new Date().toISOString();
    }
    
    await saveData();
    console.log('💾 Outbound message saved to database');
    
    return response.data;
    
  } catch (error) {
    console.error('❌ Error sending message via Unipile:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    throw error;
  }
};

// Forward inbound messages to GHL using the conversation provider pattern
const forwardInboundToGHL = async (messageData, crmConnection) => {
  try {
    // Extract phone number from sender
    const senderPhone = messageData.sender?.attendee_id?.replace('@s.whatsapp.net', '') || 
                       messageData.sender?.attendee_name || '';
    
    if (!senderPhone || !messageData.message) {
      console.log('⚠️ Skipping GHL forward - missing phone or message');
      return;
    }
    
    // Format phone number
    const formattedPhone = senderPhone.startsWith('+') ? senderPhone : `+${senderPhone}`;
    
    console.log(`📤 Forwarding to GHL from ${formattedPhone}: ${messageData.message}`);
    
    // Use the GHL REST API to create an inbound message
    const response = await axios.post(
      'https://services.leadconnectorhq.com/conversations/messages',
      {
        type: 'WhatsApp',
        contactPhone: formattedPhone,
        locationId: crmConnection.locationId,
        body: messageData.message,
        direction: 'inbound',
        source: 'LeWhatsApp'
      },
      {
        headers: {
          Authorization: `Bearer ${crmConnection.accessToken}`,
          'Version': '2021-07-28',
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Message forwarded to GHL successfully');
    return response.data;
    
  } catch (error) {
    // Log but don't throw - we don't want to break the main flow
    console.error('❌ GHL forward failed:', error.response?.status, error.response?.data?.message);
    return null;
  }
};

app.post('/api/test/ghl', authenticateToken, async (req, res) => {
  try {
    const crmConnection = connections.find(c => 
      c.userId === req.user.userId && c.type === 'crm'
    );

    if (!crmConnection) {
      return res.status(404).json({ error: 'CRM not connected' });
    }

    // Test message
    const testMessage = {
      body: 'Test message from WhatsApp integration',
      sender: { attendee_name: '+447863992555' },
      chat_id: 'test',
      direction: 'inbound'
    };

    await forwardMessageToCRM(testMessage, crmConnection);
    res.json({ success: true, message: 'Test message sent to GHL' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Test endpoint for conversation provider (outbound messaging)
app.post('/api/test/conversation-provider', async (req, res) => {
  try {
    console.log('🧪 Testing conversation provider webhook...');
    
    // Simulate a GHL conversation provider webhook payload
    const testPayload = {
      contactId: '8rJKAFS1msj97eJFgAqz', // Existing contact ID from our tests
      locationId: '5ej8HwhFeEuUuFyrIeLO', // Our GHL location ID
      messageId: `test-msg-${Date.now()}`,
      type: 'SMS',
      message: 'Test message from GHL via LeWhatsApp provider!',
      phone: '+447863992303', // The phone number to send to
      userId: 'e4f743e3-0114-4ab6-921c-6b62d2a24683' // Our user ID
    };
    
    // Send to our conversation provider webhook
    const response = await axios.post('http://localhost:5001/api/webhooks/conversation-provider', testPayload, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    console.log('✅ Conversation provider test completed:', response.data);
    res.json({ 
      success: true, 
      message: 'Conversation provider test sent',
      response: response.data 
    });
    
  } catch (error) {
    console.error('❌ Conversation provider test failed:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: 'FIXED_WHATSAPP_ACCOUNTS_v2' 
  });
});

// Initialize data
console.log('🚀 Starting server and loading data...');
loadData().then(async () => {
  console.log('✅ Data loading completed');
  
  // Check GHL integration status
  const crmConnection = connections.find(c => c.type === 'crm');
  if (crmConnection) {
    console.log('✅ GHL CRM connected with location:', crmConnection.locationId);
    
    // Check OAuth scopes
    try {
      const tokenParts = crmConnection.accessToken.split('.');
      const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
      const scopes = payload.oauthMeta?.scopes || [];
      
      const requiredScopes = ['conversations.write', 'conversations/message.write'];
      const hasRequiredScopes = requiredScopes.every(scope => 
        scopes.some(s => s.includes('message.write') || s === 'conversations.write')
      );
      
      if (hasRequiredScopes) {
        console.log('✅ GHL OAuth scopes are configured for message forwarding');
      } else {
        console.log('⚠️  GHL OAuth scopes missing - please reconnect CRM with message.write permissions');
        console.log('📋 Current scopes:', scopes.join(', '));
      }
    } catch (error) {
      console.log('⚠️  Could not verify GHL OAuth scopes');
    }
  } else {
    console.log('❌ No GHL CRM connection found');
  }
  
  // Start automatic message sync every second for real-time updates
  console.log('🔄 Starting automatic message sync...');
  setInterval(async () => {
    await autoSyncMessages();
  }, 1000); // Every 1 second for instant updates
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});