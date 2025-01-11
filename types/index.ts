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

export interface UserProfile {
  name: string;
  title: string;
  preferred_name: string;
  summary: string;
  letter_preferences: {
    greeting: string;
    structure: {
      length: string;
      format: string;
    };
    closing: {
      gratitude: string;
      signature: string;
    };
  };
  contact: {
    location: string;
    email: string;
    linkedin: string;
  };
  skills: {
    core: {
      languages: string[];
      frontend: string[];
      backend: string[];
      databases: string[];
      cloud: string[];
      testing: string[];
      monitoring: string[];
    };
    soft: string[];
  };
  experience: Array<{
    company: string;
    role: string;
    duration: string;
    highlights: string[];
    technologies: string[];
  }>;
  education: {
    institution: string;
    field: string;
    duration: string;
    details: string;
  };
  achievements: string[];
  targeting?: {
    roles: string[];
    industries: string[];
    company_sizes: string[];
    focus_areas: string[];
  };
  achievements_by_category?: {
    leadership: string[];
    technical: string[];
    collaboration: string[];
    innovation: string[];
  };
  volunteer_experience?: {
    organization: string;
    location: string;
    duration: string;
    highlights: string[];
  };
}

export interface StoredCoverLetter {
  jobId: string;
  jobDescription: string;
  submittedCoverLetter: string;
  embedding: VectorData;
}

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

export type ExperienceWithRelevance = UserProfile['experience'][0] & { 
  relevance: number 
};