import { execSync } from 'child_process';
import axios from 'axios';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.ANTHROPIC_API_KEY;
const filePath = 'broken.ts'; // your code file

async function callClaude(prompt) {
  const res = await axios.post(
    'https://api.anthropic.com/v1/messages',
    {
      model: 'claude-3-sonnet-20240229',
      max_tokens: 2000,
      temperature: 0.3,
      messages: [{ role: 'user', content: prompt }]
    },
    {
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      }
    }
  );

  return res.data.content[0].text;
}

async function runLoop() {
  let passes = false;
  let iteration = 1;

  while (!passes) {
    console.log(`🛠️  Debug attempt #${iteration}`);

    const code = fs.readFileSync(filePath, 'utf-8');
    const prompt = `You're a senior developer. Fix the following TypeScript code until it runs correctly with no errors. Do not explain anything. Return ONLY the fixed code. Here is the code:\n\n${code}`;

    const result = await callClaude(prompt);

    // Save the new code
    fs.writeFileSync(filePath, result);

    try {
      execSync(`npx ts-node ${filePath}`, { stdio: 'inherit' });
      console.log('✅ Code ran successfully!');
      passes = true;
    } catch (err) {
      console.log('❌ Error found, retrying...\n');
      iteration++;
    }
  }
}

runLoop();