import Client from '@anthropic-ai/sdk';
import { injectable, inject } from 'tsyringe';
import type { AIClient, GeneratedContent } from '../../types';
import type { Environment } from '../../config';
import { CONSTANTS } from '../../config/constants';

@injectable()
export class ClaudeClient implements AIClient {
  private client: Client;

  constructor(@inject('Environment') private env: Environment) {
    this.client = new Client({ apiKey: env.anthropic.apiKey });
  }

  async generateText(prompt: string): Promise<GeneratedContent> {
    const response = await this.client.messages.create({
      model: this.env.anthropic.model,
      max_tokens: this.env.anthropic.maxTokens,
      messages: [{ role: 'user', content: prompt }]
    });

    const contentBlock = response.content[0];
    if (!('text' in contentBlock)) {
      throw new Error(CONSTANTS.ERRORS.GENERATION_FAILED);
    }

    return {
      content: contentBlock.text,
      model: this.env.anthropic.model,
      source: 'claude',
      metadata: {
        stopReason: response.stop_reason,
        usage: response.usage
      }
    };
  }
}