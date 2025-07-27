import { App, TFile, Notice, EventRef } from 'obsidian';
import { DatacoreApi, Literal, Query, DataObject } from '@blacksmithgu/datacore';
import DatacoreKanbanPlugin from './main';

export interface TaskItem {
    id: string;
    text: string;
    file: TFile;
    line: number;
    tags: string[];
    dueDate?: string;
    priority?: string;
    status: string;
    completed: boolean;
    metadata: Record<string, any>;
    dataObject?: DataObject;
}

export class DatacoreSync {
    app: App;
    plugin: DatacoreKanbanPlugin;
    datacoreApi: DatacoreApi | null = null;
    eventRefs: EventRef[] = [];
    private debounceTimer: number | null = null;
    private isInitialized = false;

    constructor(app: App, plugin: DatacoreKanbanPlugin) {
        this.app = app;
        this.plugin = plugin;
    }

    async initialize(): Promise<boolean> {
        try {
            // Try to get Datacore API directly from the plugin
            const datacorePlugin = this.app.plugins.plugins['datacore'];
            if (datacorePlugin?.api) {
                this.datacoreApi = datacorePlugin.api as DatacoreApi;
                this.setupEventListeners();
                this.isInitialized = true;
                return true;
            }

            // Fallback: wait for Datacore to be available
            const maxRetries = 10;
            let retries = 0;

            while (retries < maxRetries) {
                const plugin = this.app.plugins.plugins['datacore'];
                if (plugin?.api) {
                    this.datacoreApi = plugin.api as DatacoreApi;
                    this.setupEventListeners();
                    this.isInitialized = true;
                    return true;
                }

                await this.sleep(1000);
                retries++;
            }

            new Notice('Datacore plugin not found or not ready. Please ensure it is installed and enabled.');
            return false;
        } catch (error) {
            console.error('Failed to initialize Datacore API:', error);
            new Notice('Failed to initialize Datacore integration');
            return false;
        }
    }

    private setupEventListeners(): void {
        if (!this.datacoreApi) return;

        // Listen for Datacore index changes (with safety check)
        if (this.datacoreApi.index && typeof this.datacoreApi.index.on === 'function') {
            try {
                const indexRef = this.datacoreApi.index.on('update', () => {
                    this.debounceRefresh();
                });
                
                if (indexRef) {
                    this.eventRefs.push(indexRef);
                }
            } catch (error) {
                console.warn('Failed to setup Datacore index listener:', error);
            }
        } else {
            console.warn('Datacore API does not have index.on method available');
        }

        // Listen for file changes as backup
        const vaultRef = this.app.vault.on('modify', (file) => {
            if (file instanceof TFile && file.extension === 'md') {
                this.debounceRefresh();
            }
        });
        
        this.eventRefs.push(vaultRef);
    }

    private debounceRefresh(): void {
        if (this.debounceTimer) {
            window.clearTimeout(this.debounceTimer);
        }
        
        this.debounceTimer = window.setTimeout(() => {
            this.app.workspace.trigger('datacore-kanban:refresh');
            this.debounceTimer = null;
        }, 500);
    }

    async getTasks(): Promise<TaskItem[]> {
        if (!this.datacoreApi || !this.isInitialized) {
            console.error('Datacore API not available');
            return [];
        }

        try {
            // Use Datacore's query API
            const queryText = this.plugin.settings.datacoreQuery;
            const query = await this.datacoreApi.query(queryText);
            
            if (!query?.successful || !query.value) {
                console.warn('Datacore query failed or returned no results');
                return [];
            }

            const tasks: TaskItem[] = [];
            const result = query.value;

            // Handle different result types
            if (result.type === 'table') {
                for (const row of result.data.values) {
                    const task = await this.parseTaskFromTableRow(row, result.data.headers);
                    if (task) {
                        tasks.push(task);
                    }
                }
            } else if (result.type === 'list') {
                for (const item of result.data) {
                    const task = await this.parseTaskFromListItem(item);
                    if (task) {
                        tasks.push(task);
                    }
                }
            }

            return tasks;
        } catch (error) {
            console.error('Error querying Datacore:', error);
            new Notice('Failed to load tasks from Datacore');
            return [];
        }
    }

    private async parseTaskFromTableRow(row: Literal[], headers: string[]): Promise<TaskItem | null> {
        try {
            // Create a map of headers to values
            const rowData: Record<string, Literal> = {};
            headers.forEach((header, index) => {
                rowData[header] = row[index];
            });

            return this.createTaskFromData(rowData);
        } catch (error) {
            console.error('Error parsing task from table row:', error);
            return null;
        }
    }

