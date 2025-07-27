import { KanbanSettings, KanbanColumn } from './Settings';
import { DatacoreSync, TaskItem } from './DatacoreSync';
import { TagManager } from './TagManager';
import { TaskCard } from './TaskCard';

export class KanbanBoard {
    container: HTMLElement;
    datacoreSync: DatacoreSync;
    tagManager: TagManager;
    settings: KanbanSettings;
    columns: Map<string, HTMLElement> = new Map();
    cards: Map<string, TaskCard> = new Map();
    private currentTasks: TaskItem[] = [];

    constructor(
        container: HTMLElement,
        datacoreSync: DatacoreSync,
        tagManager: TagManager,
        settings: KanbanSettings
    ) {
        this.container = container;
        this.datacoreSync = datacoreSync;
        this.tagManager = tagManager;
        this.settings = settings;
    }

    async render() {
        this.container.empty();
        this.container.addClass('kanban-board');

        // Create columns
        for (const columnConfig of this.settings.columns) {
            await this.createColumn(columnConfig);
        }

        // Load and render tasks
        await this.refresh();
    }

    private async createColumn(config: KanbanColumn) {
        const column = this.container.createEl('div', { 
            cls: 'kanban-column',
            attr: { 'data-column-id': config.id }
        });

        // Column header
        const header = column.createEl('div', { cls: 'kanban-column-header' });
        header.style.borderTopColor = config.color;
        
        const title = header.createEl('h3', { 
            text: config.name,
            cls: 'kanban-column-title'
        });
        title.style.color = config.color;

        const count = header.createEl('span', { 
            cls: 'kanban-column-count',
            text: '0'
        });

        // Column content
        const content = column.createEl('div', { cls: 'kanban-column-content' });

        // Set up drop zone
        this.setupDropZone(content, config);

        this.columns.set(config.id, content);
    }

    private setupDropZone(element: HTMLElement, config: KanbanColumn) {
        element.addEventListener('dragover', (e) => {
            e.preventDefault();
            element.classList.add('kanban-drop-zone-active');
        });

        element.addEventListener('dragleave', (e) => {
            if (!element.contains(e.relatedTarget as Node)) {
                element.classList.remove('kanban-drop-zone-active');
            }
        });

        element.addEventListener('drop', async (e) => {
            e.preventDefault();
            element.classList.remove('kanban-drop-zone-active');

            const taskId = e.dataTransfer?.getData('text/plain');
            if (taskId) {
                await this.moveTask(taskId, config);
            }
        });
    }

    async refresh() {
        try {
            const tasks = await this.datacoreSync.getTasks();
            await this.renderTasks(tasks);
        } catch (error) {
            console.error('Failed to refresh kanban board:', error);
        }
    }

    private async renderTasks(tasks: TaskItem[]): Promise<void> {
        // Store current tasks
        this.currentTasks = tasks;

        // Clear existing cards
        this.cards.forEach(card => card.destroy());
        this.cards.clear();
        this.columns.forEach(column => column.empty());

        // Group tasks by status
        const tasksByColumn = new Map<string, TaskItem[]>();
        
        for (const columnConfig of this.settings.columns) {
            tasksByColumn.set(columnConfig.id, []);
        }

        // Categorize tasks
        for (const task of tasks) {
            const column = this.getColumnForTask(task);
            if (column) {
                const tasks = tasksByColumn.get(column.id) || [];
                tasks.push(task);
                tasksByColumn.set(column.id, tasks);
            }
        }

        // Render tasks in columns
        for (const [columnId, columnTasks] of tasksByColumn) {
            const columnElement = this.columns.get(columnId);
            if (columnElement) {
                for (const task of columnTasks) {
                    const card = new TaskCard(task, this.settings);
                    const cardElement = await card.render();
                    columnElement.appendChild(cardElement);
                    this.cards.set(task.id, card);
                }

                // Update column count
                this.updateColumnCount(columnId, columnTasks.length);
            }
        }
    }

    private getColumnForTask(task: TaskItem): KanbanColumn | null {
        for (const column of this.settings.columns) {
            if (task.tags.includes(column.tag)) {
                return column;
            }
        }
        // Default to first column if no tag matches
        return this.settings.columns[0] || null;
    }

    private updateColumnCount(columnId: string, count: number) {
        const columnElement = this.container.querySelector(`[data-column-id="${columnId}"]`);
        const countElement = columnElement?.querySelector('.kanban-column-count');
        if (countElement) {
            countElement.textContent = count.toString();
        }
    }

    async moveTask(taskId: string, targetColumn: KanbanColumn) {
        const card = this.cards.get(taskId);
        if (!card) return;

        try {
            // Update task tags
            await this.tagManager.updateTaskStatus(card.task, targetColumn.tag);
            
            // Refresh the board to reflect changes
            await this.refresh();
        } catch (error) {
            console.error('Failed to move task:', error);
        }
    }

    destroy(): void {
        this.cards.forEach(card => card.destroy());
        this.cards.clear();
        this.columns.clear();
        this.currentTasks = [];
    }

    // Public method to get task count
    getTaskCount(): number {
        return this.currentTasks.length;
    }

    // Public method to get tasks by column
    getTasksByColumn(): Map<string, TaskItem[]> {
        const tasksByColumn = new Map<string, TaskItem[]>();
        
        for (const columnConfig of this.settings.columns) {
            tasksByColumn.set(columnConfig.id, []);
        }

        for (const task of this.currentTasks) {
            const column = this.getColumnForTask(task);
            if (column) {
                const tasks = tasksByColumn.get(column.id) || [];
                tasks.push(task);
                tasksByColumn.set(column.id, tasks);
            }
        }

        return tasksByColumn;
    }

    // Public method to get column statistics
    getColumnStats(): Record<string, number> {
        const stats: Record<string, number> = {};
        const tasksByColumn = this.getTasksByColumn();
        
        for (const [columnId, tasks] of tasksByColumn) {
            stats[columnId] = tasks.length;
        }

        return stats;
    }
}