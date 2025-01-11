import weaviate, { WeaviateClient } from 'weaviate-ts-client';
import { injectable, inject } from 'tsyringe';
import type { DatabaseClient } from '../../types';
import type { Environment } from '../../config';
import { CONSTANTS } from '../../config/constants';

@injectable()
export class WeaviateDBClient implements DatabaseClient {
  private client: WeaviateClient;

  constructor(@inject('Environment') private env: Environment) {
    this.client = weaviate.client({
      scheme: env.weaviate.scheme,
      host: env.weaviate.host
    });
  }

  async ensureCollection(schema: any): Promise<void> {
    const classes = await this.client.schema.getter().do();
    if (!classes.classes?.some(cls => cls.class === schema.class)) {
      await this.client.schema.classCreator().withClass(schema).do();
    }
  }

  async insertWithVector<T extends Record<string, unknown>>(
    className: string,
    data: T,
    vector: number[]
  ): Promise<string> {
    const result = await this.client.data
      .creator()
      .withClassName(className)
      .withProperties(data)
      .withVector(vector)
      .do();

    if (!result.id) {
      throw new Error('Failed to insert data: ID is undefined');
    }
    return result.id;
  }

  async querySimilar<T>(
    className: string,
    vector: number[],
    fields: string[],
    limit: number = CONSTANTS.DATABASE.LIMITS.SIMILAR_LETTERS
  ): Promise<T[]> {
    const result = await this.client.graphql
      .get()
      .withClassName(className)
      .withFields(fields.join(' '))
      .withNearVector({ vector })
      .withLimit(limit)
      .do();

    return result.data?.Get?.[className] || [];
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.client.schema.getter().do();
      return true;
    } catch {
      return false;
    }
  }
}