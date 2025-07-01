const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Configuration
const UNIPILE_API_KEY = 'eF29AnEd.7L/OKodQMCsqhYEmVgI3Zd1zBCSefq5uCFqjX5w66v4=';
const UNIPILE_BASE_URL = 'https://api15.unipile.com:14507';

// Data storage
let users = [];
let connections = [];
let chats = [];
let messages = [];

// Load existing data
const loadData = async () => {
  try {
    const usersData = await fs.readFile(path.join(__dirname, 'users.json'), 'utf8');
    users = JSON.parse(usersData);
    console.log(`Loaded ${users.length} users`);
  } catch (error) {
    console.log('No existing users file found, starting fresh');
    users = [];
  }

  try {
    const connectionsData = await fs.readFile(path.join(__dirname, 'connections.json'), 'utf8');
    connections = JSON.parse(connectionsData);
    console.log(`Loaded ${connections.length} connections`);
  } catch (error) {
    console.log('No existing connections file found, starting fresh');
    connections = [];
  }

  try {
    const chatsData = await fs.readFile(path.join(__dirname, 'chats.json'), 'utf8');
    chats = JSON.parse(chatsData);
    console.log(`Loaded ${chats.length} chats`);
  } catch (error) {
    console.log('No existing chats file found, starting fresh');
    chats = [];
  }

  try {
    const messagesData = await fs.readFile(path.join(__dirname, 'messages.json'), 'utf8');
    messages = JSON.parse(messagesData);
    console.log(`Loaded ${messages.length} messages`);
  } catch (error) {
    console.log('No existing messages file found, starting fresh');
    messages = [];
  }
};

// Save data to files
const saveData = async () => {
  try {
    await fs.writeFile(path.join(__dirname, 'users.json'), JSON.stringify(users, null, 2));
    await fs.writeFile(path.join(__dirname, 'connections.json'), JSON.stringify(connections, null, 2));
    await fs.writeFile(path.join(__dirname, 'chats.json'), JSON.stringify(chats, null, 2));
    await fs.writeFile(path.join(__dirname, 'messages.json'), JSON.stringify(messages, null, 2));
    console.log(`✅ Data saved: ${users.length} users, ${connections.length} connections, ${chats.length} chats, ${messages.length} messages`);
  } catch (error) {
    console.error('❌ Error saving data:', error);
  }
};

// Get connected WhatsApp accounts
const getConnectedAccounts = async () => {
  try {
    const response = await axios.get(`${UNIPILE_BASE_URL}/api/v1/accounts?providers=WHATSAPP`, {
      headers: { 'X-API-KEY': UNIPILE_API_KEY }
    });
    
    // Filter for accounts with OK status
    const okAccounts = response.data.items.filter(account => 
      account.sources.some(source => source.status === 'OK')
    );
    
    console.log(`🔍 Found ${okAccounts.length} working WhatsApp accounts`);
    return okAccounts;
  } catch (error) {
    console.error('❌ Error fetching accounts:', error);
    return [];
  }
};

// Get chats for an account
const getChatsForAccount = async (accountId) => {
  try {
    const response = await axios.get(`${UNIPILE_BASE_URL}/api/v1/chats?account_id=${accountId}&limit=50`, {
      headers: { 'X-API-KEY': UNIPILE_API_KEY }
    });
    
    console.log(`📱 Found ${response.data.items.length} chats for account ${accountId}`);
    return response.data.items;
  } catch (error) {
    console.error(`❌ Error fetching chats for account ${accountId}:`, error.message);
    return [];
  }
};

// Get messages for a chat
const getMessagesForChat = async (chatId) => {
  try {
    const response = await axios.get(`${UNIPILE_BASE_URL}/api/v1/chats/${chatId}/messages?limit=100`, {
      headers: { 'X-API-KEY': UNIPILE_API_KEY }
    });
    
    console.log(`💬 Found ${response.data.items.length} messages for chat ${chatId}`);
    return response.data.items;
  } catch (error) {
    console.error(`❌ Error fetching messages for chat ${chatId}:`, error.message);
    return [];
  }
};

// Extract contact name from chat
const extractContactName = (chat) => {
  if (chat.name) {
    return chat.name;
  }
  
  // Extract phone number from provider_id
  const providerId = chat.provider_id || chat.attendee_provider_id;
  if (providerId) {
    const phoneMatch = providerId.match(/(\d+)@/);
    if (phoneMatch) {
      return `+${phoneMatch[1]}`;
    }
  }
  
  return 'Unknown Contact';
};

// Sync all data from Unipile
const syncFromUnipile = async () => {
  console.log('🚀 Starting Unipile sync...');
  
  await loadData();
  
  // Get all connected WhatsApp accounts
  const accounts = await getConnectedAccounts();
  
  let totalChatsProcessed = 0;
  let totalMessagesProcessed = 0;
  
  for (const account of accounts) {
    console.log(`\n📱 Processing account: ${account.name} (${account.id})`);
    
    // Get chats for this account
    const accountChats = await getChatsForAccount(account.id);
    
    for (const chat of accountChats) {
      const contactName = extractContactName(chat);
      
      // Check if chat already exists
      const existingChat = chats.find(c => c.chatId === chat.id);
      if (!existingChat) {
        // Add new chat
        const newChat = {
          id: uuidv4(),
          chatId: chat.id,
          accountId: account.id,
          contactName: contactName,
          createdAt: new Date().toISOString()
        };
        chats.push(newChat);
        console.log(`  ➕ Added chat: ${contactName} (${chat.id})`);
      }
      
      totalChatsProcessed++;
      
      // Get messages for this chat
      const chatMessages = await getMessagesForChat(chat.id);
      
      for (const message of chatMessages) {
        // Check if message already exists
        const existingMessage = messages.find(m => m.messageId === message.id);
        if (!existingMessage) {
          // Determine sender info
          let senderInfo = {
            attendee_name: contactName,
            attendee_id: message.sender_id
          };
          
          // If it's an outbound message, use account info
          if (message.is_sender) {
            senderInfo = {
              attendee_name: account.name,
              attendee_id: account.id
            };
          }
          
          // Add new message
          const newMessage = {
            id: uuidv4(),
            messageId: message.id,
            chatId: chat.id,
            accountId: account.id,
            message: message.text || '',
            direction: message.is_sender ? 'outbound' : 'inbound',
            sender: senderInfo,
            timestamp: message.timestamp,
            attachments: message.attachments || []
          };
          
          messages.push(newMessage);
          totalMessagesProcessed++;
        }
      }
    }
  }
  
  // Save all data
  await saveData();
  
  console.log(`\n✅ Sync complete!`);
  console.log(`📊 Summary:`);
  console.log(`   - Accounts processed: ${accounts.length}`);
  console.log(`   - Chats processed: ${totalChatsProcessed}`);
  console.log(`   - Messages synced: ${totalMessagesProcessed}`);
  console.log(`   - Total chats in DB: ${chats.length}`);
  console.log(`   - Total messages in DB: ${messages.length}`);
};

// Run the sync
if (require.main === module) {
  syncFromUnipile()
    .then(() => {
      console.log('🎉 Sync completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Sync failed:', error);
      process.exit(1);
    });
}

module.exports = { syncFromUnipile };