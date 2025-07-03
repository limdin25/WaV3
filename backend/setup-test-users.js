const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Test credentials matching the frontend
const testCredentials = [
  { email: 'demo@demo.com', password: 'demo123', name: 'Demo User' },
  { email: 'test@test.com', password: 'test123', name: 'Test User' },
  { email: 'debug@test.com', password: 'debug123', name: 'Debug User' }
];

async function setupTestUsers() {
  console.log('🔧 Setting up test users with stable credentials...');
  
  // Load existing users
  const usersPath = path.join(__dirname, 'users.json');
  let users = [];
  
  if (fs.existsSync(usersPath)) {
    users = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
    console.log(`📋 Loaded ${users.length} existing users`);
  }

  // Process each test credential
  for (const cred of testCredentials) {
    // Check if user already exists
    const existingUser = users.find(u => u.email === cred.email);
    
    if (existingUser) {
      console.log(`👤 User ${cred.email} already exists, updating password...`);
      // Update password hash
      existingUser.password = await bcrypt.hash(cred.password, 10);
      existingUser.name = cred.name;
    } else {
      console.log(`➕ Creating new user: ${cred.email}`);
      // Create new user
      const hashedPassword = await bcrypt.hash(cred.password, 10);
      users.push({
        id: uuidv4(),
        email: cred.email,
        password: hashedPassword,
        name: cred.name,
        createdAt: new Date().toISOString()
      });
    }
  }

  // Save updated users
  fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));
  console.log(`✅ Successfully set up ${testCredentials.length} test users`);
  
  // Display credentials for reference
  console.log('\n🔑 Test Credentials (STABLE - Never Change):');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  testCredentials.forEach(cred => {
    console.log(`📧 ${cred.email.padEnd(20)} | 🔒 ${cred.password.padEnd(10)} | 👤 ${cred.name}`);
  });
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

// Run if called directly
if (require.main === module) {
  setupTestUsers().catch(console.error);
}

module.exports = { setupTestUsers };