const fs = require('fs').promises;
const path = require('path');

const fixSyncIssues = async () => {
  console.log('🔧 Analyzing sync issues...');
  
  // Read current data
  const messagesData = await fs.readFile(path.join(__dirname, 'messages.json'), 'utf8');
  const messages = JSON.parse(messagesData);
  
  console.log(`📊 Current messages: ${messages.length}`);
  
  // Find duplicates
  const messageMap = new Map();
  const duplicates = [];
  
  messages.forEach(msg => {
    const key = `${msg.chatId}-${msg.message}-${msg.timestamp}-${msg.direction}`;
    if (messageMap.has(key)) {
      duplicates.push(msg);
    } else {
      messageMap.set(key, msg);
    }
  });
  
  console.log(`🔍 Found ${duplicates.length} potential duplicates`);
  
  if (duplicates.length > 0) {
    console.log('Sample duplicates:');
    duplicates.slice(0, 3).forEach(dup => {
      console.log(`  - "${dup.message}" in ${dup.chatId} at ${dup.timestamp}`);
    });
  }
  
  // Don't automatically remove duplicates, just report
  console.log('✅ Analysis complete. Issues identified:');
  console.log('  1. Sync endpoint needs to query chat-specific messages');
  console.log('  2. Send endpoint needs to find correct account for chat');
  console.log('  3. Need proper duplicate prevention');
  
  return {
    totalMessages: messages.length,
    duplicateCount: duplicates.length,
    needsSync: true
  };
};

if (require.main === module) {
  fixSyncIssues()
    .then(result => {
      console.log('📋 Analysis result:', result);
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Analysis failed:', error);
      process.exit(1);
    });
}

module.exports = { fixSyncIssues };