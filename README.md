# Cover Letter Generator CLI

A CLI tool built using Bun, Commander, Weaviate, OpenAI, and Claude to streamline the generation and refinement of cover letters for job applications. The system compares generations from different AI models and uses vector similarity to learn from past submissions.

## Tech Stack

- **Bun:** JavaScript runtime for fast execution
- **TypeScript:** For type safety and better developer experience
- **Commander:** CLI framework for defining commands
- **Weaviate:** Vector database for similarity search
- **OpenAI & Claude:** Dual AI providers for cover letter generation
- **tsyringe:** Dependency injection container
- **Docker:** Runs Weaviate locally
- **cli-table3:** Terminal table layouts
- **inquirer:** Interactive command line interface
- **chalk:** Terminal styling
- **ora:** Terminal spinners
- **boxen:** Terminal boxes

## Project Structure

```
src/
├── config/
│   ├── index.ts # Exports all configuration
│   ├── environment.ts # Environment variable handling & validation
│   └── constants.ts # All constant values used across the app
├── types/
│   └── index.ts # Shared type definitions
├── clients/
│   ├── ai/ # AI client implementations
│   ├── database/ # Database client implementations
│   └── embedding/ # Embedding client implementations
├── services/ # Business logic services
├── commands/ # CLI commands
└── index.ts # Application entry point
```

## Setup Instructions

### 1. Prerequisites

- **Bun** installed: [https://bun.sh/](https://bun.sh/)
- **Docker** installed for running Weaviate
- **TextEdit** (for macOS users)

### 2. Installation

```bash
bun install
```

### 3. Environment Variables

Create a `.env` file:

```bash
OPENAI_API_KEY=your-openai-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key
WEAVIATE_HOST=localhost:8080
WEAVIATE_SCHEME=http
```

## Running the Application

### Start Weaviate

```bash
bun run start-weaviate
```

### Generate a Cover Letter

```bash
bun run generate-cover-letter
```

## Features

### Enhanced CLI Experience

- Beautiful terminal interface with colors and formatting
- Interactive menus for all user choices
- Progress indicators for long-running operations
- Side-by-side comparison of AI drafts
- Visual diffs of changes
- Seamless TextEdit integration for file editing

### Smart Input Handling

- Flexible job description input methods:
  - Open new TextEdit window for direct input
  - Use existing file path
- Preview of loaded content
- Error handling and fallbacks
- Automatic file cleanup to prevent conflicts

### AI Model Comparison

- Generates cover letters using both OpenAI and Claude
- Side-by-side visual comparison
- Easy selection interface
- Shows number of similar past letters used for context
- Stores successful generations for future reference

### TextEdit Integration (macOS)

- Seamless integration with TextEdit for both input and editing
- Automatic file cleanup before opening new documents
- Wait for user confirmation after editing
- Single file workflow for simpler interaction
- Maintains clean working directory

### File-Based Workflow

- Dynamic file management for job descriptions
- Unified editing experience through TextEdit
- Automatic file cleanup to prevent confusion
- All files in plain text format
- Easy to edit and version control

### Vector Similarity Search

- Uses OpenAI embeddings for semantic similarity search
- Finds relevant past cover letters to guide new generations
- Improves suggestions based on your submission history

## Architecture

### Dependency Injection

- Uses tsyringe for dependency management
- Modular design with swappable implementations
- Clear separation of concerns between layers

### Client Abstractions

- Abstract interfaces for AI, database, and embedding services
- Easy to add new AI providers or switch implementations
- Consistent error handling across services

## Workflow

1. **Input Job Description:**

   - Open fresh TextEdit window for new input
   - Use existing file path
   - Automatic file management

2. **Similar Letter Search:**

   - System finds relevant past submissions
   - Shows number of similar letters found
   - Uses them to guide generation

3. **Multi-Model Generation:**

   - Both OpenAI and Claude generate drafts
   - Side-by-side comparison
   - Visual formatting for easy reading

4. **Compare and Select:**

   - Choose preferred draft
   - Automatic opening in TextEdit
   - Seamless editing experience

5. **Review and Finalize:**

   - Preview final version
   - See visual diff of changes
   - Automatic file management
   - Single-file workflow

6. **Store for Learning:**
   - Final version stored with embeddings
   - Improves future suggestions
   - Builds knowledge base

## Troubleshooting

### Common Issues

1. **Weaviate Connection:**

   ```bash
   # Check if Weaviate is running
   docker ps

   # Restart if needed
   bun run stop-weaviate
   bun run start-weaviate
   ```

2. **TextEdit Issues:**

   - Ensure TextEdit is installed (macOS only)
   - Check file permissions in working directory
   - Confirm changes are saved before closing TextEdit

3. **Environment Variables:**

   - Ensure both API keys are set
   - Check Weaviate host and scheme

   ```bash
   # Verify environment
   cat .env
   ```

4. **Dependencies:**
   ```bash
   # Clean install
   rm -rf node_modules
   bun install
   ```

## Future Goals

1. **Enhanced AI Integration**

   - Support for more AI models
   - Custom model fine-tuning
   - Prompt engineering optimization

2. **Advanced Document Processing**

   - Resume parsing and analysis
   - Job description classification
   - Skill matching and suggestions

3. **Cross-Platform Support**

   - Alternative text editors for non-macOS systems
   - Platform-specific optimizations
   - Consistent experience across operating systems

4. **Analytics and Insights**
   - Track success rates
   - Analyze improvement patterns
   - Performance metrics

## License

This project is open-source and available under the MIT License.
