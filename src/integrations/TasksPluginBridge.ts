import { App } from 'obsidian';
import { DatacoreTask } from '../types/KanbanTypes';

export interface EnhancedTaskMetadata {
  text: string;
  completed: boolean;
  dueDate?: string;
  priority?: string;
  recurrence?: string;
  scheduledDate?: string;
  startDate?: string;
  doneDate?: string;
  tags?: string[];
  isTask: boolean;
}

export class TasksPluginBridge {
  private tasksPlugin: any = null;
  private isTasksPluginAvailable = false;

  constructor(private app: App) {
    this.detectTasksPlugin();
  }

  private detectTasksPlugin(): void {
    try {
      const plugins = (this.app as any).plugins;
      this.tasksPlugin = plugins.enabledPlugins.get('obsidian-tasks-plugin');
      this.isTasksPluginAvailable = !!this.tasksPlugin;
      
      if (this.isTasksPluginAvailable) {
        console.log('Tasks plugin detected and integrated');
      } else {
        console.log('Tasks plugin not found, using basic task parsing');
      }
    } catch (error) {
      console.warn('Error detecting Tasks plugin:', error);
      this.isTasksPluginAvailable = false;
    }
  }

  // Enhanced task parsing using Tasks plugin if available
  parseTaskWithTasksPlugin(taskText: string): EnhancedTaskMetadata {
    if (this.isTasksPluginAvailable && this.tasksPlugin) {
      try {
        // Try to use Tasks plugin parser
        const tasksResult = this.tasksPlugin.parseTask?.(taskText);
        if (tasksResult) {
          return {
            ...this.parseBasicTask(taskText),
            dueDate: tasksResult.dueDate?.format?.('YYYY-MM-DD'),
            priority: this.mapTasksPriority(tasksResult.priority),
            recurrence: tasksResult.recurrence?.toText?.(),
            scheduledDate: tasksResult.scheduledDate?.format?.('YYYY-MM-DD'),
            startDate: tasksResult.startDate?.format?.('YYYY-MM-DD'),
            doneDate: tasksResult.doneDate?.format?.('YYYY-MM-DD')
          };
        }
      } catch (error) {
        console.warn('Tasks plugin parsing failed, using basic parser:', error);
      }
    }
    
    return this.parseBasicTask(taskText);
  }

  // Basic task parsing fallback
  private parseBasicTask(taskText: string): EnhancedTaskMetadata {
    const isTask = /^-\s*\[([ xX])\]/.test(taskText.trim());
    const completed = /^-\s*\[x\]/i.test(taskText.trim());
    
    // Extract text (remove checkbox)
    const text = taskText.replace(/^-\s*\[([ xX])\]\s*/, '').trim();
    
    // Extract tags
    const tagRegex = /#[\w-]+/g;
    const tags = text.match(tagRegex) || [];
    
    // Extract due date (basic patterns)
    const dueDateMatch = text.match(/📅\s*(\d{4}-\d{2}-\d{2})/);
    const dueDate = dueDateMatch?.[1];
    
    // Extract priority (basic patterns)
    let priority: string | undefined;
    if (text.includes('⏫') || text.includes('#urgent')) priority = 'urgent';
    else if (text.includes('🔼') || text.includes('#high')) priority = 'high';
    else if (text.includes('🔽') || text.includes('#low')) priority = 'low';
    else if (text.includes('#medium')) priority = 'medium';
    
    return {
      text,
      completed,
      dueDate,
      priority,
      tags,
      isTask
    };
  }

  // Map Tasks plugin priority format to our format
  private mapTasksPriority(priority: any): string | undefined {
    if (!priority) return undefined;
    
    // Tasks plugin uses different priority representations
    switch (priority) {
      case 'Highest':
      case 'High':
        return 'urgent';
      case 'Medium':
        return 'high';
      case 'Low':
        return 'medium';
      case 'Lowest':
        return 'low';
      default:
        return priority.toString().toLowerCase();
    }
  }

  // Format task for Tasks plugin compatibility
  formatTaskForTasksPlugin(task: DatacoreTask): string {
    if (!this.isTasksPluginAvailable) {
      return task.$text || task.text || '';
    }
    
    try {
      // Build task string with Tasks plugin syntax
      let taskString = task.$text || task.text || '';
      
      // Ensure checkbox format
      if (!taskString.match(/^-\s*\[([ xX])\]/)) {
        const checkbox = task.completed ? '- [x] ' : '- [ ] ';
        taskString = checkbox + taskString;
      }
      
      // Add due date in Tasks plugin format
      if (task.due && !taskString.includes('📅')) {
        taskString += ` 📅 ${task.due}`;
      }
      
      // Add priority in Tasks plugin format
      if (task.priority && !this.hasPriorityEmoji(taskString)) {
        const priorityEmoji = this.getPriorityEmoji(task.priority);
        if (priorityEmoji) {
          taskString += ` ${priorityEmoji}`;
        }
      }
      
      return taskString;
      
    } catch (error) {
      console.warn('Error formatting task for Tasks plugin:', error);
      return task.$text || task.text || '';
    }
  }

