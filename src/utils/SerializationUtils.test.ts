import { SerializationUtils } from './SerializationUtils';

describe('SerializationUtils', () => {
  // Mock circular reference object (similar to datacore structure)
  const createMockDatacoreTask = () => {
    const parent = {
      $elements: [] as any[]
    };
    
    const task = {
      $text: 'Test task',
      $file: 'test.md',
      $line: 5,
      $tags: ['#todo'],
      $parent: parent,
      completed: false,
      due: '2024-01-01'
    };
    
    parent.$elements.push(task);
    return task;
  };

  describe('cleanTaskForSerialization', () => {
    it('should handle circular references safely', () => {
      const mockTask = createMockDatacoreTask();
      
      // This should not throw an error
      const cleaned = SerializationUtils.cleanTaskForSerialization(mockTask);
      
      expect(cleaned.$text).toBe('Test task');
      expect(cleaned.$file).toBe('test.md');
      expect(cleaned.$line).toBe(5);
      expect(cleaned.$tags).toEqual(['#todo']);
      expect(cleaned.completed).toBe(false);
      expect(cleaned.due).toBe('2024-01-01');
      expect(cleaned).not.toHaveProperty('$parent');
    });

    it('should handle tasks with missing properties', () => {
      const mockTask = {
        text: 'Simple task',
        // Missing most properties
      };
      
      const cleaned = SerializationUtils.cleanTaskForSerialization(mockTask);
      
      expect(cleaned.$text).toBe('Simple task');
      expect(cleaned.$file).toBe('');
      expect(cleaned.$tags).toEqual([]);
    });
  });

  describe('safeStringify', () => {
    it('should stringify objects with circular references', () => {
      const mockTask = createMockDatacoreTask();
      
      // This should not throw an error
      const result = SerializationUtils.safeStringify(mockTask);
      
      expect(typeof result).toBe('string');
      expect(result).toContain('Test task');
      expect(result).not.toContain('[Circular Reference]'); // because we skip $parent
    });

    it('should handle complex circular structures', () => {
      const obj1: any = { name: 'obj1' };
      const obj2: any = { name: 'obj2' };
      obj1.ref = obj2;
      obj2.ref = obj1;
      
      const result = SerializationUtils.safeStringify(obj1);
      
      expect(typeof result).toBe('string');
      expect(result).toContain('obj1');
      expect(result).toContain('obj2');
    });
  });

  describe('createDragData', () => {
    it('should create safe drag data', () => {
      const mockTask = createMockDatacoreTask();
      
      const dragData = SerializationUtils.createDragData(mockTask);
      
      expect(typeof dragData).toBe('string');
      
      // Should be parseable
      const parsed = JSON.parse(dragData);
      expect(parsed.text).toBe('Test task');
      expect(parsed.file).toBe('test.md');
      expect(parsed.line).toBe(5);
    });
  });

  describe('restoreFromDragData', () => {
    it('should restore task from drag data', () => {
      const mockTask = createMockDatacoreTask();
      const dragData = SerializationUtils.createDragData(mockTask);
      
      const restored = SerializationUtils.restoreFromDragData(dragData);
      
      expect(restored).toBeTruthy();
      expect(restored!.$text).toBe('Test task');
      expect(restored!.$file).toBe('test.md');
      expect(restored!.$line).toBe(5);
    });

    it('should handle invalid drag data', () => {
      const restored = SerializationUtils.restoreFromDragData('invalid json');
      
      expect(restored).toBeNull();
    });
  });

  describe('hasCircularReference', () => {
    it('should detect circular references', () => {
      const mockTask = createMockDatacoreTask();
      
      const hasCircular = SerializationUtils.hasCircularReference(mockTask);
      
      expect(hasCircular).toBe(true);
    });

    it('should return false for non-circular objects', () => {
      const simpleObj = {
        name: 'test',
        value: 42,
        nested: {
          prop: 'value'
        }
      };
      
      const hasCircular = SerializationUtils.hasCircularReference(simpleObj);
      
      expect(hasCircular).toBe(false);
    });
  });

  describe('generateTaskId', () => {
    it('should generate consistent IDs', () => {
      const task = {
        $file: 'test.md',
        $line: 5,
        $text: 'Test task'
      };
      
      const id1 = SerializationUtils.generateTaskId(task);
      const id2 = SerializationUtils.generateTaskId(task);
      
      expect(id1).toBe(id2);
      expect(id1).toBe('test.md:5:Test task');
    });
  });
});