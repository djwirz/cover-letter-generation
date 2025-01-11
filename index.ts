import "reflect-metadata";
import { Command } from "commander";
import { setupContainer } from "./container";
import { generateCoverLetterCommand } from "./commands";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  try {
    await setupContainer();

    const program = new Command();

    program
      .name("cover-letter-cli")
      .description("Cover Letter CLI for job applications.")
      .version("1.0.0")
      .addCommand(generateCoverLetterCommand);

    await program.parseAsync(process.argv);
  } catch (error) {
    console.error("Failed to start application:", error);
    process.exit(1);
  }
}

main();