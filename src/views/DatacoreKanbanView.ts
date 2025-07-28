import { KanbanConfig, KanbanColumn, DatacoreTask, DatacoreContext, DEFAULT_COLUMNS } from '../types/KanbanTypes';
import { TagUpdater } from '../core/TagUpdater';
import { DragDropController } from '../core/DragDropController';
import { SerializationUtils } from '../utils/SerializationUtils';

export class DatacoreKanbanView {
  private tagUpdater: TagUpdater;
  private dragController: DragDropController;
  private tasks: DatacoreTask[] = [];
  private isRendered = false;

  constructor(
    private dc: DatacoreContext,
    private container: HTMLElement,
    private config: KanbanConfig
  ) {
    this.tagUpdater = new TagUpdater(this.dc);
    this.dragController = new DragDropController(
      this.tagUpdater,
      this.handleTaskMove.bind(this),
      this.refresh.bind(this)
    );
  }

  async render(): Promise<void> {
    try {
      // Clear container
      this.container.empty();
      this.container.addClass('datacore-kanban-container');

      // Create main structure
      await this.createKanbanStructure();
      
      // Load and display tasks
      await this.loadTasks();
      
      // Render the board
      this.renderKanbanBoard();
      
      // Setup drag and drop
      this.setupDragDropSystem();
      
      // Setup event listeners
      this.setupEventListeners();
      
      this.isRendered = true;
      console.log('DatacoreKanbanView rendered successfully');

    } catch (error) {
      console.error('Failed to render DatacoreKanbanView:', error);
      this.renderError(error.message);
    }
  }

  private async createKanbanStructure(): Promise<void> {
    // Create header
    const header = this.container.createEl('div', { cls: 'datacore-kanban-header' });
    
    if (!this.config.settings.compactMode) {
      const title = header.createEl('h3', { 
        text: 'Kanban Board', 
        cls: 'datacore-kanban-title' 
      });
      
      const toolbar = header.createEl('div', { cls: 'datacore-kanban-toolbar' });
      
      // Add refresh button
      const refreshBtn = toolbar.createEl('button', { 
        text: '🔄 Refresh', 
        cls: 'datacore-refresh-btn' 
      });
      refreshBtn.onclick = () => this.refresh();
      
      // Add stats display
      const stats = toolbar.createEl('div', { cls: 'datacore-kanban-stats' });
      stats.id = 'datacore-stats';
    }

    // Create board container
    const boardContainer = this.container.createEl('div', { 
      cls: 'datacore-kanban-board',
      attr: { id: 'datacore-kanban-board' }
    });
  }

  private async loadTasks(): Promise<void> {
    try {
      const result = await this.dc.query(this.config.query);
      
      // Handle different result formats from datacore
      let tasks: any[] = [];
      
      if (Array.isArray(result)) {
        tasks = result;
      } else if (result?.value && Array.isArray(result.value)) {
        tasks = result.value;
      } else if (result?.successful && result.value) {
        if (Array.isArray(result.value)) {
          tasks = result.value;
        } else if (result.value.data && Array.isArray(result.value.data)) {
          tasks = result.value.data;
        }
      }

      // Convert to DatacoreTask format and clean for serialization
      this.tasks = tasks.map(task => {
        try {
          return SerializationUtils.cleanTaskForSerialization(task);
        } catch (error) {
          console.warn('Failed to clean task for serialization:', error, task);
          // Return a minimal safe task
          return {
            $text: String(task.$text || task.text || 'Invalid task'),
            $file: String(task.$file || ''),
            $line: Number(task.$line || 0),
            $tags: Array.isArray(task.$tags) ? task.$tags : [],
            completed: Boolean(task.completed),
            due: String(task.due || ''),
            priority: String(task.priority || ''),
            created: String(task.created || '')
          };
        }
      });
      
      console.log(`Loaded ${this.tasks.length} tasks`);
      
    } catch (error) {
      console.error('Failed to load tasks:', error);
      this.tasks = [];
      throw error;
    }
  }


  private extractTagsFromText(text: string): string[] {
    const tagRegex = /#[\w-]+/g;
    const matches = text.match(tagRegex);
    return matches || [];
  }

