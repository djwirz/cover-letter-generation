import { z } from 'zod';

const envSchema = z.object({
  OPENAI_API_KEY: z.string().min(1),
  ANTHROPIC_API_KEY: z.string().min(1),
  WEAVIATE_HOST: z.string().min(1),
  WEAVIATE_SCHEME: z.enum(['http', 'https']).default('http'),
  OPENAI_MODEL: z.string().default('gpt-4'),
  OPENAI_MAX_TOKENS: z.coerce.number().default(1000),
  ANTHROPIC_MODEL: z.string().default('claude-3-sonnet-20240229'),
  ANTHROPIC_MAX_TOKENS: z.coerce.number().default(1024)
});

export type Environment = {
  openai: {
    apiKey: string;
    model: string;
    maxTokens: number;
  };
  anthropic: {
    apiKey: string;
    model: string;
    maxTokens: number;
  };
  weaviate: {
    host: string;
    scheme: 'http' | 'https';
  };
};

export const getEnvironment = (): Environment => {
  const env = envSchema.parse(process.env);
  
  return {
    openai: {
      apiKey: env.OPENAI_API_KEY,
      model: env.OPENAI_MODEL,
      maxTokens: env.OPENAI_MAX_TOKENS
    },
    anthropic: {
      apiKey: env.ANTHROPIC_API_KEY,
      model: env.ANTHROPIC_MODEL,
      maxTokens: env.ANTHROPIC_MAX_TOKENS
    },
    weaviate: {
      host: env.WEAVIATE_HOST,
      scheme: env.WEAVIATE_SCHEME
    }
  };
};