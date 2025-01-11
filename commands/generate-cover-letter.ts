import { Command } from 'commander';
import { container } from 'tsyringe';
import { diffWords } from 'diff';
import chalk from 'chalk';
import ora from 'ora';
import boxen from 'boxen';
import inquirer from 'inquirer';
import Table from 'cli-table3';
import wrap from 'wrap-ansi';
import { writeFile } from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import { platform } from 'os';
import path from 'path';

const execAsync = promisify(exec);
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

      // Get job description with paste mode
      console.log(chalk.cyan('\nEnter or paste the job description below.'));
      console.log(chalk.yellow('When finished, press Enter, then type ":done" and press Enter again.'));
      
      let jobDescription = '';
      const { content } = await inquirer.prompt([{
        type: 'input',
        name: 'content',
        message: 'Start typing or paste now:',
        validate: (input) => input.trim().length > 0 ? true : 'Job description cannot be empty'
      }]);
      
      jobDescription = content;
      
      // Keep accepting input until :done is entered
      while (true) {
        const { line } = await inquirer.prompt([{
          type: 'input',
          name: 'line',
          message: ''
        }]);
        
        if (line.trim().toLowerCase() === ':done') {
          break;
        }
        
        jobDescription += '\n' + line;
      }
      
      // Show confirmation of captured text
      console.log('\n' + boxen(chalk.bold('Captured Job Description:') + '\n\n' + jobDescription, {
        padding: 1,
        borderColor: 'yellow',
        margin: 1
      }));
      
      const { confirmText } = await inquirer.prompt([{
        type: 'confirm',
        name: 'confirmText',
        message: 'Is this the complete job description?',
        default: true
      }]);
      
      if (!confirmText) {
        console.log(chalk.red('Process cancelled. Please try again.'));
        return;
      }

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

      // After selecting preferred draft, ask about opening in Pages
      const { openInPages } = await inquirer.prompt([{
        type: 'confirm',
        name: 'openInPages',
        message: 'Would you like to open this draft in Pages?',
        default: true,
        when: () => platform() === 'darwin' // Only show on macOS
      }]);

      if (openInPages) {
        const spinner = ora('Opening in Pages...').start();
        try {
          // Create a temporary file with the content
          const tempFilePath = path.join(process.cwd(), 'cover-letter.txt');
          await writeFile(tempFilePath, selectedDraft, 'utf8');
          
          // Open with Pages
          await execAsync(`open -a "Pages" "${tempFilePath}"`);
          spinner.succeed('Opened in Pages');
        } catch (error) {
          spinner.fail('Failed to open in Pages. Is Pages installed?');
          console.error(chalk.red('Error details:'), error);
        }
      }

      // Continue with editing if needed
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