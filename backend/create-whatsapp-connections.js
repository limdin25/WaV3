const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const createWhatsAppConnections = async () => {
  // Load existing data
  const connectionsData = await fs.readFile(path.join(__dirname, 'connections.json'), 'utf8');
  const chatsData = await fs.readFile(path.join(__dirname, 'chats.json'), 'utf8');
  
  const connections = JSON.parse(connectionsData);
  const chats = JSON.parse(chatsData);
  
  console.log('Current connections:', connections.length);
  console.log('Current chats:', chats.length);
  
  // Find unique WhatsApp account IDs from chats
  const uniqueAccountIds = [...new Set(chats.map(chat => chat.accountId))];
  console.log('Unique account IDs:', uniqueAccountIds);
  
  // Test user ID (the one with existing connections)
  const testUserId = 'e4f743e3-0114-4ab6-921c-6b62d2a24683';
  
  // Create WhatsApp connections for each account
  for (const accountId of uniqueAccountIds) {
    // Check if connection already exists
    const existingConnection = connections.find(c => 
      c.userId === testUserId && c.type === 'whatsapp' && c.accountId === accountId
    );
    
    if (!existingConnection) {
      const newConnection = {
        id: uuidv4(),
        userId: testUserId,
        type: 'whatsapp',
        accountId: accountId,
        status: 'connected',
        createdAt: new Date().toISOString()
      };
      
      connections.push(newConnection);
      console.log(`✅ Created WhatsApp connection for account: ${accountId}`);
    } else {
      console.log(`⚠️  Connection already exists for account: ${accountId}`);
    }
  }
  
  // Save updated connections
  await fs.writeFile(path.join(__dirname, 'connections.json'), JSON.stringify(connections, null, 2));
  console.log(`💾 Saved ${connections.length} connections total`);
};

// Run if called directly
if (require.main === module) {
  createWhatsAppConnections()
    .then(() => {
      console.log('🎉 WhatsApp connections created successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Failed to create connections:', error);
      process.exit(1);
    });
}

module.exports = { createWhatsAppConnections };