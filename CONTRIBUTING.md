# Contributing to MCP Doctor

Thank you for your interest in contributing to MCP Doctor! This document outlines the process for contributing to the project and addresses common questions that may arise during the contribution process.

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md). Please read it before contributing.

## Getting Started

### Prerequisites

- Node.js 16+
- npm 7+
- Git

### Setting Up Your Development Environment

1. Fork the repository on GitHub
2. Clone your fork locally
   ```bash
   git clone https://github.com/YOUR-USERNAME/mcp-doctor.git
   cd mcp-doctor
   ```
3. Add the original repository as a remote
   ```bash
   git remote add upstream https://github.com/Ghenghis/mcp-doctor.git
   ```
4. Install dependencies
   ```bash
   npm install
   ```
5. Create a new branch for your work
   ```bash
   git checkout -b feature/your-feature-name
   ```

### Development Workflow

1. Start the development server
   ```bash
   npm run dev
   ```
2. Make your changes and test them
3. Run tests to ensure everything works
   ```bash
   npm test
   ```
4. Commit your changes with a clear and descriptive commit message
   ```bash
   git commit -m "Add new feature: your feature description"
   ```
5. Push to your fork
   ```bash
   git push origin feature/your-feature-name
   ```
6. Create a pull request from your fork to the main repository

## Pull Request Process

1. Ensure your code follows the project's coding standards
2. Update the documentation if needed
3. Make sure all tests pass
4. Fill out the pull request template completely
5. Request review from project maintainers
6. Address any feedback from reviewers

## Coding Guidelines

### TypeScript Style

- Follow the [TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html)
- Use TypeScript features and type safety wherever possible
- Limit the use of `any` type

### React Components

- Create functional components with React hooks
- Organize components by feature in the `/src/components` directory
- Use Material UI for UI components

### Testing

- Write tests for all new features
- Maintain test coverage above 80%
- Place tests in the `/tests` directory with a `.test.tsx` or `.test.ts` extension

### Documentation

- Document all functions, interfaces, and classes
- Add JSDoc comments for complex functionality
- Update README.md and other documentation as needed

## Feature Requests and Bug Reports

### Submitting Feature Requests

1. Check existing issues to avoid duplicates
2. Use the feature request template
3. Provide clear use cases and benefits
4. Be open to discussion and feedback

### Reporting Bugs

1. Check existing issues to avoid duplicates
2. Use the bug report template
3. Include steps to reproduce the bug
4. Provide information about your environment
5. If possible, include screenshots or videos

## Project Structure

The project is organized as follows:

```
mcp-doctor/
├── docs/                    # Documentation
├── public/                  # Static assets
├── scripts/                 # Build and utility scripts
├── src/                     # Source code
│   ├── components/          # React components
│   ├── services/            # Business logic
│   ├── types/               # TypeScript type definitions
│   ├── utils/               # Utility functions
│   └── index.tsx            # Entry point
├── tests/                   # Tests
├── CONTRIBUTING.md          # This file
├── LICENSE                  # Project license
└── README.md                # Project overview
```

## Branch Organization

- `main`: Stable release branch
- `develop`: Integration branch for features
- `feature/*`: Feature development branches
- `bugfix/*`: Bug fix branches
- `release/*`: Release preparation branches

## Release Process

1. Create a release branch from `develop`
   ```bash
   git checkout -b release/v1.0.0 develop
   ```
2. Bump version numbers in `package.json`
3. Update the CHANGELOG.md
4. Fix any last-minute issues
5. Merge to `main` and tag the release
   ```bash
   git tag -a v1.0.0 -m "Version 1.0.0"
   git push origin v1.0.0
   ```
6. Merge `main` back to `develop`

## License

By contributing to MCP Doctor, you agree that your contributions will be licensed under the project's [MIT License](LICENSE).

## Questions?

If you have any questions or need help with the contribution process, please:
- Join our [Discord community](https://discord.gg/mcp-doctor)
- Open an issue with your question
- Contact the project maintainers directly

Thank you for contributing to MCP Doctor!