  private renderKanbanBoard(): void {
    const boardContainer = this.container.querySelector('#datacore-kanban-board') as HTMLElement;
    if (!boardContainer) return;

    boardContainer.empty();

    // Organize tasks by columns
    const organizedTasks = this.organizeTasksByColumns();
    
    // Render each column
    this.config.columns.forEach(column => {
      const columnTasks = organizedTasks[column.id] || [];
      this.renderColumn(boardContainer, column, columnTasks);
    });

    // Update stats
    this.updateStats();
  }

  private organizeTasksByColumns(): { [columnId: string]: DatacoreTask[] } {
    const organized: { [columnId: string]: DatacoreTask[] } = {};
    
    // Initialize all columns
    this.config.columns.forEach(column => {
      organized[column.id] = [];
    });

    // Categorize tasks
    this.tasks.forEach(task => {
      let assigned = false;
      
      // Try to match task to columns based on tags
      for (const column of this.config.columns) {
        if (this.taskMatchesColumn(task, column)) {
          organized[column.id].push(task);
          assigned = true;
          break;
        }
      }
      
      // If no specific match, put in first column (default behavior)
      if (!assigned && this.config.columns.length > 0) {
        organized[this.config.columns[0].id].push(task);
      }
    });

    // Sort tasks within each column
    this.config.columns.forEach(column => {
      if (column.sortBy) {
        organized[column.id].sort((a, b) => this.sortTasks(a, b, column.sortBy!));
      }
    });

    return organized;
  }

  private taskMatchesColumn(task: DatacoreTask, column: KanbanColumn): boolean {
    const tags = task.$tags || [];
    const columnTag = column.statusTag.toLowerCase();
    
    return tags.some((tag: string) => 
      tag.toLowerCase() === columnTag || 
      tag.toLowerCase() === columnTag.replace('#', '')
    );
  }

  private sortTasks(a: DatacoreTask, b: DatacoreTask, sortBy: string): number {
    switch (sortBy) {
      case 'due':
        return (a.due || '').localeCompare(b.due || '');
      case 'created':
        return (a.created || '').localeCompare(b.created || '');
      case 'priority':
        const priorityOrder = { 'urgent': 0, 'high': 1, 'medium': 2, 'low': 3, '': 4 };
        return (priorityOrder[a.priority as keyof typeof priorityOrder] || 4) - 
               (priorityOrder[b.priority as keyof typeof priorityOrder] || 4);
      case 'alphabetical':
        return a.$text.localeCompare(b.$text);
      default:
        return 0;
    }
  }

  private renderColumn(container: HTMLElement, column: KanbanColumn, tasks: DatacoreTask[]): void {
    const columnEl = container.createEl('div', { 
      cls: 'datacore-kanban-column',
      attr: { 
        'data-column-id': column.id,
        'data-column-data': SerializationUtils.safeStringify(column)
      }
    });

    // Column header
    const header = columnEl.createEl('div', { 
      cls: 'datacore-column-header',
      attr: { 
        style: `background-color: ${column.color}; color: white;` 
      }
    });

    header.createEl('h4', { 
      text: column.name, 
      cls: 'datacore-column-title' 
    });

    if (this.config.settings.showTaskCount) {
      header.createEl('span', { 
        text: tasks.length.toString(), 
        cls: 'datacore-task-count' 
      });
    }

    // Column content
    const content = columnEl.createEl('div', { 
      cls: 'datacore-column-content',
      attr: { 'data-column-id': column.id }
    });

    // Render tasks
    if (tasks.length === 0) {
      content.createEl('div', { 
        text: 'No tasks', 
        cls: 'datacore-empty-state' 
      });
    } else {
      tasks.forEach(task => {
        this.renderTaskCard(content, task, column);
      });
    }

    // Add drop zone styling
    content.addClass('drop-zone');
  }

