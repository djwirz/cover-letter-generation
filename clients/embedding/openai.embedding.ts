import OpenAI from 'openai';
import { injectable, inject } from 'tsyringe';
import type { VectorData } from '../../types';
import type { Environment } from '../../config';
import { CONSTANTS } from '../../config/constants';

@injectable()
export class OpenAIEmbeddingClient {
  private client: OpenAI;

  constructor(@inject('Environment') private env: Environment) {
    this.client = new OpenAI({ apiKey: env.openai.apiKey });
  }

  async getEmbedding(text: string): Promise<VectorData> {
    const response = await this.client.embeddings.create({
      model: CONSTANTS.AI_MODELS.OPENAI.EMBEDDING,
      input: text,
    });

    return {
      vector: response.data[0].embedding,
      dimensions: response.data[0].embedding.length,
      model: CONSTANTS.AI_MODELS.OPENAI.EMBEDDING,
      timestamp: new Date()
    };
  }
}
