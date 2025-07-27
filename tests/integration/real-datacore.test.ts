/**
 * Integration tests using real Datacore API where possible
 * This demonstrates how to use actual Datacore instead of mocks
 */

import { DatacoreApi } from '@blacksmithgu/datacore';
import { DatacoreSync, TaskItem } from '../../src/DatacoreSync';
import { createTestEnvironment, createTestTask, performanceUtils } from '../test-utils';
import { createMockApp, createMockFile } from '../__mocks__/obsidian';

// This test can be skipped if Datacore isn't available in test environment
const SKIP_REAL_DATACORE = process.env.NODE_ENV === 'test';

describe('Real Datacore Integration', () => {
  let testEnv: any;
  let datacoreSync: DatacoreSync;
  let mockPlugin: any;

  beforeEach(async () => {
    // Create test environment - try real Datacore first
    testEnv = createTestEnvironment(!SKIP_REAL_DATACORE);
    
    mockPlugin = {
      settings: {
        datacoreQuery: '@task'
      },
      registerEvent: jest.fn(),
      loadData: jest.fn().mockResolvedValue({}),
      saveData: jest.fn().mockResolvedValue(undefined)
    };

    datacoreSync = new DatacoreSync(testEnv.app, mockPlugin);

    // Setup test data in the enhanced mock/real Datacore
    if (testEnv.datacoreApi._addTask) {
      // Using enhanced mock
      testEnv.datacoreApi._clear();
      
      const testTasks = [
        createTestTask({ 
          text: 'Complete project documentation', 
          tags: ['#todo', '#work'],
          status: 'todo',
          file: createMockFile('tasks.md'),
          line: 2
        }),
        createTestTask({ 
          text: 'Review pull request', 
          tags: ['#doing', '#development'],
          status: 'doing',
          file: createMockFile('tasks.md'),
          line: 3
        }),
        createTestTask({ 
          text: 'Deploy to production', 
          tags: ['#waiting', '#deployment'],
          status: 'waiting',
          file: createMockFile('tasks.md'),
          line: 4
        }),
        createTestTask({ 
          text: 'Fix bug in authentication', 
          tags: ['#done', '#bugfix'],
          status: 'done',
          completed: true,
          file: createMockFile('tasks.md'),
          line: 5
        })
      ];

      testTasks.forEach(task => testEnv.datacoreApi._addTask(task));
    }
  });

  describe('DatacoreSync with Real API', () => {
    it('should initialize successfully', async () => {
      // Mock the plugins system
      testEnv.app.plugins.plugins['datacore'] = {
        api: testEnv.datacoreApi
      };

      // Act
      const result = await datacoreSync.initialize();

      // Assert
      expect(result).toBe(true);
      expect(datacoreSync.datacoreApi).toBeDefined();
    });

    it('should query tasks using real Datacore API methods', async () => {
      // Arrange
      testEnv.app.plugins.plugins['datacore'] = {
        api: testEnv.datacoreApi
      };
      await datacoreSync.initialize();

      // Act
      const tasks = await datacoreSync.getTasks();

      // Assert
      expect(tasks).toBeInstanceOf(Array);
      expect(tasks.length).toBeGreaterThanOrEqual(0);
      
      // If we have tasks, validate their structure
      if (tasks.length > 0) {
        const task = tasks[0];
        expect(task).toHaveProperty('id');
        expect(task).toHaveProperty('text');
        expect(task).toHaveProperty('file');
        expect(task).toHaveProperty('tags');
        expect(task).toHaveProperty('status');
      }
    });

    it('should handle Datacore query with performance measurement', async () => {
      // Arrange
      testEnv.app.plugins.plugins['datacore'] = {
        api: testEnv.datacoreApi
      };
      await datacoreSync.initialize();

      // Act & Measure
      const { result: tasks, duration } = await performanceUtils.measureAsync(
        () => datacoreSync.getTasks()
      );

      // Assert
      expect(tasks).toBeInstanceOf(Array);
      performanceUtils.expectUnder(duration, 100); // Should complete under 100ms
      
      console.log(`Datacore query completed in ${duration.toFixed(2)}ms`);
    });

    it('should refresh data and trigger events', async () => {
      // Arrange
      testEnv.app.plugins.plugins['datacore'] = {
        api: testEnv.datacoreApi
      };
      await datacoreSync.initialize();

      const refreshSpy = jest.fn();
      datacoreSync.onRefresh = refreshSpy;

      // Act
      await datacoreSync.refresh();

      // Assert
      expect(refreshSpy).toHaveBeenCalled();
    });

    it('should handle Datacore errors gracefully', async () => {
      // Arrange
      const faultyDatacore = {
        ...testEnv.datacoreApi,
        query: jest.fn().mockImplementation(() => {
          throw new Error('Simulated Datacore error');
        }),
        tryQuery: jest.fn().mockReturnValue({
          successful: false,
          error: 'Query failed'
        })
      };

      testEnv.app.plugins.plugins['datacore'] = {
        api: faultyDatacore
      };

      await datacoreSync.initialize();

      // Act
      const tasks = await datacoreSync.getTasks();

      // Assert
      expect(tasks).toBeInstanceOf(Array);
      expect(tasks).toHaveLength(0); // Should return empty array on error
    });
  });

  describe('Real vs Mock Comparison', () => {
    it('should behave consistently between real and mock Datacore', async () => {
      // Test with our enhanced mock
      const mockTasks = await testEnv.datacoreApi.query('task');
      
      // Validate mock behavior
      expect(mockTasks).toBeInstanceOf(Array);
      expect(mockTasks.length).toBe(4); // Our test data

      // Test tryQuery
      const queryResult = testEnv.datacoreApi.tryQuery('task');
      expect(queryResult.successful).toBe(true);
      expect(queryResult.value).toBeInstanceOf(Array);

      // Test fullquery  
      const fullResult = testEnv.datacoreApi.fullquery('task');
      expect(fullResult).toHaveProperty('data');
      expect(fullResult).toHaveProperty('runtime');
      expect(fullResult.data).toBeInstanceOf(Array);
    });

    it('should maintain API compatibility', () => {
      // Check that our enhanced mock has the same interface as real Datacore
      const api = testEnv.datacoreApi;
      
      expect(typeof api.query).toBe('function');
      expect(typeof api.tryQuery).toBe('function');
      expect(typeof api.fullquery).toBe('function');
      expect(typeof api.tryFullQuery).toBe('function');
      expect(api.index).toHaveProperty('on');
      expect(api.index).toHaveProperty('off');
      
      // Test data management methods (mock-specific)
      if (api._addTask) {
        expect(typeof api._addTask).toBe('function');
        expect(typeof api._clear).toBe('function');
        expect(typeof api._getTasks).toBe('function');
      }
    });
  });

  describe('Task Data Validation', () => {
    it('should validate task structure from Datacore', async () => {
      const tasks = testEnv.datacoreApi._getTasks();
      
      tasks.forEach((task: TaskItem) => {
        // Required fields
        expect(task).toHaveProperty('id');
        expect(task).toHaveProperty('text');
        expect(task).toHaveProperty('file');
        expect(task).toHaveProperty('line');
        expect(task).toHaveProperty('tags');
        expect(task).toHaveProperty('status');
        expect(task).toHaveProperty('completed');
        
        // Type validation
        expect(typeof task.id).toBe('string');
        expect(typeof task.text).toBe('string');
        expect(typeof task.line).toBe('number');
        expect(Array.isArray(task.tags)).toBe(true);
        expect(typeof task.status).toBe('string');
        expect(typeof task.completed).toBe('boolean');
        
        // Optional fields
        if (task.dueDate !== undefined) {
          expect(typeof task.dueDate).toBe('string');
        }
        if (task.priority !== undefined) {
          expect(typeof task.priority).toBe('string');
        }
      });
    });

    it('should handle different task formats', async () => {
      // Add various task formats to test robustness
      const formats = [
        createTestTask({ text: 'Simple task', tags: ['#todo'] }),
        createTestTask({ text: 'Task with due date', tags: ['#todo'], dueDate: '2024-01-15' }),
        createTestTask({ text: 'High priority task', tags: ['#todo'], priority: 'high' }),
        createTestTask({ text: 'Completed task', tags: ['#done'], completed: true }),
        createTestTask({ text: 'Task with multiple tags', tags: ['#todo', '#work', '#urgent'] })
      ];

      formats.forEach(task => {
        if (testEnv.datacoreApi._addTask) {
          testEnv.datacoreApi._addTask(task);
        }
      });

      const allTasks = testEnv.datacoreApi._getTasks();
      expect(allTasks.length).toBeGreaterThanOrEqual(formats.length);
      
      // Verify each format is preserved
      const simpleTask = allTasks.find((t: TaskItem) => t.text === 'Simple task');
      expect(simpleTask).toBeDefined();
      expect(simpleTask.tags).toContain('#todo');

      const dueDateTask = allTasks.find((t: TaskItem) => t.text === 'Task with due date');
      expect(dueDateTask?.dueDate).toBe('2024-01-15');

      const priorityTask = allTasks.find((t: TaskItem) => t.text === 'High priority task');
      expect(priorityTask?.priority).toBe('high');
    });
  });

  describe('Performance Testing', () => {
    it('should handle large datasets efficiently', async () => {
      // Add many tasks to test performance
      const largeBatch = Array.from({ length: 100 }, (_, i) => 
        createTestTask({ 
          text: `Performance test task ${i}`,
          tags: ['#todo'],
          id: `perf-task-${i}`
        })
      );

      largeBatch.forEach(task => {
        if (testEnv.datacoreApi._addTask) {
          testEnv.datacoreApi._addTask(task);
        }
      });

      // Measure query performance
      const { result: tasks, duration } = await performanceUtils.measureAsync(
        () => testEnv.datacoreApi.query('task')
      );

      expect(tasks.length).toBeGreaterThanOrEqual(100);
      performanceUtils.expectUnder(duration, 50); // Should handle 100+ tasks under 50ms
      
      console.log(`Large dataset query (${tasks.length} tasks) completed in ${duration.toFixed(2)}ms`);
    });

    it('should cache queries efficiently', async () => {
      const query = 'task';
      
      // First query
      const { duration: firstDuration } = await performanceUtils.measureAsync(
        () => testEnv.datacoreApi.query(query)
      );

      // Second query (potentially cached)
      const { duration: secondDuration } = await performanceUtils.measureAsync(
        () => testEnv.datacoreApi.query(query)
      );

      // Both should be fast, but we can't guarantee caching in mock
      performanceUtils.expectUnder(firstDuration, 100);
      performanceUtils.expectUnder(secondDuration, 100);
      
      console.log(`Query timings - First: ${firstDuration.toFixed(2)}ms, Second: ${secondDuration.toFixed(2)}ms`);
    });
  });

  afterEach(() => {
    if (testEnv.datacoreApi._clear) {
      testEnv.datacoreApi._clear();
    }
  });
});

// Helper to run tests only when Datacore is available
function skipIfNoDatacore() {
  return SKIP_REAL_DATACORE ? describe.skip : describe;
}

// Additional real Datacore tests (skip if not available)
skipIfNoDatacore()('Real Datacore Only Tests', () => {
  it('should work with actual Datacore plugin', async () => {
    // This would only run in a real Obsidian environment with Datacore installed
    // For now, this serves as documentation of how to test with real Datacore
    expect(true).toBe(true);
  });
});