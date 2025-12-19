# Continuous Integration (CI)

This project uses **GitHub Actions** for continuous integration. The CI pipeline automatically runs on every push and pull request to ensure code quality and prevent regressions.

## 🔄 Workflows

### Main CI Workflow (`.github/workflows/ci.yml`)

The main CI workflow runs four parallel jobs:

#### 1. **Lint**

- Runs ESLint to check code quality and style
- Allows up to 10,000 warnings (configurable)
- Fails only on errors to keep the pipeline practical

#### 2. **Type Check**

- Runs TypeScript compiler (`tsc --noEmit`)
- Ensures type safety across the codebase
- No runtime code is generated, only type checking

#### 3. **Test**

- Runs the full test suite using Vitest
- Tests across multiple Node.js versions (18, 20, 22)
- Generates code coverage reports
- Uploads coverage to Codecov (if configured)

#### 4. **Build**

- Builds the Next.js application
- Ensures the production build works
- Uses a dummy database URL for build-time checks

### PR Comment Workflow (`.github/workflows/pr-comment.yml`)

This workflow automatically comments on pull requests with:

- Test results summary
- Code coverage metrics
- Updates the same comment on subsequent pushes

## 🚀 Running CI Checks Locally

Before pushing your code, you can run the same checks locally:

```bash
# Run linting
npm run lint

# Run type checking
npx tsc --noEmit

# Run tests
npm test

# Run tests with coverage
npm test -- --coverage

# Build the application
npm run build
```

## 📊 Code Coverage

Code coverage is tracked using Vitest's built-in coverage tool (v8 provider). Coverage reports are:

- Generated in the `coverage/` directory (gitignored)
- Uploaded to Codecov on the main branch
- Displayed in PR comments

### Coverage Configuration

The coverage configuration is in `vitest.config.mts`:

- **Provider**: v8 (fast and accurate)
- **Reporters**: text, json, html, lcov
- **Excluded**: node_modules, design system, config files, mock data

## 🎯 CI Status Badge

The README includes a CI status badge that shows the current build status:

[![CI](https://github.com/ornelasEduardo/moneyprinter/actions/workflows/ci.yml/badge.svg)](https://github.com/ornelasEduardo/moneyprinter/actions/workflows/ci.yml)

## 🔧 Customizing CI

### Adjusting Warning Threshold

To change the maximum allowed ESLint warnings, edit `.github/workflows/ci.yml`:

```yaml
- name: Run ESLint
  run: npm run lint -- --max-warnings 100
```

### Adding Node Versions

To test against additional Node versions, edit the test job matrix:

```yaml
strategy:
  matrix:
    node-version: [18, 20, 22, 24] # Add more versions here
```

### Enabling Codecov

To enable code coverage uploads:

1. Sign up at [codecov.io](https://codecov.io)
2. Add your repository
3. Add `CODECOV_TOKEN` to your GitHub repository secrets
4. The workflow will automatically upload coverage

## 🐛 Troubleshooting

### CI Fails on Lint

If linting fails:

1. Run `npm run lint` locally
2. Fix errors (not warnings)
3. Consider using `npm run lint -- --fix` for auto-fixable issues

### CI Fails on Type Check

If type checking fails:

1. Run `npx tsc --noEmit` locally
2. Fix type errors
3. Ensure all dependencies are properly typed

### CI Fails on Tests

If tests fail:

1. Run `npm test` locally
2. Fix failing tests
3. Ensure all mocks are properly configured

### CI Fails on Build

If the build fails:

1. Run `npm run build` locally
2. Check for build-time errors
3. Ensure environment variables are properly handled

## 📝 Best Practices

1. **Always run checks locally** before pushing
2. **Keep the build green** - fix failing tests promptly
3. **Review PR comments** - they contain valuable coverage info
4. **Don't ignore type errors** - they often indicate real bugs
5. **Write tests for new features** - maintain or improve coverage

## 🔗 Related Documentation

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Vitest Documentation](https://vitest.dev/)
- [ESLint Documentation](https://eslint.org/)
- [TypeScript Documentation](https://www.typescriptlang.org/)
