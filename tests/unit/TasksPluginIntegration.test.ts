import { TasksPluginIntegration } from '../../src/TasksPluginIntegration';
import { createMockApp } from '../__mocks__/obsidian';

// Mock the dependencies
jest.mock('obsidian');

describe('TasksPluginIntegration', () => {
  let tasksIntegration: TasksPluginIntegration;
  let mockApp: any;

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
    
    tasksIntegration = new TasksPluginIntegration(mockApp);
  });

  describe('initialization', () => {
    it('should initialize without Tasks plugin', () => {
      // Arrange
      mockApp.plugins.plugins = {};

      // Act
      const integration = new TasksPluginIntegration(mockApp);

      // Assert
      expect(integration.isAvailable).toBe(false);
    });

    it('should initialize with Tasks plugin available', () => {
      // Arrange
      mockApp.plugins.plugins['obsidian-tasks-plugin'] = {
        api: { version: '1.0.0' }
      };

      // Act
      const integration = new TasksPluginIntegration(mockApp);

      // Assert
      expect(integration.isAvailable).toBe(true);
    });
  });

  describe('parseTaskLine', () => {
    it('should parse basic task line', () => {
      // Arrange
      const taskLine = '- [ ] Basic task';

      // Act
      const result = tasksIntegration.parseTaskLine(taskLine);

      // Assert
      expect(result).not.toBeNull();
      expect(result!.text).toBe('Basic task');
      expect(result!.completed).toBe(false);
      expect(result!.priority).toBe('normal');
    });

    it('should parse completed task', () => {
      // Arrange
      const taskLine = '- [x] Completed task';

      // Act
      const result = tasksIntegration.parseTaskLine(taskLine);

      // Assert
      expect(result).not.toBeNull();
      expect(result!.completed).toBe(true);
      expect(result!.text).toBe('Completed task');
    });

    it('should parse task with due date', () => {
      // Arrange
      const taskLine = '- [ ] Task with due date 📅 2024-01-15';

      // Act
      const result = tasksIntegration.parseTaskLine(taskLine);

      // Assert
      expect(result).not.toBeNull();
      expect(result!.due).toBe('2024-01-15');
      expect(result!.text).toBe('Task with due date');
    });

    it('should parse task with high priority', () => {
      // Arrange
      const taskLine = '- [ ] High priority task 🔼';

      // Act
      const result = tasksIntegration.parseTaskLine(taskLine);

      // Assert
      expect(result).not.toBeNull();
      expect(result!.priority).toBe('high');
    });

    it('should parse task with highest priority', () => {
      // Arrange
      const taskLine = '- [ ] Urgent task ⏫';

      // Act
      const result = tasksIntegration.parseTaskLine(taskLine);

      // Assert
      expect(result).not.toBeNull();
      expect(result!.priority).toBe('highest');
    });

    it('should parse task with low priority', () => {
      // Arrange
      const taskLine = '- [ ] Low priority task 🔽';

      // Act
      const result = tasksIntegration.parseTaskLine(taskLine);

      // Assert
      expect(result).not.toBeNull();
      expect(result!.priority).toBe('low');
    });

    it('should parse task with lowest priority', () => {
      // Arrange
      const taskLine = '- [ ] Lowest priority task ⏬';

      // Act
      const result = tasksIntegration.parseTaskLine(taskLine);

      // Assert
      expect(result).not.toBeNull();
      expect(result!.priority).toBe('lowest');
    });

    it('should parse task with multiple dates', () => {
      // Arrange
      const taskLine = '- [ ] Complex task 🛫 2024-01-10 ⏳ 2024-01-12 📅 2024-01-15';

      // Act
      const result = tasksIntegration.parseTaskLine(taskLine);

      // Assert
      expect(result).not.toBeNull();
      expect(result!.scheduled).toBe('2024-01-10');
      expect(result!.starts).toBe('2024-01-12');
      expect(result!.due).toBe('2024-01-15');
    });

    it('should parse task with tags', () => {
      // Arrange
      const taskLine = '- [ ] Task with tags #work #urgent';

      // Act
      const result = tasksIntegration.parseTaskLine(taskLine);

      // Assert
      expect(result).not.toBeNull();
      expect(result!.tags).toContain('#work');
      expect(result!.tags).toContain('#urgent');
    });

    it('should parse recurring task', () => {
      // Arrange
      const taskLine = '- [ ] Recurring task 🔁 every week';

      // Act
      const result = tasksIntegration.parseTaskLine(taskLine);

      // Assert
      expect(result).not.toBeNull();
      expect(result!.isRecurring).toBe(true);
      expect(result!.recurrenceRule).toBe('every week');
    });

    it('should parse indented task', () => {
      // Arrange
      const taskLine = '    - [ ] Indented subtask';

      // Act
      const result = tasksIntegration.parseTaskLine(taskLine);

      // Assert
      expect(result).not.toBeNull();
      expect(result!.indent).toBe(4);
      expect(result!.text).toBe('Indented subtask');
    });

    it('should return null for non-task lines', () => {
      // Arrange
      const nonTaskLines = [
        'This is just text',
        '# Header',
        '## Another header',
        '- Regular bullet point',
        '1. Numbered list item'
      ];

      // Act & Assert
      nonTaskLines.forEach(line => {
        const result = tasksIntegration.parseTaskLine(line);
        expect(result).toBeNull();
      });
    });
  });

  describe('formatTask', () => {
    it('should format basic task', () => {
      // Arrange
      const taskOptions = {
        text: 'Basic task',
        completed: false
      };

      // Act
      const result = tasksIntegration.formatTask(taskOptions);

      // Assert
      expect(result).toBe('- [ ] Basic task');
    });

    it('should format completed task', () => {
      // Arrange
      const taskOptions = {
        text: 'Completed task',
        completed: true
      };

      // Act
      const result = tasksIntegration.formatTask(taskOptions);

      // Assert
      expect(result).toBe('- [x] Completed task');
    });

    it('should format task with priority', () => {
      // Arrange
      const taskOptions = {
        text: 'High priority task',
        completed: false,
        priority: 'high'
      };

      // Act
      const result = tasksIntegration.formatTask(taskOptions);

      // Assert
      expect(result).toBe('- [ ] High priority task 🔼');
    });

    it('should format task with dates', () => {
      // Arrange
      const taskOptions = {
        text: 'Task with dates',
        completed: false,
        scheduled: '2024-01-10',
        starts: '2024-01-12',
        due: '2024-01-15',
        done: '2024-01-16'
      };

      // Act
      const result = tasksIntegration.formatTask(taskOptions);

      // Assert
      expect(result).toContain('🛫 2024-01-10');
      expect(result).toContain('⏳ 2024-01-12');
      expect(result).toContain('📅 2024-01-15');
      expect(result).toContain('✅ 2024-01-16');
    });

    it('should format task with tags', () => {
      // Arrange
      const taskOptions = {
        text: 'Task with tags',
        completed: false,
        tags: ['#work', '#urgent']
      };

      // Act
      const result = tasksIntegration.formatTask(taskOptions);

      // Assert
      expect(result).toContain('#work #urgent');
    });

    it('should format task with recurrence', () => {
      // Arrange
      const taskOptions = {
        text: 'Recurring task',
        completed: false,
        recurrenceRule: 'every week'
      };

      // Act
      const result = tasksIntegration.formatTask(taskOptions);

      // Assert
      expect(result).toContain('🔁 every week');
    });
  });

  describe('extractTaskMetadata', () => {
    it('should extract metadata from valid task line', () => {
      // Arrange
      const taskLine = '- [x] Completed task #done 📅 2024-01-15';

      // Act
      const metadata = tasksIntegration.extractTaskMetadata(taskLine);

      // Assert
      expect(metadata.isTask).toBe(true);
      expect(metadata.completed).toBe(true);
      expect(metadata.text).toBe('Completed task');
      expect(metadata.tags).toContain('#done');
      expect(metadata.due).toBe('2024-01-15');
    });

    it('should handle non-task lines', () => {
      // Arrange
      const nonTaskLine = 'This is not a task';

      // Act
      const metadata = tasksIntegration.extractTaskMetadata(nonTaskLine);

      // Assert
      expect(metadata.isTask).toBe(false);
      expect(metadata.text).toBe(nonTaskLine);
      expect(metadata.completed).toBe(false);
    });
  });

  describe('utility methods', () => {
    it('should get correct task status', () => {
      // Arrange
      const completedTask = { completed: true, isTask: true, text: 'Done', tags: [] };
      const todoTask = { completed: false, isTask: true, text: 'Todo', tags: [] };
      const overdueTask = { 
        completed: false, 
        isTask: true, 
        text: 'Overdue', 
        tags: [], 
        due: '2020-01-01' 
      };

      // Act & Assert
      expect(tasksIntegration.getTaskStatus(completedTask)).toBe('done');
      expect(tasksIntegration.getTaskStatus(todoTask)).toBe('todo');
      expect(tasksIntegration.getTaskStatus(overdueTask)).toBe('overdue');
    });

    it('should detect overdue tasks', () => {
      // Arrange
      const overdueTask = { 
        completed: false, 
        due: '2020-01-01',
        isTask: true,
        text: 'Overdue',
        tags: []
      };
      const futureTask = { 
        completed: false, 
        due: '2030-01-01',
        isTask: true,
        text: 'Future',
        tags: []
      };
      const completedTask = { 
        completed: true, 
        due: '2020-01-01',
        isTask: true,
        text: 'Completed',
        tags: []
      };

      // Act & Assert
      expect(tasksIntegration.isOverdue(overdueTask)).toBe(true);
      expect(tasksIntegration.isOverdue(futureTask)).toBe(false);
      expect(tasksIntegration.isOverdue(completedTask)).toBe(false);
    });

    it('should calculate urgency scores', () => {
      // Arrange
      const highPriorityTask = { 
        priority: 'high', 
        isTask: true, 
        completed: false, 
        text: 'High', 
        tags: [] 
      };
      const overdueTask = { 
        priority: 'normal', 
        due: '2020-01-01', 
        isTask: true, 
        completed: false, 
        text: 'Overdue', 
        tags: [] 
      };

      // Act
      const highScore = tasksIntegration.getUrgencyScore(highPriorityTask);
      const overdueScore = tasksIntegration.getUrgencyScore(overdueTask);

      // Assert
      expect(highScore).toBe(6); // High priority = 6 points
      expect(overdueScore).toBe(7); // Normal priority (4) + overdue (3) = 7 points
      expect(overdueScore).toBeLessThanOrEqual(10);
    });
  });
});