  private renderTaskCard(container: HTMLElement, task: DatacoreTask, column: KanbanColumn): void {
    const card = container.createEl('div', { 
      cls: 'datacore-task-card',
      attr: {
        'draggable': this.config.settings.dragDrop ? 'true' : 'false',
        'data-task-id': SerializationUtils.generateTaskId(task),
        'data-task-data': SerializationUtils.createDragData(task)
      }
    });

    // Task text
    const textEl = card.createEl('div', { 
      text: task.$text, 
      cls: 'datacore-task-text' 
    });

    // Task metadata
    const meta = card.createEl('div', { cls: 'datacore-task-meta' });

    // File name
    if (task.$file) {
      const fileName = task.$file.split('/').pop()?.replace('.md', '') || '';
      meta.createEl('span', { 
        text: `📄 ${fileName}`, 
        cls: 'datacore-task-file' 
      });
    }

    // Due date
    if (task.due) {
      meta.createEl('span', { 
        text: `📅 ${task.due}`, 
        cls: 'datacore-task-due' 
      });
    }

    // Priority
    if (task.priority) {
      const priorityIcon = this.getPriorityIcon(task.priority);
      meta.createEl('span', { 
        text: `${priorityIcon} ${task.priority}`, 
        cls: 'datacore-task-priority' 
      });
    }

    // Tags (excluding status tag)
    const otherTags = (task.$tags || []).filter(tag => tag !== column.statusTag);
    if (otherTags.length > 0) {
      const tagContainer = meta.createEl('div', { cls: 'datacore-task-tags' });
      otherTags.forEach(tag => {
        tagContainer.createEl('span', { 
          text: tag, 
          cls: 'datacore-task-tag' 
        });
      });
    }

    // Click handler to open file
    card.addEventListener('click', async (e) => {
      if (e.defaultPrevented) return; // Don't open if drag was prevented
      
      try {
        if (task.$file) {
          const file = this.dc.vault.getAbstractFileByPath(task.$file);
          if (file) {
            // This would need to be handled by the parent plugin
            console.log('Open file:', task.$file);
          }
        }
      } catch (error) {
        console.error('Failed to open task file:', error);
      }
    });
  }

  private getPriorityIcon(priority: string): string {
    switch (priority.toLowerCase()) {
      case 'urgent': return '🔴';
      case 'high': return '🟠';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '⚫';
    }
  }


  private setupDragDropSystem(): void {
    if (!this.config.settings.dragDrop) return;

    const boardElement = this.container.querySelector('#datacore-kanban-board') as HTMLElement;
    if (boardElement) {
      this.dragController.setupDragDropEvents(boardElement);
    }
  }

  private setupEventListeners(): void {
    // Add any additional event listeners here
    console.log('Event listeners setup completed');
  }

  private updateStats(): void {
    const statsEl = this.container.querySelector('#datacore-stats') as HTMLElement;
    if (statsEl) {
      const totalTasks = this.tasks.length;
      const completedTasks = this.tasks.filter(task => task.completed).length;
      statsEl.textContent = `${totalTasks} tasks (${completedTasks} completed)`;
    }
  }

  private handleTaskMove(task: DatacoreTask, fromColumn: string, toColumn: string): void {
    console.log(`Task moved: ${task.$text} from ${fromColumn} to ${toColumn}`);
    // Additional handling can be added here
  }

  private renderError(message: string): void {
    this.container.empty();
    const errorEl = this.container.createEl('div', { cls: 'datacore-error' });
    errorEl.createEl('div', { text: '⚠️ Error', cls: 'datacore-error-title' });
    errorEl.createEl('div', { text: message, cls: 'datacore-error-message' });
    
    const retryBtn = errorEl.createEl('button', { 
      text: 'Retry', 
      cls: 'datacore-retry-btn' 
    });
    retryBtn.onclick = () => this.render();
  }

  // Public methods
  async refresh(): Promise<void> {
    if (!this.isRendered) return;
    
    try {
      await this.loadTasks();
      this.renderKanbanBoard();
      console.log('DatacoreKanbanView refreshed');
    } catch (error) {
      console.error('Failed to refresh DatacoreKanbanView:', error);
    }
  }

  getTasks(): DatacoreTask[] {
    return [...this.tasks];
  }

  getConfig(): KanbanConfig {
    return { ...this.config };
  }

  updateConfig(newConfig: Partial<KanbanConfig>): void {
    this.config = { ...this.config, ...newConfig };
    if (this.isRendered) {
      this.render();
    }
  }

  destroy(): void {
    this.dragController.destroy();
    this.isRendered = false;
    if (this.container) {
      this.container.empty();
    }
  }
}