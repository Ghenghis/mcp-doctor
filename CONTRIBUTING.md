# Contributing to MCP Doctor

Thank you for considering contributing to MCP Doctor! This document outlines the process for contributing to the project.

## Code of Conduct

By participating in this project, you agree to abide by the [Code of Conduct](CODE_OF_CONDUCT.md).

## How Can I Contribute?

### Reporting Bugs

This section guides you through submitting a bug report for MCP Doctor. Following these guidelines helps maintainers and the community understand your report, reproduce the behavior, and find related reports.

- **Use the GitHub issue tracker** - Report bugs by opening a new issue in the [GitHub issue tracker](https://github.com/Ghenghis/mcp-doctor/issues).
- **Use the bug report template** - When you create a new issue, select the "Bug Report" template and fill in the required information.
- **Provide detailed steps to reproduce** - Include specific steps to reproduce the behavior, along with any relevant information about your environment.
- **Describe the behavior you observed** - Describe what actually happened and what you expected to happen.
- **Include screenshots if applicable** - If possible, include screenshots or GIFs to help demonstrate the problem.

### Suggesting Enhancements

This section guides you through submitting an enhancement suggestion for MCP Doctor, including completely new features and minor improvements to existing functionality.

- **Use the GitHub issue tracker** - Enhancement suggestions are tracked as GitHub issues.
- **Use the feature request template** - When you create a new issue, select the "Feature Request" template and fill in the required information.
- **Provide a clear and detailed explanation** - Include a step-by-step description of the suggested enhancement, along with any relevant screenshots or mockups.
- **Explain why this enhancement would be useful** - Explain why this feature or improvement would be useful to most MCP Doctor users.

### Pull Requests

- **Submit pull requests from a new branch** - Create a new branch for your feature or bugfix and submit a pull request from that branch to the `main` branch.
- **Follow the code style** - Make sure your code follows the code style of the project.
- **Write tests** - If you're fixing a bug or adding a new feature, please include tests.
- **Document your changes** - Update the documentation to reflect any changes.
- **Keep pull requests focused** - Each pull request should be focused on a single feature or bugfix.

## Development Process

### Setting Up Development Environment

```bash
# Clone the repository
git clone https://github.com/Ghenghis/mcp-doctor.git

# Navigate to the project directory
cd mcp-doctor

# Install dependencies
npm install

# Run in development mode
npm run dev
```

### Project Structure

```
mcp-doctor/
├── src/                # Source code
│   ├── app/            # Application management
│   ├── core/           # Core functionality
│   │   ├── backup/     # Backup management
│   │   ├── config/     # Configuration handling
│   │   ├── diagnostics/ # Diagnostic tools
│   │   └── logging/    # Logging system
│   ├── services/       # Application services
│   ├── types/          # TypeScript type definitions
│   └── index.ts        # Application entry point
├── dist/               # Compiled output
├── assets/             # Application assets
│   └── icons/          # Application icons
├── docs/               # Documentation
└── ...
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Building the Application

```bash
# Build the application
npm run build

# Build the Electron application for the current platform
npm run electron:build
```

## Styleguides

### Git Commit Messages

- Use the present tense ("Add feature" not "Added feature")
- Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
- Limit the first line to 72 characters or less
- Reference issues and pull requests liberally after the first line

### TypeScript Styleguide

- All TypeScript code is linted with ESLint and follows the configured rules
- Use types for all variables and function parameters
- Use interfaces for complex types
- Use enums for sets of related constants
- Document all public functions, classes, interfaces, and types with JSDoc comments
- Use dependency injection for services and components

### Documentation Styleguide

- Use Markdown for documentation
- Document all public APIs
- Include examples for non-trivial functionality

## License

By contributing to MCP Doctor, you agree that your contributions will be licensed under the project's [MIT License](LICENSE).