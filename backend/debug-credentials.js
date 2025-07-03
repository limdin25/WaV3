const bcrypt = require('bcrypt');
const axios = require('axios');

// Test credentials exactly as defined in frontend
const FRONTEND_CREDENTIALS = [
  { email: 'demo@demo.com', password: 'demo123', name: 'Demo User' },
  { email: 'test@test.com', password: 'test123', name: 'Test User' },
  { email: 'debug@test.com', password: 'debug123', name: 'Debug User' }
];

async function debugCredentials() {
  console.log('🔍 Debugging Login Credentials...\n');

  // Test each credential via API
  for (const cred of FRONTEND_CREDENTIALS) {
    console.log(`Testing ${cred.email} with password '${cred.password}':`);
    
    try {
      const response = await axios.post('http://localhost:5001/api/auth/login', {
        email: cred.email,
        password: cred.password
      });
      
      console.log(`✅ SUCCESS: ${cred.email}`);
      console.log(`   User: ${response.data.user.name}`);
      console.log(`   Token: ${response.data.token.substring(0, 30)}...`);
      
    } catch (error) {
      console.log(`❌ FAILED: ${cred.email}`);
      console.log(`   Error: ${error.response?.data?.error || error.message}`);
    }
    
    console.log('');
  }

  // Also test password hashing
  console.log('\n🔐 Password Hash Verification:');
  for (const cred of FRONTEND_CREDENTIALS) {
    const hash = await bcrypt.hash(cred.password, 10);
    const isValid = await bcrypt.compare(cred.password, hash);
    console.log(`${cred.email}: ${cred.password} -> ${isValid ? '✅' : '❌'}`);
  }
}

debugCredentials().catch(console.error);