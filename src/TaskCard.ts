import { TaskItem } from './DatacoreSync';
import { KanbanSettings } from './Settings';

export class TaskCard {
    task: TaskItem;
    settings: KanbanSettings;
    element: HTMLElement | null = null;

    constructor(task: TaskItem, settings: KanbanSettings) {
        this.task = task;
        this.settings = settings;
    }

    async render(): Promise<HTMLElement> {
        const card = document.createElement('div');
        card.className = 'kanban-card';
        card.draggable = true;
        card.dataset.taskId = this.task.id;

        // Set up drag events
        this.setupDragEvents(card);

        // Card header with task text
        const header = card.createEl('div', { cls: 'kanban-card-header' });
        const taskText = header.createEl('div', { 
            cls: 'kanban-card-text',
            text: this.task.text 
        });

        // Truncate long text
        if (this.task.text.length > 100) {
            taskText.textContent = this.task.text.substring(0, 97) + '...';
            taskText.title = this.task.text;
        }

        // Card metadata
        const metadata = card.createEl('div', { cls: 'kanban-card-metadata' });

        // Show due date if enabled and available
        if (this.settings.showDueDate && this.task.dueDate) {
            const dueDate = metadata.createEl('div', { cls: 'kanban-card-due' });
            dueDate.innerHTML = `📅 ${this.formatDate(this.task.dueDate)}`;
            
            // Highlight overdue tasks
            const due = new Date(this.task.dueDate);
            const now = new Date();
            if (due < now) {
                dueDate.addClass('kanban-card-overdue');
            }
        }

        // Show priority if enabled and available
        if (this.settings.showPriority && this.task.priority) {
            const priority = metadata.createEl('div', { cls: 'kanban-card-priority' });
            const priorityIcon = this.getPriorityIcon(this.task.priority);
            priority.innerHTML = `${priorityIcon} ${this.task.priority}`;
            priority.addClass(`kanban-priority-${this.task.priority.toLowerCase()}`);
        }

        // Show tags if enabled
        if (this.settings.showTags && this.task.tags.length > 0) {
            const tagsContainer = metadata.createEl('div', { cls: 'kanban-card-tags' });
            
            // Only show non-status tags
            const statusTags = this.settings.columns.map(col => col.tag);
            const displayTags = this.task.tags.filter(tag => !statusTags.includes(tag));
            
            displayTags.slice(0, 3).forEach(tag => {
                const tagEl = tagsContainer.createEl('span', { 
                    cls: 'kanban-card-tag',
                    text: tag 
                });
            });

            if (displayTags.length > 3) {
                tagsContainer.createEl('span', { 
                    cls: 'kanban-card-tag-more',
                    text: `+${displayTags.length - 3}`
                });
            }
        }

        // Card actions
        const actions = card.createEl('div', { cls: 'kanban-card-actions' });
        
        const openButton = actions.createEl('button', {
            cls: 'kanban-card-action',
            attr: { 'aria-label': 'Open file' }
        });
        openButton.innerHTML = '📝';
        openButton.onclick = (e) => {
            e.stopPropagation();
            this.openTaskFile();
        };

        // Set max height if configured
        if (this.settings.cardMaxHeight > 0) {
            card.style.maxHeight = `${this.settings.cardMaxHeight}px`;
        }

        this.element = card;
        return card;
    }

    private setupDragEvents(card: HTMLElement) {
        card.addEventListener('dragstart', (e) => {
            if (e.dataTransfer) {
                e.dataTransfer.setData('text/plain', this.task.id);
                e.dataTransfer.effectAllowed = 'move';
            }
            card.classList.add('kanban-card-dragging');
        });

        card.addEventListener('dragend', () => {
            card.classList.remove('kanban-card-dragging');
        });

        // Add visual feedback on hover
        card.addEventListener('mouseenter', () => {
            card.classList.add('kanban-card-hover');
        });

        card.addEventListener('mouseleave', () => {
            card.classList.remove('kanban-card-hover');
        });
    }

    private formatDate(dateStr: string): string {
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString(undefined, { 
                month: 'short', 
                day: 'numeric' 
            });
        } catch {
            return dateStr;
        }
    }

    private getPriorityIcon(priority: string): string {
        const lower = priority.toLowerCase();
        switch (lower) {
            case 'high':
            case 'urgent':
                return '🔴';
            case 'medium':
            case 'normal':
                return '🟡';
            case 'low':
                return '🟢';
            default:
                return '⚪';
        }
    }

    private async openTaskFile() {
        try {
            const leaf = this.task.file.app.workspace.getLeaf();
            await leaf.openFile(this.task.file);
            
            // Jump to the specific line if possible
            const view = leaf.view;
            if (view && 'editor' in view && view.editor) {
                view.editor.setCursor({ line: this.task.line, ch: 0 });
                view.editor.scrollIntoView({ line: this.task.line, ch: 0 });
            }
        } catch (error) {
            console.error('Failed to open task file:', error);
        }
    }

    destroy() {
        if (this.element) {
            this.element.remove();
            this.element = null;
        }
    }
}