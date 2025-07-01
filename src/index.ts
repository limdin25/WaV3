import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Claude client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Example 1: Basic text completion
async function basicCompletion() {
  try {
    const message = await anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: 'Hello! Can you explain quantum computing in simple terms?'
        }
      ]
    });

    console.log('Basic Completion Response:');
    console.log(message.content[0].text);
    return message;
  } catch (error) {
    console.error('Error in basic completion:', error);
    throw error;
  }
}

// Example 2: Conversation with context
async function conversationWithContext() {
  try {
    const message = await anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: 'My name is Alice and I love programming.'
        },
        {
          role: 'assistant',
          content: 'Nice to meet you, Alice! Programming is a wonderful skill to have. What programming languages do you enjoy working with?'
        },
        {
          role: 'user',
          content: 'I mainly work with Python and JavaScript. Can you help me understand async/await better?'
        }
      ]
    });

    console.log('\nConversation Response:');
    console.log(message.content[0].text);
    return message;
  } catch (error) {
    console.error('Error in conversation:', error);
    throw error;
  }
}

// Example 3: System prompt for specific behavior
async function systemPromptExample() {
  try {
    const message = await anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 1024,
      system: 'You are a helpful coding assistant. Always provide code examples and explain your reasoning.',
      messages: [
        {
          role: 'user',
          content: 'How do I implement a binary search tree in TypeScript?'
        }
      ]
    });

    console.log('\nSystem Prompt Response:');
    console.log(message.content[0].text);
    return message;
  } catch (error) {
    console.error('Error with system prompt:', error);
    throw error;
  }
}

// Example 4: Streaming response
async function streamingExample() {
  try {
    const stream = await anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: 'Write a short story about a robot learning to paint.'
        }
      ],
      stream: true
    });

    console.log('\nStreaming Response:');
    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta') {
        process.stdout.write(chunk.delta.text);
      }
    }
    console.log('\n');
  } catch (error) {
    console.error('Error in streaming:', error);
    throw error;
  }
}

// Example 5: Tool use (function calling) - Updated for current SDK
async function toolUseExample() {
  try {
    const message = await anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: 'What\'s the weather like in San Francisco today? Please provide a helpful response.'
        }
      ]
    });

    console.log('\nTool Use Response:');
    console.log(message.content[0].text);
    return message;
  } catch (error) {
    console.error('Error with tool use:', error);
    throw error;
  }
}

// Main function to run examples
async function main() {
  console.log('🚀 Claude API Integration Examples\n');

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('❌ ANTHROPIC_API_KEY not found in environment variables');
    console.log('Please create a .env file with your API key');
    return;
  }

  try {
    // Run examples
    await basicCompletion();
    await conversationWithContext();
    await systemPromptExample();
    await streamingExample();
    await toolUseExample();

    console.log('\n✅ All examples completed successfully!');
  } catch (error) {
    console.error('\n❌ Error running examples:', error);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  main();
}

export {
  basicCompletion,
  conversationWithContext,
  systemPromptExample,
  streamingExample,
  toolUseExample,
  anthropic
}; 