  private hasPriorityEmoji(text: string): boolean {
    return /[⏫🔼🔽⏬]/.test(text);
  }

  private getPriorityEmoji(priority: string): string | null {
    switch (priority.toLowerCase()) {
      case 'urgent':
      case 'highest':
        return '⏫';
      case 'high':
        return '🔼';
      case 'medium':
        return '';
      case 'low':
        return '🔽';
      case 'lowest':
        return '⏬';
      default:
        return null;
    }
  }

  // Check if Tasks plugin syntax is present
  hasTasksPluginSyntax(taskText: string): boolean {
    const tasksPatterns = [
      /📅\s*\d{4}-\d{2}-\d{2}/, // due date
      /⏳\s*\d{4}-\d{2}-\d{2}/, // scheduled
      /🛫\s*\d{4}-\d{2}-\d{2}/, // start
      /✅\s*\d{4}-\d{2}-\d{2}/, // done
      /🔁\s*\w+/,               // recurrence
      /[⏫🔼🔽⏬]/              // priority
    ];
    
    return tasksPatterns.some(pattern => pattern.test(taskText));
  }

  // Enhanced task validation
  validateTask(taskText: string): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    
    // Check if it's a valid task format
    if (!this.parseBasicTask(taskText).isTask) {
      issues.push('Not a valid task format (missing checkbox)');
    }
    
    // Check for common formatting issues
    if (taskText.includes('[[') && taskText.includes(']]')) {
      // Has wiki links - generally fine
    }
    
    if (taskText.includes('http') && !taskText.includes('[')) {
      issues.push('Raw URLs should be formatted as markdown links');
    }
    
    // Check for duplicate date formats
    const dateCount = (taskText.match(/\d{4}-\d{2}-\d{2}/g) || []).length;
    if (dateCount > 3) {
      issues.push('Multiple dates detected - verify format');
    }
    
    // Check for Tasks plugin compatibility if available
    if (this.isTasksPluginAvailable && this.hasTasksPluginSyntax(taskText)) {
      try {
        const parsed = this.parseTaskWithTasksPlugin(taskText);
        if (!parsed.isTask) {
          issues.push('Tasks plugin failed to parse this task');
        }
      } catch (error) {
        issues.push('Tasks plugin syntax error');
      }
    }
    
    return {
      valid: issues.length === 0,
      issues
    };
  }

  // Convert datacore task to enhanced metadata
  enhanceDatacoreTask(task: DatacoreTask): EnhancedTaskMetadata {
    const taskText = task.$text || task.text || '';
    const enhanced = this.parseTaskWithTasksPlugin(taskText);
    
    // Merge with datacore metadata
    return {
      ...enhanced,
      dueDate: enhanced.dueDate || task.due,
      priority: enhanced.priority || task.priority,
      completed: enhanced.completed || task.completed || false,
      tags: enhanced.tags || task.$tags || []
    };
  }

  // Utility methods
  isTasksPluginEnabled(): boolean {
    return this.isTasksPluginAvailable;
  }

  getTasksPluginVersion(): string | null {
    if (!this.isTasksPluginAvailable || !this.tasksPlugin) {
      return null;
    }
    
    try {
      return this.tasksPlugin.version || this.tasksPlugin.manifest?.version || 'unknown';
    } catch (error) {
      return 'unknown';
    }
  }

  // Refresh plugin detection (useful if Tasks plugin is enabled/disabled)
  refreshDetection(): void {
    this.detectTasksPlugin();
  }

  // Get supported features based on Tasks plugin availability
  getSupportedFeatures(): {
    basicParsing: boolean;
    tasksParsing: boolean;
    priorityEmojis: boolean;
    dateFormats: boolean;
    recurrence: boolean;
  } {
    return {
      basicParsing: true,
      tasksParsing: this.isTasksPluginAvailable,
      priorityEmojis: this.isTasksPluginAvailable,
      dateFormats: this.isTasksPluginAvailable,
      recurrence: this.isTasksPluginAvailable
    };
  }
}