import { Command } from 'commander';
import { container } from 'tsyringe';
import { diffWords } from 'diff';
import { createInterface } from 'readline';
import type { AIClient } from '../types';
import { ProfileService, CoverLetterService } from '../services';
import { CONSTANTS } from '../config/constants';

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});

const prompt = (question: string): Promise<string> =>
  new Promise((resolve) => rl.question(question, resolve));

const generateCoverLetterCommand = new Command('generate-cover-letter')
  .description('Generate and compare two cover letters interactively.')
  .action(async () => {
    try {
      // Get service instances from container
      const profileService = container.resolve(ProfileService);
      const coverLetterService = container.resolve(CoverLetterService);
      const openAIClient = container.resolve<AIClient>('OpenAIClient');
      const claudeClient = container.resolve<AIClient>('ClaudeClient');

      // Load user profile
      const profile = await profileService.loadProfile();
      
      // Get job description
      const jobDescription = await prompt('Enter the job description: ');
      
      console.log('\nSearching for past submissions...');
      const similarLetters = await coverLetterService.getSimilarLetters(jobDescription);
      
      let similarCoverLettersText = '';
      if (similarLetters.length > 0) {
        console.log('\nUsing past cover letters to guide the draft.');
        similarCoverLettersText = `Past cover letters:\n${
          similarLetters.map(l => l.submittedCoverLetter).join('\n\n')
        }`;
      }

      console.log('\nGenerating drafts...\n');
      const promptTemplate = `Based on this profile: ${JSON.stringify(profile)}, 
        job description: ${jobDescription}, 
        and past letters: ${similarCoverLettersText}, 
        generate a cover letter.`;

      // Generate drafts in parallel
      const [openAIDraft, claudeDraft] = await Promise.all([
        openAIClient.generateText(promptTemplate),
        claudeClient.generateText(promptTemplate)
      ]);

      console.log('\n=== OpenAI Draft ===\n', openAIDraft.content);
      console.log('\n=== Claude Draft ===\n', claudeDraft.content);

      const preferredDraft = await prompt('\nWhich draft do you prefer? (A = OpenAI, B = Claude): ');
      const selectedDraft = preferredDraft.toLowerCase() === 'a' 
        ? openAIDraft.content 
        : claudeDraft.content;

      const finalDraft = await prompt('\nEnter your final version (or press Enter to use as-is): ');
      const editedCoverLetter = finalDraft.trim() || selectedDraft;

      // Diff Analysis
      console.log('\n=== Changes Made ===');
      const diffResult = diffWords(selectedDraft, editedCoverLetter);
      diffResult.forEach((part) => {
        const color = part.added ? 'green' : part.removed ? 'red' : 'grey';
        process.stdout.write(`${part.value.trim()} (${color})\n`);
      });

      console.log('\nStoring the final cover letter...');
      await coverLetterService.storeCoverLetter(jobDescription, editedCoverLetter);
      
      console.log('\nFinal cover letter stored successfully.');
      rl.close();
      
    } catch (error) {
      console.error('An error occurred:', error);
      rl.close();
      process.exit(1);
    }
  });

export default generateCoverLetterCommand;