import { injectable, inject } from 'tsyringe';
import type { DatabaseClient, StoredCoverLetter } from '../types';
import { CONSTANTS } from '../config/constants';
import type { OpenAIEmbeddingClient } from '../clients/embedding';

@injectable()
export class CoverLetterService {
  constructor(
    @inject('DatabaseClient') private dbClient: DatabaseClient,
    @inject('OpenAIEmbeddingClient') private embeddingClient: OpenAIEmbeddingClient,
  ) {}

  async getSimilarLetters(
    jobDescription: string,
    limit: number = CONSTANTS.DATABASE.LIMITS.SIMILAR_LETTERS
  ): Promise<StoredCoverLetter[]> {
    const embedding = await this.embeddingClient.getEmbedding(jobDescription);
    return this.dbClient.querySimilar(
      CONSTANTS.DATABASE.COLLECTIONS.COVER_LETTERS,
      embedding.vector,
      ['submittedCoverLetter'],
      limit
    );
  }

  async storeCoverLetter(
    jobDescription: string,
    coverLetter: string
  ): Promise<void> {
    const embedding = await this.embeddingClient.getEmbedding(coverLetter);
    const jobId = `job-${Date.now()}`;
    
    await this.dbClient.insertWithVector(
      CONSTANTS.DATABASE.COLLECTIONS.COVER_LETTERS,
      {
        jobId,
        jobDescription,
        submittedCoverLetter: coverLetter
      },
      embedding.vector
    );
  }
}
