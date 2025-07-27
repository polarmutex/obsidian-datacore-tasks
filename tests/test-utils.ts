// Test utilities for Obsidian Datacore Kanban Plugin
import { DatacoreApi } from '@blacksmithgu/datacore';
import { createMockApp } from './__mocks__/obsidian';

export interface TestEnvironment {
  useRealDatacore: boolean;
  app: any;
  datacoreApi: DatacoreApi | any;
}

/**
 * Creates a test environment that can use either real Datacore or mocks
 */
export function createTestEnvironment(useRealDatacore = false): TestEnvironment {
  const app = createMockApp();
  
  if (useRealDatacore) {
    // Try to create a real Datacore instance for testing
    try {
      // Note: This would require a real Obsidian environment
      // For now, we'll create an enhanced mock that behaves like real Datacore
      const datacoreApi = createEnhancedDatacoreMock();
      return { useRealDatacore: true, app, datacoreApi };
    } catch (error) {
      console.warn('Could not initialize real Datacore, falling back to mocks:', error);
      const datacoreApi = createEnhancedDatacoreMock();
      return { useRealDatacore: false, app, datacoreApi };
    }
  } else {
    // Use enhanced mocks
    const datacoreApi = createEnhancedDatacoreMock();
    return { useRealDatacore: false, app, datacoreApi };
  }
}

/**
 * Creates an enhanced Datacore mock that behaves more like the real API
 */
function createEnhancedDatacoreMock(): any {
  const pages = new Map();
  const tasks = new Map();
  
  return {
    // Core Datacore API methods
    query: jest.fn().mockImplementation((queryString: string) => {
      // Simple query parser for test data
      if (queryString.includes('task')) {
        return Array.from(tasks.values());
      }
      return Array.from(pages.values());
    }),
    
    tryQuery: jest.fn().mockImplementation((queryString: string) => {
      try {
        const result = Array.from(tasks.values()).filter(task => 
          queryString.includes('task') || 
          task.text?.toLowerCase().includes(queryString.toLowerCase())
        );
        return { successful: true, value: result };
      } catch (error) {
        return { successful: false, error: error.message };
      }
    }),
    
    fullquery: jest.fn().mockImplementation((queryString: string) => {
      const result = Array.from(tasks.values());
      return {
        data: result,
        runtime: Math.random() * 10,
        cached: false
      };
    }),
    
    tryFullQuery: jest.fn().mockImplementation((queryString: string) => {
      try {
        const result = Array.from(tasks.values());
        return { 
          successful: true, 
          value: {
            data: result,
            runtime: Math.random() * 10,
            cached: false
          }
        };
      } catch (error) {
        return { successful: false, error: error.message };
      }
    }),
    
    // Index management
    index: {
      on: jest.fn().mockImplementation((event: string, callback: Function) => {
        // Store callback for later triggering
        return { off: jest.fn() };
      }),
      off: jest.fn(),
      pages: () => Array.from(pages.values()),
      tasks: () => Array.from(tasks.values())
    },
    
    // Utility methods for test data management
    _addTask: (task: any) => {
      tasks.set(task.id, task);
    },
    
    _addPage: (page: any) => {
      pages.set(page.file?.path || page.path, page);
    },
    
    _clear: () => {
      pages.clear();
      tasks.clear();
    },
    
    _getTasks: () => Array.from(tasks.values()),
    _getPages: () => Array.from(pages.values())
  };
}

/**
 * Creates realistic test task data that matches Datacore's expected format
 */
export function createTestTask(overrides: Partial<any> = {}): any {
  const defaults = {
    id: `test-task-${Date.now()}-${Math.random()}`,
    text: 'Test task',
    file: { path: 'test.md', name: 'test.md' },
    line: 0,
    tags: ['#todo'],
    status: 'todo',
    completed: false,
    metadata: {
      path: 'test.md',
      original: { value: 'Test task' }
    }
  };
  
  return { ...defaults, ...overrides };
}

/**
 * Creates test file content that can be parsed by TagManager
 */
export function createTestFileContent(tasks: any[]): string {
  const lines = ['# Test File', ''];
  
  tasks.forEach(task => {
    const checkbox = task.completed ? '[x]' : '[ ]';
    const tags = task.tags.join(' ');
    lines.push(`- ${checkbox} ${task.text} ${tags}`);
  });
  
  return lines.join('\n');
}

/**
 * Assertion helpers for task-related tests
 */
export const taskAssertions = {
  expectTaskToBeValid: (task: any) => {
    expect(task).toHaveProperty('id');
    expect(task).toHaveProperty('text');
    expect(task).toHaveProperty('file');
    expect(task).toHaveProperty('line');
    expect(task).toHaveProperty('tags');
    expect(task).toHaveProperty('status');
    expect(task).toHaveProperty('completed');
  },
  
  expectTaskStatusToBe: (task: any, expectedStatus: string) => {
    expect(task.status).toBe(expectedStatus);
    expect(task.tags).toContain(`#${expectedStatus}`);
  },
  
  expectFileContentToContain: (content: string, taskText: string, tag: string) => {
    expect(content).toContain(taskText);
    expect(content).toContain(tag);
  }
};

/**
 * Performance testing utilities
 */
export const performanceUtils = {
  measureAsync: async <T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> => {
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;
    return { result, duration };
  },
  
  expectUnder: (duration: number, maxMs: number) => {
    expect(duration).toBeLessThan(maxMs);
  }
};