import { Command } from 'commander';
import { container } from 'tsyringe';
import { diffWords } from 'diff';
import chalk from 'chalk';
import ora from 'ora';
import boxen from 'boxen';
import inquirer from 'inquirer';
import Table from 'cli-table3';
import wrap from 'wrap-ansi';
import { writeFile, readFile, access, unlink } from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import { platform } from 'os';
import path from 'path';
import { CoverLetterService, ProfileService, ProfileFormatter } from '../services';
import { AIClient, GeneratedContent } from '../types';

const execAsync = promisify(exec);

// Helper function to handle file operations
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function deleteFileIfExists(filePath: string): Promise<void> {
  if (await fileExists(filePath)) {
    await unlink(filePath);
  }
}

async function openInTextEditAndWaitForSave(filePath: string, initialContent: string = ''): Promise<string> {
  await deleteFileIfExists(filePath);
  await writeFile(filePath, initialContent, 'utf8');
  
  const spinner = ora('Opening in TextEdit...').start();
  try {
    await execAsync(`open -a "TextEdit" "${filePath}"`);
    spinner.succeed('Opened in TextEdit');
    
    // Wait for user to confirm they've saved and closed TextEdit
    await inquirer.prompt([{
      type: 'confirm',
      name: 'saved',
      message: 'Please save and close TextEdit when finished. Have you completed your edits?',
      default: true
    }]);

    // Read the updated content
    return await readFile(filePath, 'utf8');
  } catch (error) {
    spinner.fail('Failed to open in TextEdit');
    throw error;
  }
}

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
          { name: 'Open TextEdit for new input', value: 'textedit' },
          { name: 'Use existing file', value: 'existing-file' }
        ]
      }]);

      let jobDescription = '';
      const loadingSpinner = ora();
      const jobDescriptionPath = path.join(process.cwd(), 'job-description.txt');

      try {
        if (inputMethod === 'textedit') {
          jobDescription = await openInTextEditAndWaitForSave(jobDescriptionPath);
        } else {
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
        const coverLetterPath = path.join(process.cwd(), 'cover-letter.txt');

        if (platform() === 'darwin') {
          console.log(chalk.cyan('\nOpening selected draft in TextEdit for final editing...'));
          const finalCoverLetter = await openInTextEditAndWaitForSave(coverLetterPath, selectedDraft);

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
        } else {
          console.log(chalk.yellow('\nTextEdit integration is only available on macOS.'));
          // Handle non-macOS systems...
        }

      } catch (error) {
        console.error(chalk.red('An error occurred while processing:'), error);
        return;
      }

    } catch (error) {
      console.error(chalk.red('An error occurred:'), error);
      process.exit(1);
    }
  });

export default generateCoverLetterCommand;