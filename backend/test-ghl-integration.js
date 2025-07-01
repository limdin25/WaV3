require('dotenv').config();
const axios = require('axios');
const fs = require('fs');

async function testGHLIntegration() {
  try {
    // Load connections to get CRM token
    const connections = JSON.parse(fs.readFileSync('connections.json', 'utf8'));
    const crmConnection = connections.find(c => c.type === 'crm');
    
    if (!crmConnection) {
      console.log('❌ No CRM connection found');
      return;
    }
    
    console.log('🧪 Testing GHL API integration...');
    console.log('Access Token:', crmConnection.accessToken.substring(0, 20) + '...');
    console.log('Location ID:', crmConnection.locationId);
    
    // Test 1: Search for contacts
    console.log('\n📞 Testing contact search...');
    try {
      const searchResponse = await axios.get(
        `https://services.leadconnectorhq.com/contacts/search/duplicate`,
        {
          headers: {
            Authorization: `Bearer ${crmConnection.accessToken}`,
            'Version': '2021-07-28'
          },
          params: {
            phone: '+447863992555',
            locationId: crmConnection.locationId
          }
        }
      );
      console.log('✅ Contact search successful:', searchResponse.status);
      console.log('Contact data:', searchResponse.data);
    } catch (searchError) {
      console.log('❌ Contact search failed:');
      console.log('Status:', searchError.response?.status);
      console.log('Error:', searchError.response?.data);
    }
    
    // Test 2: List contacts to verify API access
    console.log('\n👥 Testing contact list...');
    try {
      const listResponse = await axios.get(
        `https://services.leadconnectorhq.com/contacts/`,
        {
          headers: {
            Authorization: `Bearer ${crmConnection.accessToken}`,
            'Version': '2021-07-28'
          },
          params: {
            limit: 5,
            locationId: crmConnection.locationId
          }
        }
      );
      console.log('✅ Contact list successful:', listResponse.status);
      console.log('Found contacts:', listResponse.data.contacts?.length || 0);
    } catch (listError) {
      console.log('❌ Contact list failed:');
      console.log('Status:', listError.response?.status);
      console.log('Error:', listError.response?.data);
    }
    
    // Test 3: Test message sending (commented out to avoid spam)
    /*
    console.log('\n💬 Testing message send...');
    try {
      const messageResponse = await axios.post(
        `https://services.leadconnectorhq.com/conversations/messages`,
        {
          type: 'SMS',
          contactId: 'test-contact-id',
          message: 'Test message from WhatsApp integration'
        },
        {
          headers: {
            Authorization: `Bearer ${crmConnection.accessToken}`,
            'Version': '2021-07-28',
            'Content-Type': 'application/json'
          }
        }
      );
      console.log('✅ Message send successful:', messageResponse.status);
    } catch (messageError) {
      console.log('❌ Message send failed:');
      console.log('Status:', messageError.response?.status);
      console.log('Error:', messageError.response?.data);
    }
    */
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
}

testGHLIntegration();