"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testConnection = testConnection;
const index_1 = require("./index");
async function testConnection() {
    console.log('🧪 Testing Claude API Connection...\n');
    if (!process.env.ANTHROPIC_API_KEY) {
        console.log('❌ No API key found. Please set ANTHROPIC_API_KEY in your .env file');
        return;
    }
    try {
        const response = await index_1.anthropic.messages.create({
            model: 'claude-3-haiku-20240307', // Using Haiku for faster testing
            max_tokens: 100,
            messages: [
                {
                    role: 'user',
                    content: 'Say "Hello! Claude API is working correctly!"'
                }
            ]
        });
        console.log('✅ API Connection Successful!');
        console.log('📝 Response:', response.content[0].text);
        console.log('\n🎉 Your Claude API integration is ready to use!');
    }
    catch (error) {
        console.error('❌ API Connection Failed:', error.message);
        if (error.status === 401) {
            console.log('💡 Please check your API key in the .env file');
        }
        else if (error.status === 429) {
            console.log('💡 Rate limit exceeded. Please wait a moment and try again');
        }
    }
}
// Run test if this file is executed directly
if (require.main === module) {
    testConnection();
}
//# sourceMappingURL=test.js.map