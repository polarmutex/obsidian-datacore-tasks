import { ItemView, WorkspaceLeaf } from 'obsidian';
import type { App as ObsidianApp } from 'obsidian-typings';
import DatacoreKanbanPlugin from './main';

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
            
            // Create task cards
            columnTasks.forEach(task => {
                this.createTaskCard(content, task);
            });
            
            if (columnTasks.length === 0) {
                content.createEl('div', { text: 'No tasks', cls: 'js-kanban-empty' });
            }
        });
    }

    private createTaskCard(container: HTMLElement, task: any): void {
        const card = container.createEl('div', { cls: 'js-kanban-task-card' });
        
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
        
        // Click handler to open file
        card.addEventListener('click', async () => {
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
    }

    private setupKeyboardShortcuts(container: HTMLElement, searchInput: HTMLInputElement): void {
        container.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                e.preventDefault();
                searchInput.focus();
            }
        });
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
        if (this.datacoreView) {
            try {
                await this.datacoreView.refresh();
            } catch (error) {
                console.error('Failed to refresh JavaScript view:', error);
            }
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