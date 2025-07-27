# Test Suite Documentation

This directory contains comprehensive tests for the Obsidian Datacore Kanban plugin.

## Test Structure

```
tests/
├── unit/                           # Unit tests for individual components
│   ├── DatacoreSync.test.ts       # Tests for Datacore API integration
│   ├── TagManager.test.ts         # Tests for tag management system
│   ├── TasksPluginIntegration.test.ts # Tests for Tasks plugin compatibility
│   └── KanbanBoard.test.ts        # Tests for kanban board logic
├── integration/                    # Integration tests for component interactions
│   ├── plugin-integration.test.ts # End-to-end plugin functionality tests
│   └── datacore-tasks-integration.test.ts # Datacore-Tasks plugin integration
├── __mocks__/                      # Mock implementations
│   ├── obsidian.ts               # Mock Obsidian API
│   └── @blacksmithgu/datacore.ts # Mock Datacore API
├── fixtures/                       # Test data and fixtures
│   └── sample-tasks.ts           # Sample task data for testing
└── setup.ts                       # Jest setup and global test configuration
```

## Running Tests

### Basic Commands

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run tests for CI/CD
npm run test:ci
```

### Test Categories

```bash
# Run only unit tests
npm test -- tests/unit

# Run only integration tests
npm test -- tests/integration

# Run specific test file
npm test -- DatacoreSync.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="should handle"
```

## Test Coverage

The test suite maintains the following coverage thresholds:
- **Branches**: 70%
- **Functions**: 80%
- **Lines**: 80%
- **Statements**: 80%

### Coverage Reports

Coverage reports are generated in multiple formats:
- **Terminal**: Summary displayed after test run
- **HTML**: Detailed report in `coverage/lcov-report/index.html`
- **LCOV**: Machine-readable format in `coverage/lcov.info`

## Writing Tests

### Unit Test Example

```typescript
import { ComponentName } from '../../src/ComponentName';
import { createMockApp } from '../__mocks__/obsidian';

describe('ComponentName', () => {
  let component: ComponentName;
  let mockApp: any;

  beforeEach(() => {
    mockApp = createMockApp();
    component = new ComponentName(mockApp);
  });

  describe('methodName', () => {
    it('should behave correctly when given valid input', () => {
      // Arrange
      const input = 'valid input';

      // Act
      const result = component.methodName(input);

      // Assert
      expect(result).toBe('expected output');
    });

    it('should handle error cases gracefully', () => {
      // Arrange
      const invalidInput = null;

      // Act & Assert
      expect(() => component.methodName(invalidInput)).not.toThrow();
    });
  });
});
```

### Integration Test Example

```typescript
import { PluginComponent } from '../../src/PluginComponent';
import { RelatedComponent } from '../../src/RelatedComponent';

describe('Plugin Integration', () => {
  it('should integrate components correctly', async () => {
    // Arrange
    const plugin = new PluginComponent();
    const related = new RelatedComponent();

    // Act
    await plugin.initialize(related);

    // Assert
    expect(plugin.isConnected(related)).toBe(true);
  });
});
```

## Test Utilities

### Custom Matchers

The test suite includes custom Jest matchers:

```typescript
// Check if object is a valid task
expect(task).toBeValidTask();

// Check if object has valid task structure
expect(taskObject).toHaveValidTaskStructure();
```

### Mock Factories

```typescript
// Create mock Obsidian app
const mockApp = createMockApp();

// Create mock file
const mockFile = createMockFile('path/to/file.md');

// Create mock Datacore API
const mockDatacoreApi = createMockDatacoreApi();
```

### Test Fixtures

```typescript
import { sampleTasks, sampleKanbanSettings } from '../fixtures/sample-tasks';

// Use predefined test data
const tasks = sampleTasks;
const settings = sampleKanbanSettings;
```

## Best Practices

### Test Organization

1. **Group related tests** using `describe` blocks
2. **Use descriptive test names** that explain the behavior being tested
3. **Follow AAA pattern**: Arrange, Act, Assert
4. **Test edge cases** and error conditions
5. **Mock external dependencies** to isolate units under test

### Test Data

1. **Use fixtures** for consistent test data
2. **Create minimal test data** that covers the scenario
3. **Avoid hard-coding** values when possible
4. **Use factories** for creating test objects

### Async Testing

```typescript
// Testing async functions
it('should handle async operations', async () => {
  // Arrange
  const asyncOperation = jest.fn().mockResolvedValue('result');

  // Act
  const result = await component.performAsyncOperation();

  // Assert
  expect(result).toBe('result');
  expect(asyncOperation).toHaveBeenCalled();
});

// Testing promises
it('should reject invalid input', async () => {
  // Act & Assert
  await expect(component.validateInput(invalidInput)).rejects.toThrow('Invalid input');
});
```

### Error Testing

```typescript
// Testing error handling
it('should handle errors gracefully', () => {
  // Arrange
  const errorFunction = jest.fn().mockImplementation(() => {
    throw new Error('Test error');
  });

  // Act & Assert
  expect(() => component.callErrorFunction(errorFunction)).not.toThrow();
});
```

## Debugging Tests

### Running Single Tests

```bash
# Run specific test file
npm test -- --testPathPattern=DatacoreSync

# Run specific test case
npm test -- --testNamePattern="should initialize correctly"

# Run with debugging output
npm test -- --verbose
```

### Debug Configuration

For VS Code debugging, add to `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Jest Tests",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

## Continuous Integration

Tests are automatically run on:
- **Push** to main/develop branches
- **Pull requests** to main/develop branches
- **Release** tag creation

### CI/CD Pipeline

1. **Lint** code for style consistency
2. **Type check** with TypeScript
3. **Run tests** with coverage reporting
4. **Security audit** for vulnerabilities
5. **Build** plugin for distribution

## Contributing

When adding new features:

1. **Write tests first** (TDD approach recommended)
2. **Ensure coverage** meets minimum thresholds
3. **Add integration tests** for component interactions
4. **Update documentation** if testing patterns change
5. **Run full test suite** before submitting PR

### Test Checklist

- [ ] Unit tests for new functions/methods
- [ ] Integration tests for component interactions
- [ ] Error handling and edge cases covered
- [ ] Async operations properly tested
- [ ] Mock dependencies appropriately
- [ ] Coverage thresholds maintained
- [ ] Tests pass in CI environment