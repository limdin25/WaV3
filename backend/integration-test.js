#!/usr/bin/env node

const axios = require('axios');
const bcrypt = require('bcryptjs');
const fs = require('fs').promises;

const BASE_URL = 'http://localhost:5001';

async function runIntegrationTest() {
  console.log('🧪 Starting comprehensive WhatsApp integration test...\n');

  try {
    // 1. Test user login
    console.log('1️⃣ Testing user authentication...');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'test@test.com',
      password: 'password'
    });
    
    if (!loginResponse.data.token) {
      throw new Error('No token received from login');
    }
    
    const token = loginResponse.data.token;
    console.log('✅ User authentication successful');

    // 2. Test available accounts (should be empty initially)
    console.log('\n2️⃣ Testing available WhatsApp accounts (should be empty)...');
    const accountsResponse = await axios.get(`${BASE_URL}/api/whatsapp/available-accounts`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('📊 Available accounts:', accountsResponse.data.accounts.length);
    if (accountsResponse.data.accounts.length > 0) {
      console.log('📱 Accounts found:', accountsResponse.data.accounts);
    } else {
      console.log('✅ No accounts found (as expected for fresh install)');
    }

    // 3. Test connection creation
    console.log('\n3️⃣ Testing WhatsApp connection creation...');
    const connectResponse = await axios.post(`${BASE_URL}/api/whatsapp/connect`, {
      createNew: true
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!connectResponse.data.authUrl) {
      throw new Error('No auth URL received');
    }
    
    console.log('✅ Connection creation successful');
    console.log('🔗 Auth URL generated:', connectResponse.data.authUrl.substring(0, 50) + '...');

    // 4. Simulate webhook callback (QR code scan completion)
    console.log('\n4️⃣ Simulating webhook callback (QR scan completion)...');
    const callbackResponse = await axios.post(`${BASE_URL}/api/auth/unipile/callback`, {
      status: 'CREATION_SUCCESS',
      name: 'e4f743e3-0114-4ab6-921c-6b62d2a24683',
      account_id: 'whatsapp_test_account_' + Date.now(),
      phone_number: '+1234567890'
    });
    
    console.log('✅ Webhook callback processed successfully');

    // 5. Test available accounts again (should show the new account)
    console.log('\n5️⃣ Testing available accounts after connection...');
    const accountsAfterResponse = await axios.get(`${BASE_URL}/api/whatsapp/available-accounts`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('📊 Available accounts after connection:', accountsAfterResponse.data.accounts.length);
    
    if (accountsAfterResponse.data.accounts.length === 0) {
      console.log('❌ ERROR: No accounts found after successful connection!');
      console.log('🔍 This indicates the webhook callback didn\'t complete properly');
      
      // Debug: Check connections directly
      const connectionsData = await fs.readFile('/Users/hugo/Downloads/AI Folder/WaV2/backend/connections.json', 'utf8');
      const connections = JSON.parse(connectionsData);
      console.log('🔍 Debug - Raw connections:', connections.filter(c => c.type === 'whatsapp' || c.type === 'whatsapp_pending'));
      
      return false;
    } else {
      console.log('✅ Accounts found after connection:');
      accountsAfterResponse.data.accounts.forEach(account => {
        console.log(`   📱 ${account.phoneNumber || 'Unknown'} (ID: ${account.id})`);
      });
    }

    // 6. Test connections status
    console.log('\n6️⃣ Testing connection status...');
    const statusResponse = await axios.get(`${BASE_URL}/api/connections`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('🔌 CRM Connected:', statusResponse.data.crm);
    console.log('📱 WhatsApp Connected:', statusResponse.data.whatsapp);
    
    if (!statusResponse.data.whatsapp) {
      console.log('❌ ERROR: WhatsApp not showing as connected!');
      return false;
    }

    // 7. Test webhook endpoint accessibility
    console.log('\n7️⃣ Testing webhook endpoint accessibility...');
    const webhookTestResponse = await axios.get(`${BASE_URL}/api/auth/unipile/callback`);
    console.log('✅ Webhook endpoint accessible:', webhookTestResponse.data.message);

    // 8. Test message webhook simulation
    console.log('\n8️⃣ Testing message webhook simulation...');
    const messageWebhookResponse = await axios.post(`${BASE_URL}/api/webhooks/unipile`, {
      type: 'MESSAGE',
      account_id: accountsAfterResponse.data.accounts[0]?.id || 'test_account',
      chat_id: 'test_chat_123',
      message_id: 'test_msg_123',
      message: 'Hello from test!',
      timestamp: new Date().toISOString(),
      sender: {
        attendee_name: 'Test Sender',
        attendee_id: 'test_sender_123'
      }
    });
    
    console.log('✅ Message webhook processed successfully');

    console.log('\n🎉 All integration tests passed!');
    console.log('\n📋 Summary:');
    console.log('   ✅ User authentication working');
    console.log('   ✅ WhatsApp connection creation working');
    console.log('   ✅ Webhook callback processing working');
    console.log('   ✅ Account filtering working');
    console.log('   ✅ Connection status tracking working');
    console.log('   ✅ Message webhook processing working');
    
    return true;

  } catch (error) {
    console.log('\n❌ Integration test failed!');
    console.log('Error:', error.message);
    if (error.response) {
      console.log('Response status:', error.response.status);
      console.log('Response data:', error.response.data);
    }
    return false;
  }
}

// Run the test
runIntegrationTest().then(success => {
  process.exit(success ? 0 : 1);
});