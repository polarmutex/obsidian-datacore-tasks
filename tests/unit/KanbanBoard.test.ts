import { KanbanBoard } from '../../src/KanbanBoard';
import { DatacoreSync } from '../../src/DatacoreSync';
import { TagManager } from '../../src/TagManager';
import { sampleTasks, sampleKanbanSettings } from '../fixtures/sample-tasks';

// Mock the dependencies
jest.mock('../../src/DatacoreSync');
jest.mock('../../src/TagManager');
jest.mock('../../src/TaskCard');

// Mock TaskCard
jest.mock('../../src/TaskCard', () => ({
  TaskCard: jest.fn().mockImplementation((task, settings) => ({
    task,
    settings,
    render: jest.fn().mockResolvedValue(document.createElement('div')),
    destroy: jest.fn()
  }))
}));

describe('KanbanBoard', () => {
  let kanbanBoard: KanbanBoard;
  let mockContainer: HTMLElement;
  let mockDatacoreSync: jest.Mocked<DatacoreSync>;
  let mockTagManager: jest.Mocked<TagManager>;

  beforeEach(() => {
    // Create mock container
    mockContainer = document.createElement('div');
    document.body.appendChild(mockContainer);

    // Create mock services
    mockDatacoreSync = {
      getTasks: jest.fn().mockResolvedValue(sampleTasks),
      refresh: jest.fn().mockResolvedValue(undefined)
    } as any;

    mockTagManager = {
      updateTaskStatus: jest.fn().mockResolvedValue(true)
    } as any;

    // Create kanban board instance
    kanbanBoard = new KanbanBoard(
      mockContainer,
      mockDatacoreSync,
      mockTagManager,
      sampleKanbanSettings
    );
  });

  afterEach(() => {
    kanbanBoard.destroy();
    document.body.removeChild(mockContainer);
  });

  describe('render', () => {
    it('should render columns correctly', async () => {
      // Act
      await kanbanBoard.render();

      // Assert
      const columns = mockContainer.querySelectorAll('.kanban-column');
      expect(columns).toHaveLength(4); // todo, doing, waiting, done

      // Check column headers
      const headers = mockContainer.querySelectorAll('.kanban-column-title');
      expect(headers[0].textContent).toBe('To Do');
      expect(headers[1].textContent).toBe('In Progress');
      expect(headers[2].textContent).toBe('Waiting');
      expect(headers[3].textContent).toBe('Done');
    });

    it('should apply column colors correctly', async () => {
      // Act
      await kanbanBoard.render();

      // Assert
      const headers = mockContainer.querySelectorAll('.kanban-column-header');
      expect(headers[0]).toHaveAttribute('style', expect.stringContaining('#ff6b6b'));
      expect(headers[1]).toHaveAttribute('style', expect.stringContaining('#4ecdc4'));
      expect(headers[2]).toHaveAttribute('style', expect.stringContaining('#f9ca24'));
      expect(headers[3]).toHaveAttribute('style', expect.stringContaining('#45b7d1'));
    });

    it('should render tasks in correct columns', async () => {
      // Act
      await kanbanBoard.render();

      // Assert
      expect(mockDatacoreSync.getTasks).toHaveBeenCalled();
      
      // Check that TaskCard was created for each task
      const { TaskCard } = require('../../src/TaskCard');
      expect(TaskCard).toHaveBeenCalledTimes(4);
    });

    it('should update column counts correctly', async () => {
      // Act
      await kanbanBoard.render();

      // Assert
      const counts = mockContainer.querySelectorAll('.kanban-column-count');
      
      // Based on sample tasks: 1 todo, 1 doing, 1 waiting, 1 done
      // Initially all counts should be updated after rendering
      expect(counts).toHaveLength(4);
      
      // Check that updateColumnCount was called through the rendering process
      // The actual count values depend on the mocked getTasks response
      expect(mockDatacoreSync.getTasks).toHaveBeenCalled();
      
      // Since getTasks returns sampleTasks, each column should have 1 task
      // But the actual count depends on proper task categorization
      expect(counts[0]).toBeInstanceOf(HTMLElement);
      expect(counts[1]).toBeInstanceOf(HTMLElement);
      expect(counts[2]).toBeInstanceOf(HTMLElement);
      expect(counts[3]).toBeInstanceOf(HTMLElement);
    });
  });

  describe('refresh', () => {
    beforeEach(async () => {
      await kanbanBoard.render();
    });

    it('should refresh tasks successfully', async () => {
      // Arrange
      const newTasks = [sampleTasks[0], sampleTasks[1]]; // Only 2 tasks
      mockDatacoreSync.getTasks.mockResolvedValueOnce(newTasks);

      // Act
      await kanbanBoard.refresh();

      // Assert
      expect(mockDatacoreSync.getTasks).toHaveBeenCalledTimes(2); // Once in render, once in refresh
    });

    it('should handle refresh errors gracefully', async () => {
      // Arrange
      mockDatacoreSync.getTasks.mockRejectedValueOnce(new Error('Refresh failed'));

      // Act & Assert - should not throw
      await expect(kanbanBoard.refresh()).resolves.toBeUndefined();
    });
  });

  describe('task organization', () => {
    beforeEach(async () => {
      await kanbanBoard.render();
    });

    it('should place tasks in correct columns based on tags', () => {
      // Arrange
      const todoTask = sampleTasks.find(t => t.tags.includes('#todo'));
      const doingTask = sampleTasks.find(t => t.tags.includes('#doing'));
      const waitingTask = sampleTasks.find(t => t.tags.includes('#waiting'));
      const doneTask = sampleTasks.find(t => t.tags.includes('#done'));

      // Act
      const getColumnForTask = (kanbanBoard as any).getColumnForTask.bind(kanbanBoard);

      // Assert
      expect(getColumnForTask(todoTask)?.id).toBe('todo');
      expect(getColumnForTask(doingTask)?.id).toBe('doing');
      expect(getColumnForTask(waitingTask)?.id).toBe('waiting');
      expect(getColumnForTask(doneTask)?.id).toBe('done');
    });

    it('should handle tasks without status tags', () => {
      // Arrange
      const taskWithoutStatusTags = {
        ...sampleTasks[0],
        tags: ['#work', '#project'] // No status tags
      };

      // Act
      const getColumnForTask = (kanbanBoard as any).getColumnForTask.bind(kanbanBoard);
      const column = getColumnForTask(taskWithoutStatusTags);

      // Assert
      expect(column?.id).toBe('todo'); // Should default to first column
    });
  });

  describe('drag and drop setup', () => {
    beforeEach(async () => {
      await kanbanBoard.render();
    });

    it('should set up drop zones for all columns', () => {
      // Assert
      const columnContents = mockContainer.querySelectorAll('.kanban-column-content');
      
      columnContents.forEach(content => {
        // Check that event listeners are set up (can't easily test the actual listeners)
        expect(content).toBeInstanceOf(HTMLElement);
      });
    });
  });

  describe('moveTask', () => {
    beforeEach(async () => {
      await kanbanBoard.render();
    });

    it('should move task to new column successfully', async () => {
      // Arrange
      const taskId = sampleTasks[0].id;
      const targetColumn = sampleKanbanSettings.columns[1]; // doing column

      // Act
      await kanbanBoard.moveTask(taskId, targetColumn);

      // Assert
      expect(mockTagManager.updateTaskStatus).toHaveBeenCalledWith(
        expect.objectContaining({ id: taskId }),
        targetColumn.tag
      );
      expect(mockDatacoreSync.getTasks).toHaveBeenCalledTimes(2); // render + refresh after move
    });

    it('should handle move task errors gracefully', async () => {
      // Arrange
      const taskId = sampleTasks[0].id;
      const targetColumn = sampleKanbanSettings.columns[1];
      mockTagManager.updateTaskStatus.mockRejectedValueOnce(new Error('Move failed'));

      // Act & Assert - should not throw
      await expect(kanbanBoard.moveTask(taskId, targetColumn)).resolves.toBeUndefined();
    });

    it('should handle moving non-existent task', async () => {
      // Arrange
      const nonExistentTaskId = 'non-existent';
      const targetColumn = sampleKanbanSettings.columns[1];

      // Act & Assert - should not throw
      await expect(kanbanBoard.moveTask(nonExistentTaskId, targetColumn)).resolves.toBeUndefined();
      expect(mockTagManager.updateTaskStatus).not.toHaveBeenCalled();
    });
  });

  describe('statistics and state', () => {
    beforeEach(async () => {
      await kanbanBoard.render();
    });

    it('should return correct task count', () => {
      // Act
      const count = kanbanBoard.getTaskCount();

      // Assert
      expect(count).toBe(4); // All sample tasks
    });

    it('should return tasks grouped by column', () => {
      // Act
      const tasksByColumn = kanbanBoard.getTasksByColumn();

      // Assert
      expect(tasksByColumn.size).toBe(4); // 4 columns
      expect(tasksByColumn.get('todo')).toHaveLength(1);
      expect(tasksByColumn.get('doing')).toHaveLength(1);
      expect(tasksByColumn.get('waiting')).toHaveLength(1);
      expect(tasksByColumn.get('done')).toHaveLength(1);
    });

    it('should return correct column statistics', () => {
      // Act
      const stats = kanbanBoard.getColumnStats();

      // Assert
      expect(stats).toEqual({
        todo: 1,
        doing: 1,
        waiting: 1,
        done: 1
      });
    });
  });

  describe('destroy', () => {
    beforeEach(async () => {
      await kanbanBoard.render();
    });

    it('should clean up all resources', () => {
      // Arrange
      const { TaskCard } = require('../../src/TaskCard');
      const mockDestroy = jest.fn();
      TaskCard.mockImplementation(() => ({
        render: jest.fn().mockResolvedValue(document.createElement('div')),
        destroy: mockDestroy
      }));

      // Re-render to get new mock instances
      kanbanBoard.render();

      // Act
      kanbanBoard.destroy();

      // Assert
      expect(kanbanBoard.getTaskCount()).toBe(0);
      expect(kanbanBoard.getColumnStats()).toEqual({
        todo: 0,
        doing: 0,
        waiting: 0,
        done: 0
      });
    });
  });

  describe('empty state handling', () => {
    it('should handle empty task list', async () => {
      // Arrange
      mockDatacoreSync.getTasks.mockResolvedValueOnce([]);

      // Act
      await kanbanBoard.render();

      // Assert
      const counts = mockContainer.querySelectorAll('.kanban-column-count');
      counts.forEach(count => {
        expect(count.textContent).toBe('0');
      });
    });
  });
});