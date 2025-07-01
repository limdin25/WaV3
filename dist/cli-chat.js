"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const readline_1 = __importDefault(require("readline"));
const index_1 = require("./index");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const rl = readline_1.default.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'You: '
});
async function chat() {
    console.log('💬 Claude Terminal Chat! (type "exit" or "quit" to leave)\n');
    let history = [];
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
            const response = await index_1.anthropic.messages.create({
                model: 'claude-3-sonnet-20240229',
                max_tokens: 512,
                messages: history
            });
            const reply = response.content[0].text.trim();
            console.log(`Claude: ${reply}\n`);
            // Add Claude's reply to history
            history.push({ role: 'assistant', content: reply });
        }
        catch (error) {
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
//# sourceMappingURL=cli-chat.js.map