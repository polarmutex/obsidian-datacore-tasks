import { ItemView, WorkspaceLeaf } from 'obsidian';
import type { App as ObsidianApp } from 'obsidian-typings';
import DatacoreKanbanPlugin from './main';
import { SerializationUtils } from './utils/SerializationUtils';

export const VIEW_TYPE_JS_KANBAN = 'datacore-js-kanban-view';

export class JavaScriptKanbanView extends ItemView {
    plugin: DatacoreKanbanPlugin;
    private datacoreView: any = null;

    // Type the app property properly
    declare app: ObsidianApp;

    constructor(leaf: WorkspaceLeaf, plugin: DatacoreKanbanPlugin) {
        super(leaf);
        this.plugin = plugin;
    }

    getViewType(): string {
        return VIEW_TYPE_JS_KANBAN;
    }

    getDisplayText(): string {
        return 'Kanban Board (JS)';
    }

    getIcon(): string {
        return 'layout-grid';
    }

    async onOpen(): Promise<void> {
        const container = this.containerEl.children[1];
        container.empty();
        container.addClass('js-kanban-view-container');

        try {
            // Check if Datacore is ready
            if (!this.plugin.isDatacoreReady) {
                this.showLoadingState(container);
                
                // Wait for Datacore to be ready
                const checkReady = async () => {
                    if (this.plugin.isDatacoreReady) {
                        await this.initializeJavaScriptView(container);
                    } else {
                        setTimeout(checkReady, 1000);
                    }
                };
                checkReady();
            } else {
                await this.initializeJavaScriptView(container);
            }

        } catch (error) {
            console.error('Failed to open JavaScript Kanban view:', error);
            this.showErrorState(container, 'Failed to initialize JavaScript Kanban board');
        }
    }

    private async initializeJavaScriptView(container: HTMLElement): Promise<void> {
        try {
            // Get Datacore API
            const datacoreApi = this.plugin.datacoreApi;
            if (!datacoreApi) {
                throw new Error('Datacore API not available');
            }

            // Create view container
            const viewContainer = container.createEl('div', { 
                cls: 'datacore-view-container',
                attr: { id: 'kanban-js-view' }
            });

            // For now, create a simplified HTML-based kanban view
            // This bridges to the eventual JavaScript view implementation
            await this.createSimplifiedKanbanView(viewContainer, datacoreApi);

            // Set up event listeners for settings changes
            this.setupEventListeners();

        } catch (error) {
            console.error('Failed to initialize JavaScript kanban view:', error);
            this.showErrorState(container, 'Failed to load JavaScript Kanban view');
        }
    }

    private async createSimplifiedKanbanView(container: HTMLElement, datacoreApi: any): Promise<void> {
        // Create header
        const header = container.createEl('div', { cls: 'js-kanban-header' });
        const title = header.createEl('h2', { text: 'Kanban Board (JavaScript)', cls: 'js-kanban-title' });
        const subtitle = header.createEl('p', { 
            text: 'Enhanced JavaScript view with search, filtering, and bulk operations',
            cls: 'js-kanban-subtitle' 
        });

        // Create toolbar
        const toolbar = container.createEl('div', { cls: 'js-kanban-toolbar' });
        
        // Search input
        const searchContainer = toolbar.createEl('div', { cls: 'js-kanban-search' });
        const searchInput = searchContainer.createEl('input', {
            type: 'text',
            placeholder: 'Search tasks... (Ctrl+F)',
            cls: 'js-kanban-search-input'
        });

        // Filter dropdown
        const filterSelect = toolbar.createEl('select', { cls: 'js-kanban-filter' });
        ['All Tasks', 'Pending', 'Completed', 'Overdue', 'Due Today'].forEach(option => {
            filterSelect.createEl('option', { value: option.toLowerCase().replace(' ', '_'), text: option });
        });

        // Stats display
        const stats = toolbar.createEl('div', { cls: 'js-kanban-stats' });

        // Create board container
        const boardContainer = container.createEl('div', { cls: 'js-kanban-board' });

        // Load and display tasks
        await this.loadAndDisplayTasks(boardContainer, stats, datacoreApi);

        // Set up search functionality
        searchInput.addEventListener('input', (e) => {
            this.filterTasks((e.target as HTMLInputElement).value, filterSelect.value);
        });

        filterSelect.addEventListener('change', (e) => {
            this.filterTasks(searchInput.value, (e.target as HTMLSelectElement).value);
        });

        // Set up keyboard shortcuts
        this.setupKeyboardShortcuts(container, searchInput);

        // Add drag indicator
        this.addDragIndicator(container);
    }

