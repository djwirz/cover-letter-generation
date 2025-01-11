import OpenAI from 'openai';
import { injectable, inject } from 'tsyringe';
import type { Environment } from '../../config';
import type { AIClient, GeneratedContent } from '../../types';
import { CONSTANTS } from '../../config/constants';

@injectable()
export class OpenAIClient implements AIClient {
  private client: OpenAI;

  constructor(@inject('Environment') private env: Environment) {
    this.client = new OpenAI({ apiKey: env.openai.apiKey });
  }

  async generateText(prompt: string): Promise<GeneratedContent> {
    const response = await this.client.chat.completions.create({
      model: this.env.openai.model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: this.env.openai.maxTokens
    });

    if (!response.choices[0].message?.content) {
      throw new Error(CONSTANTS.ERRORS.GENERATION_FAILED);
    }

    return {
      content: response.choices[0].message.content,
      model: this.env.openai.model,
      source: 'openai',
      metadata: {
        finishReason: response.choices[0].finish_reason,
        usage: response.usage
      }
    };
  }
}
