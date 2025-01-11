export interface VectorData {
  vector: number[];
  dimensions: number;
  model: string;
  timestamp: Date;
}

export interface GeneratedContent {
  content: string;
  model: string;
  source: 'openai' | 'claude';
  metadata?: Record<string, unknown>;
}

// Domain-specific types
export interface UserProfile {
  name: string;
  title: string;
  summary: string;
  skills: string[];
  experience: Array<{
    role: string;
    company: string;
    accomplishments: string[];
  }>;
}

export interface StoredCoverLetter {
  jobId: string;
  jobDescription: string;
  submittedCoverLetter: string;
  embedding: VectorData;
}

// Client interfaces (could potentially come from client libraries)
export interface AIClient {
  generateText(prompt: string): Promise<GeneratedContent>;
}

export interface DatabaseClient {
  ensureCollection(schema: any): Promise<void>;  // Schema type from Weaviate
  insertWithVector<T extends Record<string, unknown>>(
    className: string,
    data: T,
    vector: number[]
  ): Promise<string>;
  querySimilar<T>(className: string, vector: number[], fields: string[], limit?: number): Promise<T[]>;
  testConnection(): Promise<boolean>;
}