    private async parseTaskFromListItem(item: Literal): Promise<TaskItem | null> {
        try {
            if (typeof item === 'object' && item !== null && 'file' in item) {
                return this.createTaskFromData(item as Record<string, Literal>);
            }
            return null;
        } catch (error) {
            console.error('Error parsing task from list item:', error);
            return null;
        }
    }

    private async createTaskFromData(data: Record<string, Literal>): Promise<TaskItem | null> {
        try {
            // Extract file information
            const fileData = data.file || data.path;
            if (!fileData || typeof fileData !== 'object' || !('path' in fileData)) {
                return null;
            }

            const filePath = (fileData as any).path;
            const file = this.app.vault.getAbstractFileByPath(filePath);
            if (!(file instanceof TFile)) {
                return null;
            }

            // Extract task text
            const taskText = this.extractStringValue(data.text || data.task || data.description);
            if (!taskText) {
                return null;
            }

            // Find the actual task line in the file
            const taskLine = await this.findTaskLineInFile(file, taskText);
            if (taskLine === -1) {
                return null;
            }

            // Extract other properties
            const status = this.extractStringValue(data.status) || 'todo';
            const completed = data.completed === true || status === 'done';
            const dueDate = this.extractStringValue(data.due || data.dueDate);
            const priority = this.extractStringValue(data.priority);
            
            // Extract tags
            const tags = this.extractTags(data.tags) || await this.extractTagsFromLine(file, taskLine);

            // Generate unique ID
            const id = `${file.path}:${taskLine}`;

            return {
                id,
                text: taskText,
                file,
                line: taskLine,
                tags,
                dueDate,
                priority,
                status,
                completed,
                metadata: data,
                dataObject: data as any
            };
        } catch (error) {
            console.error('Error creating task from data:', error);
            return null;
        }
    }

    private extractStringValue(value: Literal): string | undefined {
        if (typeof value === 'string') return value;
        if (typeof value === 'object' && value !== null && 'display' in value) {
            return (value as any).display;
        }
        if (typeof value === 'object' && value !== null && 'value' in value) {
            return String((value as any).value);
        }
        return undefined;
    }

    private extractTags(tagsData: Literal): string[] | undefined {
        if (Array.isArray(tagsData)) {
            return tagsData.map(tag => this.extractStringValue(tag)).filter(Boolean) as string[];
        }
        if (typeof tagsData === 'string') {
            return [tagsData];
        }
        return undefined;
    }

    private async findTaskLineInFile(file: TFile, taskText: string): Promise<number> {
        try {
            const content = await this.app.vault.read(file);
            const lines = content.split('\n');
            
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                // Check if this line contains the task text and is a task
                if (line.includes(taskText) && this.isTaskLine(line)) {
                    return i;
                }
            }
            return -1;
        } catch (error) {
            console.error('Error reading file:', error);
            return -1;
        }
    }

    private async extractTagsFromLine(file: TFile, lineNumber: number): Promise<string[]> {
        try {
            const content = await this.app.vault.read(file);
            const lines = content.split('\n');
            
            if (lineNumber >= 0 && lineNumber < lines.length) {
                return this.extractTagsFromText(lines[lineNumber]);
            }
            return [];
        } catch (error) {
            console.error('Error extracting tags from line:', error);
            return [];
        }
    }

    private extractTagsFromText(text: string): string[] {
        const tagRegex = /#[\w-]+/g;
        const matches = text.match(tagRegex);
        return matches || [];
    }

    private isTaskLine(line: string): boolean {
        return line.includes('- [ ]') || line.includes('- [x]') || line.includes('- [X]');
    }

    async refresh(): Promise<void> {
        // Trigger refresh of any listening components
        this.app.workspace.trigger('datacore-kanban:refresh');
    }

    cleanup(): void {
        // Clear event listeners
        this.eventRefs.forEach(ref => {
            try {
                if (ref && typeof ref === 'object' && 'off' in ref && typeof (ref as any).off === 'function') {
                    (ref as any).off();
                } else if (ref) {
                    this.app.vault.offref(ref);
                }
            } catch (error) {
                console.warn('Failed to cleanup event listener:', error);
            }
        });
        this.eventRefs = [];

        // Clear debounce timer
        if (this.debounceTimer) {
            window.clearTimeout(this.debounceTimer);
            this.debounceTimer = null;
        }

        this.isInitialized = false;
        this.datacoreApi = null;
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Public getters for external access
    get isReady(): boolean {
        return this.isInitialized && this.datacoreApi !== null;
    }

    get api(): DatacoreApi | null {
        return this.datacoreApi;
    }
}