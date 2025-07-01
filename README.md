# Claude API Integration

A comprehensive TypeScript integration with the Claude API by Anthropic, featuring examples of basic completions, conversations, streaming, tool use, and webhook handling.

## 🚀 Features

- **Basic Text Completion**: Simple question-answer interactions
- **Conversation Context**: Multi-turn conversations with memory
- **System Prompts**: Custom behavior configuration
- **Streaming Responses**: Real-time text generation
- **Tool Use**: Function calling capabilities
- **Webhook Server**: Express.js server for handling webhook requests
- **TypeScript Support**: Full type safety and IntelliSense

## 📋 Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Anthropic API key

## 🛠️ Installation

1. **Clone or download this project**

2. **Install dependencies**:
   ```bash
   
   
   rnpm install
   ```

3. **Set up environment variables**:
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` and add your Anthropic API key:
   ```env
   ANTHROPIC_API_KEY=your_actual_api_key_here
   PORT=3000
   WEBHOOK_SECRET=your_webhook_secret_here
   ```

## 🔑 Getting Your API Key

1. Visit [Anthropic Console](https://console.anthropic.com/)
2. Sign up or log in to your account
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key and add it to your `.env` file

## 📖 Usage

### Running Examples

```bash
# Run all examples
npm run dev

# Build and run
npm run build
PORT=3001 npm start
```

### Webhook Server

```bash
# Start the webhook server
npm run webhook
```

The server will be available at:
- **Webhook endpoint**: `http://localhost:3000/webhook`
- **Health check**: `http://localhost:3000/health`

### Example API Calls

#### Basic Completion
```typescript
import { basicCompletion } from './src/index';

const response = await basicCompletion();
console.log(response.content[0].text);
```

#### Conversation with Context
```typescript
import { conversationWithContext } from './src/index';

const response = await conversationWithContext();
```

#### Streaming Response
```typescript
import { streamingExample } from './src/index';

await streamingExample();
```

#### Tool Use (Function Calling)
```typescript
import { toolUseExample } from './src/index';

const response = await toolUseExample();
```

## 🌐 Webhook Usage

### Sending a Message

```bash
curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello, Claude!",
    "userId": "user123"
  }'
```

### Response Format

```json
{
  "success": true,
  "response": "Hello! I'm Claude, an AI assistant created by Anthropic. How can I help you today?",
  "userId": "user123"
}
```

## 📚 Available Models

- `claude-3-opus-20240229` - Most capable model
- `claude-3-sonnet-20240229` - Balanced performance (default)
- `claude-3-haiku-20240307` - Fastest and most cost-effective

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ANTHROPIC_API_KEY` | Your Anthropic API key | Required |
| `PORT` | Server port for webhook | 3000 |
| `WEBHOOK_SECRET` | Secret for webhook verification | Optional |

### TypeScript Configuration

The project uses strict TypeScript configuration with:
- ES2020 target
- CommonJS modules
- Source maps enabled
- Declaration files generated

## 🧪 Testing

```bash
# Test the webhook endpoint
curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -d '{"message": "What is 2+2?"}'

# Check server health
curl http://localhost:3000/health
```

## 📝 Examples

### 1. Basic Question
```typescript
const response = await anthropic.messages.create({
  model: 'claude-3-sonnet-20240229',
  max_tokens: 1024,
  messages: [
    {
      role: 'user',
      content: 'Explain quantum computing in simple terms'
    }
  ]
});
```

### 2. Multi-turn Conversation
```typescript
const response = await anthropic.messages.create({
  model: 'claude-3-sonnet-20240229',
  max_tokens: 1024,
  messages: [
    {
      role: 'user',
      content: 'My name is Alice'
    },
    {
      role: 'assistant',
      content: 'Nice to meet you, Alice!'
    },
    {
      role: 'user',
      content: 'What should I learn next in programming?'
    }
  ]
});
```

### 3. System Prompt
```typescript
const response = await anthropic.messages.create({
  model: 'claude-3-sonnet-20240229',
  max_tokens: 1024,
  system: 'You are a helpful coding assistant. Always provide code examples.',
  messages: [
    {
      role: 'user',
      content: 'How do I implement a binary search?'
    }
  ]
});
```

## 🚨 Error Handling

The integration includes comprehensive error handling:

```typescript
try {
  const response = await anthropic.messages.create({
    // ... configuration
  });
} catch (error) {
  console.error('API Error:', error);
  // Handle specific error types
  if (error.status === 401) {
    console.error('Invalid API key');
  } else if (error.status === 429) {
    console.error('Rate limit exceeded');
  }
}
```

## 📄 License

MIT License - feel free to use this code in your projects.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

- [Anthropic Documentation](https://docs.anthropic.com/)
- [API Reference](https://docs.anthropic.com/en/api)
- [Community Forum](https://community.anthropic.com/)

---

**Note**: Make sure to keep your API key secure and never commit it to version control! 

http://localhost:3000 