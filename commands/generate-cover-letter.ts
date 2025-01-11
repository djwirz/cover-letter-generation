import { Command } from 'commander';
import { container } from 'tsyringe';
import { diffWords } from 'diff';
import chalk from 'chalk';
import ora from 'ora';
import boxen from 'boxen';
import inquirer from 'inquirer';
import Table from 'cli-table3';
import wrap from 'wrap-ansi';
import type { AIClient } from '../types';
import { ProfileService, CoverLetterService } from '../services';

const generateCoverLetterCommand = new Command('generate-cover-letter')
  .description('Generate and compare two cover letters interactively.')
  .action(async () => {
    try {
      // Get service instances
      const profileService = container.resolve(ProfileService);
      const coverLetterService = container.resolve(CoverLetterService);
      const openAIClient = container.resolve<AIClient>('OpenAIClient');
      const claudeClient = container.resolve<AIClient>('ClaudeClient');

      console.log(boxen(chalk.bold.cyan('Cover Letter Generator'), { 
        padding: 1,
        borderStyle: 'double',
        borderColor: 'cyan'
      }));

      // Load user profile with spinner
      const profileSpinner = ora('Loading profile...').start();
      const profile = await profileService.loadProfile();
      profileSpinner.succeed('Profile loaded successfully');

      // Get job description using simple text input
      const { jobDescription } = await inquirer.prompt([{
        type: 'input',
        name: 'jobDescription',
        message: 'Enter the job description:',
        validate: (input) => input.trim().length > 0 ? true : 'Job description cannot be empty'
      }]);

      // Search similar letters with progress bar
      const searchSpinner = ora('Searching for similar cover letters...').start();
      const similarLetters = await coverLetterService.getSimilarLetters(jobDescription);
      
      if (similarLetters.length > 0) {
        searchSpinner.succeed(`Found ${similarLetters.length} similar cover letters`);
      } else {
        searchSpinner.info('No similar cover letters found');
      }

      // Generate drafts with dual spinners
      console.log('\n' + chalk.bold.cyan('Generating cover letter drafts...'));
      
      const spinners = ora({
        spinner: 'dots',
        color: 'cyan'
      }).start();

      const [openAIDraft, claudeDraft] = await Promise.all([
        openAIClient.generateText(getPromptTemplate(profile, jobDescription, similarLetters)),
        claudeClient.generateText(getPromptTemplate(profile, jobDescription, similarLetters))
      ]);
      
      spinners.succeed('Drafts generated successfully');

      // Display drafts side by side
      const terminalWidth = process.stdout.columns || 120;
      const columnWidth = Math.floor((terminalWidth - 10) / 2); // Account for table borders and padding
      
      const table = new Table({
        chars: {
          'top': '─', 'top-mid': '┬', 'top-left': '┌', 'top-right': '┐',
          'bottom': '─', 'bottom-mid': '┴', 'bottom-left': '└', 'bottom-right': '┘',
          'left': '│', 'left-mid': '├', 'mid': '─', 'mid-mid': '┼',
          'right': '│', 'right-mid': '┤', 'middle': '│'
        },
        colWidths: [columnWidth, columnWidth],
        wordWrap: true,
        style: {
          head: ['green', 'blue'],
          border: ['gray']
        }
      });

      const wrapText = (text: string) => wrap(text, columnWidth - 2, { trim: false, hard: true });

      table.push(
        [chalk.bold.green('OpenAI Draft (A)'), chalk.bold.blue('Claude Draft (B)')],
        [wrapText(openAIDraft.content), wrapText(claudeDraft.content)]
      );

      console.log('\n' + table.toString());

      // Select preferred draft using inquirer
      const { preferredDraft } = await inquirer.prompt([{
        type: 'list',
        name: 'preferredDraft',
        message: 'Which draft do you prefer?',
        choices: [
          { name: 'OpenAI Draft (A)', value: 'a' },
          { name: 'Claude Draft (B)', value: 'b' }
        ]
      }]);

      const selectedDraft = preferredDraft === 'a' ? openAIDraft.content : claudeDraft.content;

      // Edit final version using simple text input
      const { finalDraft } = await inquirer.prompt([{
        type: 'input',
        name: 'finalDraft',
        message: 'Edit your final version (or press Enter to use as-is):',
        default: selectedDraft
      }]);

      const editedCoverLetter = finalDraft.trim() || selectedDraft;

      // Show diff analysis with colors
      console.log('\n' + chalk.bold.cyan('Changes Made:'));
      const diffResult = diffWords(selectedDraft, editedCoverLetter);
      
      diffResult.forEach((part) => {
        const color = part.added ? chalk.green :
                     part.removed ? chalk.red :
                     chalk.gray;
        process.stdout.write(color(part.value));
      });

      // Store final version with spinner
      const saveSpinner = ora('Saving your cover letter...').start();
      await coverLetterService.storeCoverLetter(jobDescription, editedCoverLetter);
      saveSpinner.succeed('Cover letter saved successfully!');

      console.log('\n' + boxen(chalk.bold.green('Success!') + '\nYour cover letter has been generated and saved.', {
        padding: 1,
        borderStyle: 'round',
        borderColor: 'green'
      }));

    } catch (error) {
      console.error(chalk.red('\nAn error occurred:'), error);
      process.exit(1);
    }
  });

function getPromptTemplate(profile: any, jobDescription: string, similarLetters: any[]) {
  return `Based on this profile: ${JSON.stringify(profile)},
    job description: ${jobDescription},
    and past letters: ${similarLetters.map(l => l.submittedCoverLetter).join('\n\n')},
    generate a cover letter.`;
}

export default generateCoverLetterCommand;