    private async loadAndDisplayTasks(boardContainer: HTMLElement, stats: HTMLElement, datacoreApi: any): Promise<void> {
        try {
            // Query tasks using Datacore
            const query = this.plugin.settings.datacoreQuery || '@task';
            const result = await datacoreApi.query(query);
            
            let tasks: any[] = [];
            
            // Handle different result formats
            if (Array.isArray(result)) {
                tasks = result;
            } else if (result?.value && Array.isArray(result.value)) {
                tasks = result.value;
            } else if (result?.successful && result.value) {
                if (Array.isArray(result.value)) {
                    tasks = result.value;
                } else if (result.value.type === 'list' && result.value.data) {
                    tasks = result.value.data;
                }
            }

            // Display stats
            stats.textContent = `${tasks.length} tasks`;

            // Create columns
            this.createColumns(boardContainer, tasks);

        } catch (error) {
            console.error('Failed to load tasks:', error);
            boardContainer.innerHTML = `
                <div class="js-kanban-error">
                    <div class="error-icon">⚠️</div>
                    <div class="error-message">Failed to load tasks: ${error.message}</div>
                    <button onclick="location.reload()">Retry</button>
                </div>
            `;
        }
    }

    private createColumns(boardContainer: HTMLElement, tasks: any[]): void {
        boardContainer.empty();
        
        const columns = this.plugin.settings.columns;
        
        columns.forEach(column => {
            const columnEl = boardContainer.createEl('div', { 
                cls: 'js-kanban-column',
                attr: { 'data-column-id': column.id }
            });
            
            // Column header
            const header = columnEl.createEl('div', { 
                cls: 'js-kanban-column-header',
                attr: { style: `background-color: ${column.color}` }
            });
            header.createEl('h3', { text: column.name, cls: 'js-kanban-column-title' });
            
            // Column content
            const content = columnEl.createEl('div', { cls: 'js-kanban-column-content' });
            
            // Filter tasks for this column
            const columnTasks = tasks.filter(task => this.taskMatchesColumn(task, column));
            
            // Add task count to header
            header.createEl('span', { text: columnTasks.length.toString(), cls: 'js-kanban-task-count' });
            
            // Setup drop zone for the column
            this.setupColumnDropZone(content, column);
            
            // Create task cards
            columnTasks.forEach(task => {
                this.createTaskCard(content, task);
            });
            
            if (columnTasks.length === 0) {
                content.createEl('div', { text: 'No tasks', cls: 'js-kanban-empty' });
            }
        });
    }

