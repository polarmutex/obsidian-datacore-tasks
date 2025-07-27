import { ItemView, WorkspaceLeaf } from 'obsidian';
import type { App as ObsidianApp } from 'obsidian-typings';
import DatacoreKanbanPlugin from './main';
import { KanbanBoard } from './KanbanBoard';

export const VIEW_TYPE_KANBAN = 'datacore-kanban-view';

export class KanbanView extends ItemView {
    plugin: DatacoreKanbanPlugin;
    kanbanBoard: KanbanBoard | null = null;
    private refreshInterval: number | null = null;
    private eventRefs: Array<{ unsubscribe: () => void }> = [];

    // Type the app property properly
    declare app: ObsidianApp;

    constructor(leaf: WorkspaceLeaf, plugin: DatacoreKanbanPlugin) {
        super(leaf);
        this.plugin = plugin;
    }

    getViewType(): string {
        return VIEW_TYPE_KANBAN;
    }

    getDisplayText(): string {
        return 'Kanban Board';
    }

    getIcon(): string {
        return 'layout-grid';
    }

    async onOpen(): Promise<void> {
        const container = this.containerEl.children[1];
        container.empty();
        container.addClass('kanban-view-container');

        try {
            // Create header
            await this.createHeader(container);

            // Create kanban board container
            const boardContainer = container.createEl('div', { cls: 'kanban-board-container' });

            // Check if Datacore is ready
            if (!this.plugin.isDatacoreReady) {
                this.showLoadingState(boardContainer);
                
                // Wait for Datacore to be ready
                const checkReady = async () => {
                    if (this.plugin.isDatacoreReady) {
                        await this.initializeBoard(boardContainer);
                    } else {
                        setTimeout(checkReady, 1000);
                    }
                };
                checkReady();
            } else {
                await this.initializeBoard(boardContainer);
            }

            // Set up event listeners
            this.setupEventListeners();

        } catch (error) {
            console.error('Failed to open Kanban view:', error);
            this.showErrorState(container, 'Failed to initialize Kanban board');
        }
    }

    private async createHeader(container: HTMLElement): Promise<void> {
        const header = container.createEl('div', { cls: 'kanban-header' });
        
        const titleContainer = header.createEl('div', { cls: 'kanban-header-title' });
        titleContainer.createEl('h2', { text: 'Kanban Board', cls: 'kanban-title' });
        
        // Add status indicator
        const status = titleContainer.createEl('span', { 
            cls: 'kanban-status',
            text: this.plugin.isDatacoreReady ? 'Ready' : 'Loading...'
        });
        
        if (this.plugin.isDatacoreReady) {
            status.addClass('kanban-status-ready');
        } else {
            status.addClass('kanban-status-loading');
        }

        const buttonContainer = header.createEl('div', { cls: 'kanban-header-buttons' });

        // Refresh button
        const refreshButton = buttonContainer.createEl('button', { 
            cls: 'kanban-refresh-btn',
            attr: { 'aria-label': 'Refresh board' }
        });
        refreshButton.innerHTML = '↻';
        refreshButton.onclick = async () => {
            await this.refreshBoard();
        };

        // Settings button
        const settingsButton = buttonContainer.createEl('button', {
            cls: 'kanban-settings-btn',
            attr: { 'aria-label': 'Open settings' }
        });
        settingsButton.innerHTML = '⚙️';
        settingsButton.onclick = () => {
            this.app.setting.open();
            this.app.setting.openTabById('datacore-kanban');
        };
    }

    private async initializeBoard(boardContainer: HTMLElement): Promise<void> {
        try {
            // Clear any existing content
            boardContainer.empty();

            // Initialize kanban board
            this.kanbanBoard = new KanbanBoard(
                boardContainer,
                this.plugin.datacoreSync,
                this.plugin.tagManager,
                this.plugin.settings
            );

            await this.kanbanBoard.render();

            // Set up auto-refresh
            this.setupAutoRefresh();

            // Update status
            this.updateStatus('Ready');

        } catch (error) {
            console.error('Failed to initialize kanban board:', error);
            this.showErrorState(boardContainer, 'Failed to load tasks from Datacore');
        }
    }

    private setupEventListeners(): void {
        // Listen for datacore refresh events
        const refreshHandler = () => {
            this.refreshBoard();
        };

        this.registerEvent(
            this.app.workspace.on('datacore-kanban:refresh', refreshHandler)
        );

        // Listen for settings changes
        const settingsHandler = () => {
            this.refreshBoard();
            this.setupAutoRefresh(); // Update refresh interval
        };

        this.eventRefs.push({
            unsubscribe: () => {
                this.app.workspace.off('datacore-kanban:settings-changed', settingsHandler);
            }
        });
    }

    private setupAutoRefresh(): void {
        // Clear existing interval
        if (this.refreshInterval) {
            window.clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }

        // Set up new interval if enabled
        if (this.plugin.settings.refreshInterval > 0) {
            this.refreshInterval = window.setInterval(() => {
                this.refreshBoard();
            }, this.plugin.settings.refreshInterval);
        }
    }

    private async refreshBoard(): Promise<void> {
        if (!this.kanbanBoard) return;

        try {
            await this.kanbanBoard.refresh();
            this.updateStatus('Ready');
        } catch (error) {
            console.error('Failed to refresh board:', error);
            this.updateStatus('Error');
        }
    }

    private updateStatus(status: string): void {
        const statusEl = this.containerEl.querySelector('.kanban-status');
        if (statusEl) {
            statusEl.textContent = status;
            statusEl.className = `kanban-status kanban-status-${status.toLowerCase()}`;
        }
    }

    private showLoadingState(container: HTMLElement): void {
        container.empty();
        const loading = container.createEl('div', { cls: 'kanban-loading' });
        loading.innerHTML = `
            <div class="kanban-loading-spinner"></div>
            <div>Loading Datacore...</div>
        `;
    }

    private showErrorState(container: HTMLElement, message: string): void {
        container.empty();
        const error = container.createEl('div', { cls: 'kanban-error' });
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
            // Cleanup auto-refresh
            if (this.refreshInterval) {
                window.clearInterval(this.refreshInterval);
                this.refreshInterval = null;
            }

            // Cleanup event listeners
            this.eventRefs.forEach(ref => ref.unsubscribe());
            this.eventRefs = [];

            // Cleanup kanban board
            this.kanbanBoard?.destroy();
            this.kanbanBoard = null;

        } catch (error) {
            console.error('Error during view close:', error);
        }
    }

    // Public method to force refresh
    async forceRefresh(): Promise<void> {
        await this.refreshBoard();
    }

    // Public method to get board state
    getBoardState(): any {
        return {
            isReady: this.plugin.isDatacoreReady,
            hasBoard: this.kanbanBoard !== null,
            taskCount: this.kanbanBoard?.getTaskCount() ?? 0
        };
    }
}