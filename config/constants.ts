export const CONSTANTS = {
  AI_MODELS: {
    OPENAI: {
      GPT4: 'gpt-4',
      EMBEDDING: 'text-embedding-ada-002'
    },
    ANTHROPIC: {
      CLAUDE3: 'claude-3-sonnet-20240229'
    }
  },
  DATABASE: {
    COLLECTIONS: {
      COVER_LETTERS: 'SubmittedCoverLetter'
    },
    LIMITS: {
      SIMILAR_LETTERS: 3
    }
  },
  ERRORS: {
    MISSING_API_KEY: 'API key is required',
    INVALID_PROFILE: 'Invalid profile format',
    GENERATION_FAILED: 'Failed to generate content'
  }
} as const;