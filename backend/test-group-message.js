require('dotenv').config();
const axios = require('axios');

async function testGroupMessage() {
  try {
    const AARE_GROUP_CHAT_ID = "QI31rM2EXfq9jKQCaSgAwQ";
    const testMessage = "Test group message";
    
    console.log('🧪 Testing group message to AARE GROUP...');
    console.log('Chat ID:', AARE_GROUP_CHAT_ID);
    console.log('Message:', testMessage);
    console.log('API Endpoint:', `${process.env.UNIPILE_DSN}/api/v1/chats/${AARE_GROUP_CHAT_ID}/messages`);
    
    const response = await axios.post(`${process.env.UNIPILE_DSN}/api/v1/chats/${AARE_GROUP_CHAT_ID}/messages`, {
      text: testMessage
    }, {
      headers: {
        'X-API-KEY': process.env.UNIPILE_API_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Success! Response:', response.status, response.data);
    
  } catch (error) {
    console.log('❌ Group message failed:');
    console.log('Status:', error.response?.status);
    console.log('Error data:', JSON.stringify(error.response?.data, null, 2));
    console.log('Error message:', error.message);
    
    // Test individual chat for comparison
    console.log('\n🧪 Testing individual chat message for comparison...');
    try {
      const INDIVIDUAL_CHAT_ID = "DPYglVukWVK12uYeHsZfdA"; // +447863992555
      
      const individualResponse = await axios.post(`${process.env.UNIPILE_DSN}/api/v1/chats/${INDIVIDUAL_CHAT_ID}/messages`, {
        text: "Test individual message"
      }, {
        headers: {
          'X-API-KEY': process.env.UNIPILE_API_KEY,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Individual chat works! Status:', individualResponse.status);
      console.log('Individual response:', individualResponse.data);
      
    } catch (individualError) {
      console.log('❌ Individual chat also failed:');
      console.log('Status:', individualError.response?.status);
      console.log('Error:', individualError.response?.data);
    }
  }
}

testGroupMessage();