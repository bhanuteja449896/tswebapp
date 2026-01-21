# Contributing to TaskFlow API

First off, thank you for considering contributing to TaskFlow API! It's people like you that make TaskFlow such a great tool.

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the existing issues to avoid duplicates. When you are creating a bug report, please include as many details as possible:

* **Use a clear and descriptive title**
* **Describe the exact steps to reproduce the problem**
* **Provide specific examples**
* **Describe the behavior you observed**
* **Explain which behavior you expected to see instead**
* **Include screenshots if possible**

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, please include:

* **Use a clear and descriptive title**
* **Provide a step-by-step description of the suggested enhancement**
* **Provide specific examples to demonstrate the steps**
* **Describe the current behavior and explain which behavior you expected to see instead**
* **Explain why this enhancement would be useful**

### Pull Requests

1. Fork the repository
2. Create a new branch from `develop`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. Make your changes
4. Add or update tests as needed
5. Ensure all tests pass:
   ```bash
   npm test
   ```
6. Ensure code quality checks pass:
   ```bash
   npm run lint
   npm run typecheck
   ```
7. Commit your changes using conventional commits:
   ```bash
   git commit -m "feat: add amazing feature"
   ```
8. Push to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```
9. Open a Pull Request

## Development Setup

### Prerequisites

- Node.js 18+
- MongoDB 6+
- Git

### Setup Steps

1. Clone your fork:
   ```bash
   git clone https://github.com/your-username/taskflow-api.git
   cd taskflow-api
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create `.env` file:
   ```bash
   cp .env.example .env
   ```

4. Start development server:
   ```bash
   npm run dev
   ```

## Coding Guidelines

### TypeScript Style Guide

- Use meaningful variable and function names
- Write self-documenting code
- Add JSDoc comments for public APIs
- Use TypeScript types instead of `any` when possible
- Follow existing code patterns

### Commit Message Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
type(scope): subject

body

footer
```

**Types:**
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that don't affect code meaning (formatting, etc.)
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `perf`: Performance improvement
- `test`: Adding or updating tests
- `chore`: Changes to build process or auxiliary tools

**Examples:**
```
feat(auth): add password reset functionality
fix(tasks): resolve duplicate task creation issue
docs(api): update authentication endpoint documentation
test(projects): add integration tests for project CRUD
```

### Testing Guidelines

- Write tests for all new features
- Maintain test coverage above 70%
- Write both unit and integration tests
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)

**Example:**
```typescript
describe('User Registration', () => {
  it('should create a new user with valid data', async () => {
    // Arrange
    const userData = {
      email: 'test@example.com',
      password: 'password123',
      firstName: 'John',
      lastName: 'Doe',
      username: 'johndoe'
    };

    // Act
    const user = await User.create(userData);

    // Assert
    expect(user).toBeDefined();
    expect(user.email).toBe(userData.email);
  });
});
```

## Review Process

1. All pull requests require at least one review
2. All tests must pass
3. Code coverage must not decrease
4. No linting errors
5. Documentation must be updated if needed

## Questions?

Feel free to open an issue with the question label or reach out to the maintainers.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
