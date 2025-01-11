import { Command } from 'commander';
import { container } from 'tsyringe';
import { diffWords } from 'diff';
import chalk from 'chalk';
import ora from 'ora';
import boxen from 'boxen';
import inquirer from 'inquirer';
import Table from 'cli-table3';
import wrap from 'wrap-ansi';
import { writeFile, readFile, access } from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import { platform } from 'os';
import path from 'path';
import { CoverLetterService, ProfileService, ProfileFormatter } from '../services';
import { AIClient, GeneratedContent } from '../types';

const execAsync = promisify(exec);

const generateCoverLetterCommand = new Command('generate-cover-letter')
  .description('Generate and compare two cover letters interactively.')
  .action(async () => {
    try {
      // Get service instances
      const profileService = container.resolve(ProfileService);
      const coverLetterService = container.resolve(CoverLetterService);
      const profileFormatter = container.resolve(ProfileFormatter);
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

      // Get job description with multiple input methods
      const { inputMethod } = await inquirer.prompt([{
        type: 'list',
        name: 'inputMethod',
        message: 'How would you like to input the job description?',
        choices: [
          { name: 'Use job-description.txt from current directory', value: 'file' },
          { name: 'Specify a different file path', value: 'custom-file' },
          { name: 'Type/paste directly (not recommended for long text)', value: 'direct' }
        ]
      }]);

      let jobDescription = '';
      const loadingSpinner = ora();

      try {
        switch (inputMethod) {
          case 'file':
            loadingSpinner.start('Reading job-description.txt...');
            jobDescription = await readFile('job-description.txt', 'utf8');
            loadingSpinner.succeed('Job description loaded from file');
            break;

          case 'custom-file':
            const { filePath } = await inquirer.prompt([{
              type: 'input',
              name: 'filePath',
              message: 'Enter the path to your job description file:',
              validate: async (input) => {
                try {
                  await access(input);
                  return true;
                } catch {
                  return 'File does not exist or is not accessible';
                }
              }
            }]);
            loadingSpinner.start('Reading file...');
            jobDescription = await readFile(filePath, 'utf8');
            loadingSpinner.succeed('Job description loaded from file');
            break;

          case 'direct':
            console.log(chalk.yellow('\nWarning: This method may truncate long text. Consider using a file instead.'));
            const { text } = await inquirer.prompt([{
              type: 'input',
              name: 'text',
              message: 'Enter job description:',
              validate: (input) => input.trim().length > 0 ? true : 'Job description cannot be empty'
            }]);
            jobDescription = text;
            break;
        }

        // Show preview of loaded content
        console.log('\n' + boxen(
          chalk.bold('Job Description Preview:') + '\n\n' + 
          jobDescription.slice(0, 200) + 
          (jobDescription.length > 200 ? '...' : ''),
          {
            padding: 1,
            borderColor: 'yellow',
            margin: 1
          }
        ));

        // Generate drafts in parallel
        console.log('\nAnalyzing job description and generating tailored drafts...\n');
        
        // First check for similar letters
        const similarLetters = await coverLetterService.getSimilarLetters(jobDescription);
        if (similarLetters.length > 0) {
          console.log(chalk.cyan(`Found ${similarLetters.length} similar cover letters to guide the generation.`));
        }

        const [openAIDraft, claudeDraft] = await Promise.all<GeneratedContent>([
          openAIClient.generateText(
            profileFormatter.formatForOpenAI(profile, jobDescription)
          ),
          claudeClient.generateText(
            profileFormatter.formatForClaude(profile, jobDescription)
          )
        ]);

        // Display drafts side by side
        const terminalWidth = process.stdout.columns || 120;
        const columnWidth = Math.floor((terminalWidth - 10) / 2);
        
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

        // Select preferred draft
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

        // Handle text editor integration for macOS
        if (platform() === 'darwin') {
          const { openInTextEdit } = await inquirer.prompt([{
            type: 'confirm',
            name: 'openInTextEdit',
            message: 'Would you like to open this draft in TextEdit?',
            default: true
          }]);

          if (openInTextEdit) {
            const spinner = ora('Opening in TextEdit...').start();
            try {
              const tempFilePath = path.join(process.cwd(), 'cover-letter.txt');
              await writeFile(tempFilePath, selectedDraft, 'utf8');
              await execAsync(`open -a "TextEdit" "${tempFilePath}"`);
              spinner.succeed('Opened in TextEdit');
            } catch (error) {
              spinner.fail('Failed to open in TextEdit');
              console.error(chalk.red('Error details:'), error);
            }
          }
        }

        // Get final version
        const { coverLetterInput } = await inquirer.prompt([{
          type: 'list',
          name: 'coverLetterInput',
          message: 'How would you like to provide the final cover letter?',
          choices: [
            { name: 'Read from final-cover-letter.txt', value: 'file' },
            { name: 'Use the selected draft as-is', value: 'as-is' },
            { name: 'Type/paste directly (not recommended for long text)', value: 'direct' }
          ]
        }]);

        let finalCoverLetter: string;

        switch (coverLetterInput) {
          case 'file':
            loadingSpinner.start('Reading final-cover-letter.txt...');
            try {
              finalCoverLetter = await readFile('final-cover-letter.txt', 'utf8');
              loadingSpinner.succeed('Final cover letter loaded from file');
            } catch (error) {
              loadingSpinner.fail('Could not read final-cover-letter.txt');
              console.log(chalk.yellow('\nFalling back to selected draft...'));
              finalCoverLetter = selectedDraft;
            }
            break;

          case 'as-is':
            finalCoverLetter = selectedDraft;
            break;

          case 'direct':
            console.log(chalk.yellow('\nWarning: This method may truncate long text. Consider using a file instead.'));
            const { text } = await inquirer.prompt([{
              type: 'input',
              name: 'text',
              message: 'Enter final cover letter:',
              default: selectedDraft
            }]);
            finalCoverLetter = text;
            break;

          default:
            finalCoverLetter = selectedDraft;
        }

        // Show preview of final content
        console.log('\n' + boxen(
          chalk.bold('Final Cover Letter Preview:') + '\n\n' + 
          finalCoverLetter.slice(0, 200) + 
          (finalCoverLetter.length > 200 ? '...' : ''),
          {
            padding: 1,
            borderColor: 'green',
            margin: 1
          }
        ));

        // Confirm the final version
        const { confirmFinal } = await inquirer.prompt([{
          type: 'confirm',
          name: 'confirmFinal',
          message: 'Would you like to proceed with this version?',
          default: true
        }]);

        if (!confirmFinal) {
          console.log(chalk.red('Process cancelled. Please try again.'));
          return;
        }

        // Show diff analysis
        console.log('\n=== Changes Made ===');
        const diffResult = diffWords(selectedDraft, finalCoverLetter);
        
        diffResult.forEach((part) => {
          const color = part.added ? chalk.green :
                       part.removed ? chalk.red :
                       chalk.gray;
          process.stdout.write(color(part.value));
        });

        // Store the final version
        console.log('\nStoring the final cover letter...');
        await coverLetterService.storeCoverLetter(jobDescription, finalCoverLetter);
        console.log('\nFinal cover letter stored successfully.');

      } catch (error) {
        console.error(chalk.red('An error occurred while processing the job description:'), error);
        return;
      }

    } catch (error) {
      console.error(chalk.red('An error occurred:'), error);
      process.exit(1);
    }
  });

export default generateCoverLetterCommand;