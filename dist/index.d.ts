import Anthropic from '@anthropic-ai/sdk';
declare const anthropic: Anthropic;
declare function basicCompletion(): Promise<Anthropic.Messages.Message>;
declare function conversationWithContext(): Promise<Anthropic.Messages.Message>;
declare function systemPromptExample(): Promise<Anthropic.Messages.Message>;
declare function streamingExample(): Promise<void>;
declare function toolUseExample(): Promise<Anthropic.Messages.Message>;
export { basicCompletion, conversationWithContext, systemPromptExample, streamingExample, toolUseExample, anthropic };
//# sourceMappingURL=index.d.ts.map