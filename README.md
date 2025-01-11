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

## Project Structure

```
src/
├── config/
│   ├── index.ts         # Exports all configuration
│   ├── environment.ts   # Environment variable handling & validation
│   └── constants.ts     # All constant values used across the app
├── types/
│   └── index.ts         # Shared type definitions
├── clients/
│   ├── ai/             # AI client implementations
│   ├── database/       # Database client implementations
│   └── embedding/      # Embedding client implementations
├── services/           # Business logic services
├── commands/           # CLI commands
└── index.ts           # Application entry point
```

## Setup Instructions

### 1. Prerequisites

- **Bun** installed: [https://bun.sh/](https://bun.sh/)
- **Docker** installed for running Weaviate

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

### AI Model Comparison

- Generates cover letters using both OpenAI and Claude
- Allows comparison and selection between different AI outputs
- Stores successful generations for future reference

### Vector Similarity Search

- Uses OpenAI embeddings for semantic similarity search
- Finds relevant past cover letters to guide new generations
- Improves suggestions based on your submission history

### Interactive Refinement

- Compare drafts from different AI models
- Edit and refine the selected draft
- View a diff of your changes
- Store final versions for future reference

## Architecture

### Dependency Injection

- Uses tsyringe for dependency management
- Modular design with swappable implementations
- Clear separation of concerns between layers

### Client Abstractions

- Abstract interfaces for AI, database, and embedding services
- Easy to add new AI providers or switch implementations
- Consistent error handling across services

## Commands

### `generate-cover-letter`

- Generates cover letters using multiple AI models
- Compares outputs and allows selection
- Shows diffs between drafts and final versions
- Stores submissions with vector embeddings

## Workflow

1. **Input Job Description:** Enter the job description in the CLI
2. **Similar Letter Search:** System finds relevant past submissions
3. **Multi-Model Generation:** Both OpenAI and Claude generate drafts
4. **Compare and Select:** Choose your preferred draft
5. **Refine and Submit:** Edit the draft and see your changes
6. **Store for Learning:** Final version is stored with embeddings

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

2. **Environment Variables:**

   - Ensure both API keys are set
   - Check Weaviate host and scheme

   ```bash
   # Verify environment
   cat .env
   ```

3. **Dependencies:**
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

3. **Cloud Deployment**

   - Remote Weaviate hosting
   - Serverless deployment options
   - Multi-user support

4. **Analytics and Insights**
   - Track success rates
   - Analyze improvement patterns
   - Performance metrics

## License

This project is open-source and available under the MIT License.
