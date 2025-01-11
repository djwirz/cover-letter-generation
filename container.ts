import "reflect-metadata";
import { container } from 'tsyringe';
import { getEnvironment } from './config';
import { OpenAIClient, ClaudeClient } from './clients/ai';
import { OpenAIEmbeddingClient } from './clients/embedding';
import { WeaviateDBClient } from './clients/database';
import { ProfileService, CoverLetterService } from './services';
import type { AIClient, DatabaseClient } from './types';
import { CONSTANTS } from './config/constants';

export async function setupContainer() {
  // Register environment
  const env = getEnvironment();
  container.register('Environment', { useValue: env });

  // Register clients
  container.register<AIClient>('OpenAIClient', {
    useClass: OpenAIClient
  });
  
  container.register<AIClient>('ClaudeClient', {
    useClass: ClaudeClient
  });
  
  container.register<DatabaseClient>('DatabaseClient', {
    useClass: WeaviateDBClient
  });
  
  container.register('OpenAIEmbeddingClient', {
    useClass: OpenAIEmbeddingClient
  });

  // Register services
  container.register(ProfileService, {
    useClass: ProfileService
  });
  
  container.register(CoverLetterService, {
    useClass: CoverLetterService
  });

  // Test database connection and initialize
  const dbClient = container.resolve<DatabaseClient>('DatabaseClient');
  const isConnected = await dbClient.testConnection();
  
  if (!isConnected) {
    throw new Error('Failed to connect to Weaviate database');
  }

  // Initialize database schema
  await dbClient.ensureCollection({
    class: CONSTANTS.DATABASE.COLLECTIONS.COVER_LETTERS,
    vectorizer: "none",
    properties: [
      { name: "jobId", dataType: ["string"] },
      { name: "jobDescription", dataType: ["string"] },
      { name: "submittedCoverLetter", dataType: ["string"] }
    ]
  });

  return container;
}