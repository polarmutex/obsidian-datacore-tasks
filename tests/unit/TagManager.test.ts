import { TagManager } from '../../src/TagManager';
import { DatacoreSync } from '../../src/DatacoreSync';
import { createTestEnvironment, createTestTask, createTestFileContent, taskAssertions } from '../test-utils';

// Mock the TasksPluginIntegration to avoid plugin dependency issues
jest.mock('../../src/TasksPluginIntegration', () => ({
  TasksPluginIntegration: jest.fn().mockImplementation(() => ({
    isAvailable: false,
    extractTaskMetadata: jest.fn().mockReturnValue({
      isTask: true,
      completed: false,
      text: 'Sample task',
      priority: 'normal',
      dueDate: null,
      tags: ['#todo']
    }),
    parseTaskLine: jest.fn().mockReturnValue({
      isTask: true,
      completed: false,
      text: 'Sample task',
      originalText: '- [ ] Sample task #todo',
      priority: 'normal'
    })
  }))
}));

describe('TagManager (Improved)', () => {
  let tagManager: TagManager;
  let testEnv: any;
  let mockDatacoreSync: jest.Mocked<DatacoreSync>;

  beforeEach(() => {
    // Create test environment with enhanced mocks
    testEnv = createTestEnvironment(false);
    
    // Create mock DatacoreSync
    mockDatacoreSync = {
      refresh: jest.fn().mockResolvedValue(undefined),
      getTasks: jest.fn().mockResolvedValue([]),
      initialize: jest.fn().mockResolvedValue(true),
      destroy: jest.fn()
    } as any;
    
    // Initialize TagManager
    tagManager = new TagManager(testEnv.app, mockDatacoreSync);
    
    // Setup default file content
    const testTasks = [
      createTestTask({ text: 'Complete project documentation', tags: ['#todo', '#work'], line: 2 }),
      createTestTask({ text: 'Review pull request', tags: ['#doing', '#development'], line: 3 }),
      createTestTask({ text: 'Deploy to production', tags: ['#waiting', '#deployment'], line: 4 }),
      createTestTask({ text: 'Fix bug in authentication', tags: ['#done', '#bugfix'], line: 5, completed: true })
    ];
    
    const fileContent = createTestFileContent(testTasks);
    testEnv.app.vault.read.mockResolvedValue(fileContent);
    testEnv.app.vault.modify.mockResolvedValue(undefined);
  });

  describe('updateTaskStatus', () => {
    it('should update task status successfully', async () => {
      // Arrange
      const task = createTestTask({ 
        text: 'Complete project documentation', 
        tags: ['#todo', '#work'], 
        line: 2,
        file: { path: 'tasks.md', name: 'tasks.md' }
      });
      const newStatus = '#doing';

      // Act
      const result = await tagManager.updateTaskStatus(task, newStatus);

      // Assert
      expect(result).toBe(true);
      expect(testEnv.app.vault.read).toHaveBeenCalledWith(task.file);
      expect(testEnv.app.vault.modify).toHaveBeenCalled();
      expect(mockDatacoreSync.refresh).toHaveBeenCalled();
    });

    it('should handle line out of bounds error', async () => {
      // Arrange
      const task = createTestTask({ line: 999 });
      testEnv.app.vault.read.mockResolvedValue('# Short file\n\nOnly two lines');

      // Act
      const result = await tagManager.updateTaskStatus(task, '#doing');

      // Assert
      expect(result).toBe(false);
      expect(testEnv.app.vault.modify).not.toHaveBeenCalled();
    });

    it('should handle file read errors', async () => {
      // Arrange
      const task = createTestTask();
      testEnv.app.vault.read.mockRejectedValue(new Error('File not found'));

      // Act
      const result = await tagManager.updateTaskStatus(task, '#doing');

      // Assert
      expect(result).toBe(false);
      expect(testEnv.app.vault.modify).not.toHaveBeenCalled();
    });

    it('should mark task as completed when moved to done', async () => {
      // Arrange
      const task = createTestTask({ 
        text: 'Deploy to production',
        tags: ['#waiting', '#deployment'],
        line: 4,
        completed: false
      });

      // Act
      const result = await tagManager.updateTaskStatus(task, '#done');

      // Assert
      expect(result).toBe(true);
      expect(testEnv.app.vault.modify).toHaveBeenCalled();
      
      // Check that the modify call contains the expected updated content
      const modifyCall = testEnv.app.vault.modify.mock.calls[0];
      const updatedContent = modifyCall[1];
      expect(updatedContent).toContain('[x]'); // Should be checked
      expect(updatedContent).toContain('#done'); // Should have done tag
    });

    it('should uncheck task when moved away from done', async () => {
      // Arrange
      const task = createTestTask({ 
        text: 'Fix bug in authentication',
        tags: ['#done', '#bugfix'],
        line: 5,
        completed: true
      });

      // Act
      const result = await tagManager.updateTaskStatus(task, '#todo');

      // Assert
      expect(result).toBe(true);
      expect(testEnv.app.vault.modify).toHaveBeenCalled();
      
      // Check that the modify call contains the expected updated content
      const modifyCall = testEnv.app.vault.modify.mock.calls[0];
      const updatedContent = modifyCall[1];
      expect(updatedContent).toContain('[ ]'); // Should be unchecked
      expect(updatedContent).toContain('#todo'); // Should have todo tag
    });
  });

  describe('addTag', () => {
    it('should add tag to task successfully', async () => {
      // Arrange
      const task = createTestTask({ 
        text: 'Complete project documentation',
        tags: ['#todo'],
        line: 2
      });
      const newTag = '#urgent';

      // Act
      const result = await tagManager.addTag(task, newTag);

      // Assert
      expect(result).toBe(true);
      expect(testEnv.app.vault.modify).toHaveBeenCalled();
      
      const modifyCall = testEnv.app.vault.modify.mock.calls[0];
      const updatedContent = modifyCall[1];
      expect(updatedContent).toContain('#urgent');
    });

    it('should not add duplicate tags', async () => {
      // Arrange
      const task = createTestTask({ 
        text: 'Complete project documentation',
        tags: ['#todo', '#work'],
        line: 2
      });
      const existingTag = '#work';

      // Setup file content that already contains the tag
      const fileWithTag = createTestFileContent([{
        ...task,
        text: 'Complete project documentation #todo #work'
      }]);
      testEnv.app.vault.read.mockResolvedValue(fileWithTag);

      // Act
      const result = await tagManager.addTag(task, existingTag);

      // Assert
      expect(result).toBe(true); // Success, but no modification needed
      expect(testEnv.app.vault.modify).not.toHaveBeenCalled();
    });

    it('should handle tag addition errors', async () => {
      // Arrange
      const task = createTestTask();
      testEnv.app.vault.modify.mockRejectedValue(new Error('Permission denied'));

      // Act
      const result = await tagManager.addTag(task, '#urgent');

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('removeTag', () => {
    it('should remove tag from task successfully', async () => {
      // Arrange
      const task = createTestTask({ 
        text: 'Complete project documentation',
        tags: ['#todo', '#work', '#urgent'],
        line: 2
      });
      const tagToRemove = '#urgent';

      // Setup file content that contains the tag
      const fileWithTags = createTestFileContent([{
        ...task,
        text: 'Complete project documentation #todo #work #urgent'
      }]);
      testEnv.app.vault.read.mockResolvedValue(fileWithTags);

      // Act
      const result = await tagManager.removeTag(task, tagToRemove);

      // Assert
      expect(result).toBe(true);
      expect(testEnv.app.vault.modify).toHaveBeenCalled();
      expect(mockDatacoreSync.refresh).toHaveBeenCalled();
      
      const modifyCall = testEnv.app.vault.modify.mock.calls[0];
      const updatedContent = modifyCall[1];
      expect(updatedContent).not.toContain('#urgent');
      expect(updatedContent).toContain('#todo');
      expect(updatedContent).toContain('#work');
    });

    it('should handle tag removal when tag does not exist', async () => {
      // Arrange
      const task = createTestTask({ 
        text: 'Complete project documentation',
        tags: ['#todo', '#work'],
        line: 2
      });
      const nonExistentTag = '#nonexistent';

      // Act
      const result = await tagManager.removeTag(task, nonExistentTag);

      // Assert
      expect(result).toBe(true); // Success, but no modification needed
      expect(testEnv.app.vault.modify).not.toHaveBeenCalled();
    });
  });

  describe('toggleTaskCompletion', () => {
    it('should mark incomplete task as complete', async () => {
      // Arrange
      const task = createTestTask({ 
        text: 'Complete project documentation',
        completed: false,
        line: 2
      });

      // Act
      const result = await tagManager.toggleTaskCompletion(task);

      // Assert
      expect(result).toBe(true);
      expect(testEnv.app.vault.modify).toHaveBeenCalled();
      
      const modifyCall = testEnv.app.vault.modify.mock.calls[0];
      const updatedContent = modifyCall[1];
      expect(updatedContent).toContain('[x]');
    });

    it('should mark complete task as incomplete', async () => {
      // Arrange
      const task = createTestTask({ 
        text: 'Complete project documentation',
        completed: true,
        line: 2
      });

      // Setup file content with completed task
      const fileWithCompletedTask = '# Test File\n\n- [x] Complete project documentation #todo';
      testEnv.app.vault.read.mockResolvedValue(fileWithCompletedTask);

      // Act
      const result = await tagManager.toggleTaskCompletion(task);

      // Assert
      expect(result).toBe(true);
      expect(testEnv.app.vault.modify).toHaveBeenCalled();
      
      const modifyCall = testEnv.app.vault.modify.mock.calls[0];
      const updatedContent = modifyCall[1];
      expect(updatedContent).toContain('[ ]');
    });

    it('should handle non-task lines gracefully', async () => {
      // Arrange
      const task = createTestTask({ line: 0 }); // Points to "# Test File"

      // Act
      const result = await tagManager.toggleTaskCompletion(task);

      // Assert
      expect(result).toBe(false); // Should fail gracefully
      expect(testEnv.app.vault.modify).not.toHaveBeenCalled();
    });
  });

  describe('createTask', () => {
    it('should create task with tags', async () => {
      // Arrange
      const file = { path: 'new-tasks.md', name: 'new-tasks.md' };
      const taskText = 'New important task';
      const tags = ['#todo', '#urgent'];
      testEnv.app.vault.read.mockResolvedValue('# Tasks\n\n');

      // Act
      const result = await tagManager.createTask(file, taskText, tags);

      // Assert
      expect(result).toBe(true);
      expect(testEnv.app.vault.modify).toHaveBeenCalled();
      
      const modifyCall = testEnv.app.vault.modify.mock.calls[0];
      const updatedContent = modifyCall[1];
      expect(updatedContent).toContain('- [ ] New important task #todo #urgent');
    });

    it('should create task without tags', async () => {
      // Arrange
      const file = { path: 'simple.md', name: 'simple.md' };
      const taskText = 'Simple task';
      testEnv.app.vault.read.mockResolvedValue('');

      // Act
      const result = await tagManager.createTask(file, taskText);

      // Assert
      expect(result).toBe(true);
      expect(testEnv.app.vault.modify).toHaveBeenCalledWith(
        file,
        '- [ ] Simple task'
      );
    });

    it('should handle file creation errors', async () => {
      // Arrange
      const file = { path: 'readonly.md', name: 'readonly.md' };
      const taskText = 'Cannot create';
      testEnv.app.vault.read.mockResolvedValue('');
      testEnv.app.vault.modify.mockRejectedValue(new Error('Read-only file'));

      // Act
      const result = await tagManager.createTask(file, taskText);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('integration with Tasks plugin', () => {
    it('should handle Tasks plugin absence gracefully', () => {
      // The mock already sets isAvailable to false
      expect(tagManager).toBeDefined();
      
      // TagManager should still work without Tasks plugin
      const task = createTestTask();
      expect(() => tagManager.updateTaskStatus(task, '#doing')).not.toThrow();
    });
  });
});