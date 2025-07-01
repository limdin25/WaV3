import readline from 'readline';
import { anthropic } from './index';
import dotenv from 'dotenv';

dotenv.config();

// Define the message type for Claude
interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: 'You: '
});

async function chat() {
  console.log('💬 Claude Terminal Chat! (type "exit" or "quit" to leave)\n');
  let history: ClaudeMessage[] = [];

  rl.prompt();

  rl.on('line', async (line) => {
    const input = line.trim();
    if (input.toLowerCase() === 'exit' || input.toLowerCase() === 'quit') {
      rl.close();
      return;
    }

    // Add user message to history
    history.push({ role: 'user', content: input });

    try {
      const response = await anthropic.messages.create({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 512,
        messages: history
      });
      const reply = response.content[0].text.trim();
      console.log(`Claude: ${reply}\n`);
      // Add Claude's reply to history
      history.push({ role: 'assistant', content: reply });
    } catch (error: any) {
      console.error('Error:', error.message || error);
    }
    rl.prompt();
  });

  rl.on('close', () => {
    console.log('👋 Chat ended.');
    process.exit(0);
  });
}

if (require.main === module) {
  chat();
} 