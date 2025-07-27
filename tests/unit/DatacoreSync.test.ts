import { DatacoreSync, TaskItem } from '../../src/DatacoreSync';
import { createMockApp, createMockFile } from '../__mocks__/obsidian';
import { createMockDatacoreApi, createMockQuery } from '../__mocks__/@blacksmithgu/datacore';
import { sampleDatacoreResults, sampleFileContents, sampleTasks } from '../fixtures/sample-tasks';

// Mock the dependencies
jest.mock('obsidian');
jest.mock('@blacksmithgu/datacore');

describe('DatacoreSync', () => {
  let datacoreSync: DatacoreSync;
  let mockApp: any;
  let mockPlugin: any;
  let mockDatacoreApi: any;

  beforeEach(() => {
    mockApp = {
      vault: {
        read: jest.fn(),
        modify: jest.fn(),
        getAbstractFileByPath: jest.fn(),
        on: jest.fn(),
        off: jest.fn(),
        offref: jest.fn()
      },
      workspace: {
        getLeavesOfType: jest.fn().mockReturnValue([]),
        getRightLeaf: jest.fn(),
        revealLeaf: jest.fn(),
        on: jest.fn(),
        off: jest.fn(),
        trigger: jest.fn()
      },
      plugins: {
        plugins: {},
        getPlugin: jest.fn(),
        enabledPlugins: new Set()
      },
      setting: {
        open: jest.fn(),
        openTabById: jest.fn()
      }
    };
    
    mockPlugin = {
      settings: {
        datacoreQuery: '@task'
      },
      registerEvent: jest.fn(),
      loadData: jest.fn().mockResolvedValue({}),
      saveData: jest.fn().mockResolvedValue(undefined)
    };
    mockDatacoreApi = createMockDatacoreApi();
    
    datacoreSync = new DatacoreSync(mockApp, mockPlugin);
  });

  afterEach(() => {
    datacoreSync.cleanup();
  });

  describe('initialize', () => {
    it('should initialize successfully when Datacore plugin is available', async () => {
      // Arrange
      mockApp.plugins.plugins['datacore'] = {
        api: mockDatacoreApi
      };

      // Act
      const result = await datacoreSync.initialize();

      // Assert
      expect(result).toBe(true);
      expect(datacoreSync.isReady).toBe(true);
      expect(datacoreSync.api).toBe(mockDatacoreApi);
    });

    it('should fail to initialize when Datacore plugin is not available', async () => {
      // Arrange
      mockApp.plugins.plugins = {};

      // Act
      const result = await datacoreSync.initialize();

      // Assert
      expect(result).toBe(false);
      expect(datacoreSync.isReady).toBe(false);
    });

    it('should set up event listeners after successful initialization', async () => {
      // Arrange
      mockApp.plugins.plugins['datacore'] = {
        api: mockDatacoreApi
      };

      // Act
      await datacoreSync.initialize();

      // Assert
      expect(mockDatacoreApi.index.on).toHaveBeenCalledWith('update', expect.any(Function));
      expect(mockApp.vault.on).toHaveBeenCalledWith('modify', expect.any(Function));
    });
  });

  describe('getTasks', () => {
    beforeEach(async () => {
      mockApp.plugins.plugins['datacore'] = {
        api: mockDatacoreApi
      };
      await datacoreSync.initialize();
    });

    it('should return empty array when API is not ready', async () => {
      // Arrange
      const uninitializedSync = new DatacoreSync(mockApp, mockPlugin);

      // Act
      const tasks = await uninitializedSync.getTasks();

      // Assert
      expect(tasks).toEqual([]);
    });

    it('should parse table query results correctly', async () => {
      // Arrange
      const mockQuery = createMockQuery(sampleDatacoreResults.table);
      mockDatacoreApi.query.mockResolvedValue(mockQuery);
      
      mockApp.vault.getAbstractFileByPath.mockReturnValue(createMockFile('tasks.md'));
      mockApp.vault.read.mockResolvedValue(sampleFileContents['tasks.md']);

      // Act
      const tasks = await datacoreSync.getTasks();

      // Assert
      expect(tasks).toHaveLength(4);
      expect(tasks[0]).toHaveValidTaskStructure();
      expect(tasks[0].text).toBe('Complete project documentation');
      expect(tasks[0].status).toBe('todo');
    });

    it('should parse list query results correctly', async () => {
      // Arrange
      const mockQuery = createMockQuery(sampleDatacoreResults.list);
      mockDatacoreApi.query.mockResolvedValue(mockQuery);
      
      mockApp.vault.getAbstractFileByPath.mockReturnValue(createMockFile('tasks.md'));
      mockApp.vault.read.mockResolvedValue(sampleFileContents['tasks.md']);

      // Act
      const tasks = await datacoreSync.getTasks();

      // Assert
      expect(tasks).toHaveLength(2);
      expect(tasks[0]).toHaveValidTaskStructure();
      expect(tasks[0].text).toBe('Complete project documentation');
    });

    it('should handle query failures gracefully', async () => {
      // Arrange
      mockDatacoreApi.query.mockResolvedValue({
        successful: false,
        error: 'Query failed'
      });

      // Act
      const tasks = await datacoreSync.getTasks();

      // Assert
      expect(tasks).toEqual([]);
    });

    it('should extract tags from task lines correctly', async () => {
      // Arrange
      const mockQuery = createMockQuery(sampleDatacoreResults.table);
      mockDatacoreApi.query.mockResolvedValue(mockQuery);
      
      mockApp.vault.getAbstractFileByPath.mockReturnValue(createMockFile('tasks.md'));
      mockApp.vault.read.mockResolvedValue(sampleFileContents['tasks.md']);

      // Act
      const tasks = await datacoreSync.getTasks();

      // Assert
      expect(tasks[0].tags).toContain('#todo');
      expect(tasks[0].tags).toContain('#work');
      expect(tasks[1].tags).toContain('#doing');
      expect(tasks[1].tags).toContain('#development');
    });
  });

  describe('refresh', () => {
    beforeEach(async () => {
      mockApp.plugins.plugins['datacore'] = {
        api: mockDatacoreApi
      };
      await datacoreSync.initialize();
    });

    it('should trigger workspace refresh event', async () => {
      // Act
      await datacoreSync.refresh();

      // Assert
      expect(mockApp.workspace.trigger).toHaveBeenCalledWith('datacore-kanban:refresh');
    });
  });

  describe('cleanup', () => {
    beforeEach(async () => {
      mockApp.plugins.plugins['datacore'] = {
        api: mockDatacoreApi
      };
      await datacoreSync.initialize();
    });

    it('should clean up event listeners and timers', () => {
      // Act
      datacoreSync.cleanup();

      // Assert
      expect(datacoreSync.isReady).toBe(false);
      expect(datacoreSync.api).toBe(null);
    });
  });

  describe('task parsing edge cases', () => {
    beforeEach(async () => {
      mockApp.plugins.plugins['datacore'] = {
        api: mockDatacoreApi
      };
      await datacoreSync.initialize();
    });

    it('should handle tasks without tags', async () => {
      // Arrange
      const queryResult = {
        type: 'table' as const,
        data: {
          headers: ['task', 'status'],
          values: [
            [
              { value: 'Simple task', path: 'simple.md' },
              { value: 'todo' }
            ]
          ]
        }
      };
      
      mockDatacoreApi.query.mockResolvedValue(createMockQuery(queryResult));
      mockApp.vault.getAbstractFileByPath.mockReturnValue(createMockFile('simple.md'));
      mockApp.vault.read.mockResolvedValue('- [ ] Simple task');

      // Act
      const tasks = await datacoreSync.getTasks();

      // Assert
      expect(tasks).toHaveLength(1);
      expect(tasks[0].tags).toEqual([]);
    });

    it('should handle missing file gracefully', async () => {
      // Arrange
      const queryResult = {
        type: 'table' as const,
        data: {
          headers: ['task'],
          values: [
            [{ value: 'Missing task', path: 'missing.md' }]
          ]
        }
      };
      
      mockDatacoreApi.query.mockResolvedValue(createMockQuery(queryResult));
      mockApp.vault.getAbstractFileByPath.mockReturnValue(null);

      // Act
      const tasks = await datacoreSync.getTasks();

      // Assert
      expect(tasks).toEqual([]);
    });

    it('should handle file read errors gracefully', async () => {
      // Arrange
      const queryResult = {
        type: 'table' as const,
        data: {
          headers: ['task'],
          values: [
            [{ value: 'Error task', path: 'error.md' }]
          ]
        }
      };
      
      mockDatacoreApi.query.mockResolvedValue(createMockQuery(queryResult));
      mockApp.vault.getAbstractFileByPath.mockReturnValue(createMockFile('error.md'));
      mockApp.vault.read.mockRejectedValue(new Error('File read error'));

      // Act
      const tasks = await datacoreSync.getTasks();

      // Assert
      expect(tasks).toEqual([]);
    });
  });
});