    private setupColumnDropZone(columnContent: HTMLElement, column: any): void {
        // Allow dropping
        columnContent.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer!.dropEffect = 'move';
            columnContent.classList.add('js-drop-over');
        });
        
        // Remove drop styling when drag leaves
        columnContent.addEventListener('dragleave', (e) => {
            // Only remove if we're actually leaving the column
            if (!columnContent.contains(e.relatedTarget as Node)) {
                columnContent.classList.remove('js-drop-over');
            }
        });
        
        // Handle drop
        columnContent.addEventListener('drop', async (e) => {
            e.preventDefault();
            columnContent.classList.remove('js-drop-over');
            
            try {
                const taskData = e.dataTransfer!.getData('application/json');
                if (!taskData) {
                    console.warn('No task data found in drop event');
                    return;
                }
                
                const task = SerializationUtils.restoreFromDragData(taskData);
                if (!task) {
                    console.error('Failed to restore task from drag data');
                    return;
                }
                console.log('Dropping task:', this.extractTaskText(task), 'into column:', column.name);
                
                // Move task to new column
                await this.moveTaskToColumn(task, column);
                
            } catch (error) {
                console.error('Failed to handle drop:', error);
            }
        });
    }

    private async moveTaskToColumn(task: any, targetColumn: any): Promise<void> {
        try {
            const filePath = this.extractFilePath(task);
            if (!filePath) {
                console.error('No file path found for task');
                return;
            }
            
            const file = this.app.vault.getAbstractFileByPath(filePath);
            if (!file) {
                console.error('File not found:', filePath);
                return;
            }
            
            // Read file content
            const content = await this.app.vault.read(file);
            const lines = content.split('\n');
            
            // Find the task line
            const taskLine = this.findTaskLineInFile(lines, task);
            if (taskLine === -1) {
                console.error('Task line not found in file');
                return;
            }
            
            // Update the line with new tags
            let line = lines[taskLine];
            const currentTags = this.extractTags(task);
            const targetTag = targetColumn.tag;
            
            // Remove existing status tags
            this.plugin.settings.columns.forEach(col => {
                const colTag = col.tag.replace('#', '');
                line = line.replace(new RegExp(`\\s*#${colTag}\\b`, 'gi'), '');
            });
            
            // Add new tag if not already present
            if (!line.includes(targetTag)) {
                line = line.trim() + ' ' + targetTag;
            }
            
            // Update task completion status based on column
            if (targetColumn.id === 'done') {
                line = line.replace(/- \[ \]/, '- [x]');
            } else {
                line = line.replace(/- \[x\]/, '- [ ]');
            }
            
            // Update the file
            lines[taskLine] = line;
            const newContent = lines.join('\n');
            await this.app.vault.modify(file, newContent);
            
            console.log('Task moved successfully');
            
            // Refresh the view
            await this.refreshView();
            
        } catch (error) {
            console.error('Failed to move task:', error);
            // Show user-friendly error
            const notice = document.createEl('div', {
                cls: 'notice',
                text: `Failed to move task: ${error.message}`
            });
            document.body.appendChild(notice);
            setTimeout(() => notice.remove(), 3000);
        }
    }

    private findTaskLineInFile(lines: string[], task: any): number {
        const taskText = this.extractTaskText(task);
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            // Check if this line contains the task text and is a task
            if (line.includes(taskText) && this.isTaskLine(line)) {
                return i;
            }
        }
        
        return -1;
    }

    private isTaskLine(line: string): boolean {
        return line.includes('- [ ]') || line.includes('- [x]') || line.includes('- [X]');
    }

    private createTaskCard(container: HTMLElement, task: any): void {
        const card = container.createEl('div', { 
            cls: 'js-kanban-task-card',
            attr: {
                'draggable': 'true',
                'data-task-id': SerializationUtils.generateTaskId(task),
                'data-task-data': SerializationUtils.createDragData(task)
            }
        });
        
        // Task text
        const text = this.extractTaskText(task);
        card.createEl('div', { text: text, cls: 'js-task-text' });
        
        // Task metadata
        const meta = card.createEl('div', { cls: 'js-task-meta' });
        
        // File info
        const fileName = this.extractFileName(task);
        if (fileName) {
            meta.createEl('span', { text: fileName, cls: 'js-task-file' });
        }
        
        // Due date
        const dueDate = this.extractDueDate(task);
        if (dueDate) {
            meta.createEl('span', { text: dueDate, cls: 'js-task-due' });
        }
        
        // Tags
        const tags = this.extractTags(task);
        if (tags.length > 0) {
            const tagContainer = meta.createEl('div', { cls: 'js-task-tags' });
            tags.forEach(tag => {
                tagContainer.createEl('span', { text: tag, cls: 'js-task-tag' });
            });
        }
        
        // Add drag and drop event listeners
        this.setupTaskCardDragAndDrop(card, task);
        
        // Click handler to open file (with drag detection)
        let isDragging = false;
        let dragStartTime = 0;
        
        card.addEventListener('mousedown', () => {
            dragStartTime = Date.now();
        });
        
        card.addEventListener('click', async (e) => {
            // Only handle click if it wasn't a drag operation
            if (isDragging || (Date.now() - dragStartTime > 200)) {
                return;
            }
            
            e.preventDefault();
            try {
                const filePath = this.extractFilePath(task);
                if (filePath) {
                    const file = this.app.vault.getAbstractFileByPath(filePath);
                    if (file) {
                        await this.app.workspace.getLeaf().openFile(file);
                    }
                }
            } catch (error) {
                console.error('Failed to open task file:', error);
            }
        });
    }

    private setupTaskCardDragAndDrop(card: HTMLElement, task: any): void {
        // Ensure draggable attribute is set
        card.setAttribute('draggable', 'true');
        
        // Drag start
        card.addEventListener('dragstart', (e) => {
            console.log('Drag start event triggered for task:', this.extractTaskText(task));
            
            if (!e.dataTransfer) {
                console.error('DataTransfer not available');
                return;
            }
            
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', SerializationUtils.generateTaskId(task));
            e.dataTransfer.setData('application/json', SerializationUtils.createDragData(task));
            
            card.classList.add('js-dragging');
            console.log('Drag started successfully for task:', this.extractTaskText(task));
        });
        
        // Drag end
        card.addEventListener('dragend', (e) => {
            card.classList.remove('js-dragging');
            console.log('Drag ended for task:', this.extractTaskText(task));
        });
        
        // Add visual feedback for draggable items
        card.addEventListener('mouseenter', () => {
            card.style.cursor = 'grab';
        });
        
        card.addEventListener('mousedown', () => {
            card.style.cursor = 'grabbing';
        });
        
        card.addEventListener('mouseup', () => {
            card.style.cursor = 'grab';
        });
    }

    private taskMatchesColumn(task: any, column: any): boolean {
        const tags = this.extractTags(task);
        const columnTag = column.tag.toLowerCase();
        
        return tags.some((tag: string) => 
            tag.toLowerCase() === columnTag || 
            tag.toLowerCase() === columnTag.replace('#', '')
        );
    }

    private extractTaskText(task: any): string {
        return task.$text || task.text || task.task || task.description || 'Untitled task';
    }

    private extractFileName(task: any): string {
        if (task.$file) return task.$file.split('/').pop()?.replace('.md', '') || '';
        if (task.file?.basename) return task.file.basename;
        if (task.file?.path) return task.file.path.split('/').pop()?.replace('.md', '') || '';
        return '';
    }

    private extractFilePath(task: any): string {
        return task.$file || task.file?.path || '';
    }

    private extractDueDate(task: any): string {
        return task.due || task.dueDate || task.$due || '';
    }

    private extractTags(task: any): string[] {
        if (task.$tags && Array.isArray(task.$tags)) return task.$tags;
        if (task.tags && Array.isArray(task.tags)) return task.tags;
        
        const text = this.extractTaskText(task);
        const tagRegex = /#[\w-]+/g;
        const matches = text.match(tagRegex);
        return matches || [];
    }


    private filterTasks(searchTerm: string, filter: string): void {
        // Implementation for filtering tasks
        console.log('Filtering tasks:', searchTerm, filter);
        // TODO: Implement live filtering
    }

    private setupKeyboardShortcuts(container: HTMLElement, searchInput: HTMLInputElement): void {
        container.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                e.preventDefault();
                searchInput.focus();
            }
        });
    }

    private addDragIndicator(container: HTMLElement): void {
        // Add a helpful tip about drag and drop
        const helpText = container.createEl('div', { 
            cls: 'js-kanban-help',
            text: '💡 Tip: Drag tasks between columns to change their status'
        });
        
        // Hide the help text after a few seconds
        setTimeout(() => {
            helpText.style.opacity = '0';
            setTimeout(() => helpText.remove(), 300);
        }, 5000);
    }

    private setupEventListeners(): void {
        // Listen for settings changes
        this.registerEvent(
            this.app.workspace.on('datacore-kanban:settings-changed', () => {
                this.refreshView();
            })
        );

        // Listen for Datacore refresh events
        this.registerEvent(
            this.app.workspace.on('datacore-kanban:refresh', () => {
                this.refreshView();
            })
        );
    }

    private async refreshView(): Promise<void> {
        try {
            // Find the board container and reload tasks
            const container = document.getElementById('kanban-js-view');
            if (container) {
                const boardContainer = container.querySelector('.js-kanban-board') as HTMLElement;
                const stats = container.querySelector('.js-kanban-stats') as HTMLElement;
                
                if (boardContainer && stats) {
                    const datacoreApi = this.plugin.datacoreApi;
                    if (datacoreApi) {
                        await this.loadAndDisplayTasks(boardContainer, stats, datacoreApi);
                    }
                }
            }
        } catch (error) {
            console.error('Failed to refresh JavaScript view:', error);
        }
    }

    private showLoadingState(container: HTMLElement): void {
        container.empty();
        const loading = container.createEl('div', { cls: 'js-kanban-loading' });
        loading.innerHTML = `
            <div class="kanban-loading-spinner"></div>
            <div>Loading Datacore JavaScript View...</div>
        `;
    }

    private showErrorState(container: HTMLElement, message: string): void {
        container.empty();
        const error = container.createEl('div', { cls: 'js-kanban-error' });
        error.innerHTML = `
            <div class="kanban-error-icon">⚠️</div>
            <div class="kanban-error-message">${message}</div>
            <button class="kanban-error-retry">Retry</button>
        `;

        const retryButton = error.querySelector('.kanban-error-retry') as HTMLButtonElement;
        if (retryButton) {
            retryButton.onclick = () => {
                this.onOpen();
            };
        }
    }

    async onClose(): Promise<void> {
        try {
            // Cleanup Datacore view
            if (this.datacoreView) {
                await this.datacoreView.destroy();
                this.datacoreView = null;
            }
        } catch (error) {
            console.error('Error during JavaScript view close:', error);
        }
    }

    // Public method to force refresh
    async forceRefresh(): Promise<void> {
        await this.refreshView();
    }

    // Public method to get view state
    getViewState(): any {
        return {
            isReady: this.plugin.isDatacoreReady,
            hasView: this.datacoreView !== null,
            viewType: 'javascript'
        };
    }
}