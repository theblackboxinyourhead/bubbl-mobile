// Type definitions migrated from backend/src/services/integrations/openai/prompts/types.ts

export interface PromptConfig {
  temperature: number;
  maxTokens: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
}

export interface OpenAIPromptTemplate {
  content: string;
  config: PromptConfig;
}

// Note: PromptType from backend types.ts is not relevant for realtime prompts here. 