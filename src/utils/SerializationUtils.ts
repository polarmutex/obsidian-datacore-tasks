import { DatacoreTask } from '../types/KanbanTypes';

/**
 * Safely serialize datacore task objects, removing circular references
 * and unnecessary internal properties
 */
export class SerializationUtils {
  
  /**
   * Create a clean, serializable version of a datacore task
   */
  static cleanTaskForSerialization(task: any): DatacoreTask {
    // Extract only the properties we need, avoiding circular references
    return {
      $text: task.$text || task.text || '',
      $file: task.$file || task.file?.path || '',
      $line: task.$line || task.line,
      $tags: task.$tags || task.tags || [],
      completed: task.completed || false,
      due: task.due || task.dueDate || '',
      priority: task.priority || '',
      created: task.created || task.createdDate || '',
      // Add other simple properties but avoid complex objects
      ...this.extractSimpleProperties(task)
    };
  }

  /**
   * Safely stringify an object with circular reference handling
   */
  static safeStringify(obj: any, space?: number): string {
    const seen = new WeakSet();
    
    try {
      return JSON.stringify(obj, (key, value) => {
        // Skip properties that commonly cause circular references
        if (key.startsWith('$parent') || 
            key.startsWith('$') && typeof value === 'object' && value !== null) {
          return undefined;
        }
        
        // Handle circular references
        if (typeof value === 'object' && value !== null) {
          if (seen.has(value)) {
            return '[Circular Reference]';
          }
          seen.add(value);
        }
        
        return value;
      }, space);
    } catch (error) {
      console.warn('Failed to stringify object:', error);
      return JSON.stringify({ 
        error: 'Serialization failed',
        type: typeof obj,
        constructor: obj?.constructor?.name || 'unknown'
      });
    }
  }

  /**
   * Parse safely stringified object
   */
  static safeParse(jsonString: string): any {
    try {
      return JSON.parse(jsonString);
    } catch (error) {
      console.warn('Failed to parse JSON:', error);
      return null;
    }
  }

  /**
   * Extract only simple (non-object) properties from a complex object
   */
  private static extractSimpleProperties(obj: any): Record<string, any> {
    const simple: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(obj)) {
      // Skip internal datacore properties and functions
      if (key.startsWith('$') || key.startsWith('_') || typeof value === 'function') {
        continue;
      }
      
      // Only include simple types
      if (typeof value === 'string' || 
          typeof value === 'number' || 
          typeof value === 'boolean' ||
          value === null ||
          value === undefined ||
          Array.isArray(value) && value.every(item => typeof item === 'string')) {
        simple[key] = value;
      }
    }
    
    return simple;
  }

  /**
   * Create a minimal task representation for drag-drop operations
   */
  static createDragData(task: any): string {
    const minimal = {
      id: this.generateTaskId(task),
      text: task.$text || task.text || '',
      file: task.$file || task.file?.path || '',
      line: task.$line || task.line,
      tags: task.$tags || task.tags || [],
      completed: task.completed || false,
      due: task.due || task.dueDate || '',
      priority: task.priority || ''
    };
    
    return this.safeStringify(minimal);
  }

  /**
   * Generate a unique ID for a task
   */
  static generateTaskId(task: any): string {
    const file = task.$file || task.file?.path || 'unknown';
    const line = task.$line || task.line || 0;
    const text = (task.$text || task.text || '').substring(0, 20);
    return `${file}:${line}:${text}`;
  }

  /**
   * Restore a task from drag data
   */
  static restoreFromDragData(dragData: string): DatacoreTask | null {
    const parsed = this.safeParse(dragData);
    if (!parsed) return null;
    
    return {
      $text: parsed.text || '',
      $file: parsed.file || '',
      $line: parsed.line,
      $tags: parsed.tags || [],
      completed: parsed.completed || false,
      due: parsed.due || '',
      priority: parsed.priority || '',
      created: '',
      ...parsed
    };
  }

  /**
   * Check if an object has circular references
   */
  static hasCircularReference(obj: any): boolean {
    const seen = new WeakSet();
    
    function check(current: any): boolean {
      if (typeof current === 'object' && current !== null) {
        if (seen.has(current)) {
          return true;
        }
        seen.add(current);
        
        for (const value of Object.values(current)) {
          if (check(value)) {
            return true;
          }
        }
      }
      return false;
    }
    
    return check(obj);
  }

  /**
   * Log object structure for debugging
   */
  static logObjectStructure(obj: any, maxDepth: number = 3): void {
    const structure = this.analyzeStructure(obj, maxDepth);
    console.log('Object structure:', structure);
  }

  private static analyzeStructure(obj: any, maxDepth: number, currentDepth: number = 0): any {
    if (currentDepth >= maxDepth) {
      return `[Max depth ${maxDepth} reached]`;
    }
    
    if (typeof obj !== 'object' || obj === null) {
      return typeof obj;
    }
    
    if (Array.isArray(obj)) {
      return `Array(${obj.length})`;
    }
    
    const structure: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (key.length > 50) continue; // Skip very long keys
      structure[key] = this.analyzeStructure(value, maxDepth, currentDepth + 1);
    }
    
    return structure;
  }
}