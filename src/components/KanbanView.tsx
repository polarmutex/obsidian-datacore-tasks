/**
 * KanbanView - Updated to use the new TSX component
 * Bridges the original Obsidian ItemView with the new React component
 */

import { ItemView, WorkspaceLeaf, App } from 'obsidian';
import { Root, createRoot } from 'react-dom/client';
import React from 'react';
import KanbanBoard from './KanbanBoard';
import DatacoreKanbanPlugin from '../main';
import type { KanbanSettings } from '../Settings';

export const VIEW_TYPE_KANBAN = 'kanban-board-view';

export class KanbanView extends ItemView {
    plugin: DatacoreKanbanPlugin;
    settings: KanbanSettings;
    private root: Root | null = null;
    private refreshInterval: number | null = null;

    constructor(leaf: WorkspaceLeaf, plugin: DatacoreKanbanPlugin) {
        super(leaf);
        this.plugin = plugin;
        this.settings = plugin.settings;
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
        // Clear any existing content
        this.containerEl.empty();
        
        // Create React root
        const container = this.containerEl.createDiv();
        container.addClass('kanban-view-container');
        
        this.root = createRoot(container);
        
        // Initial render
        await this.renderComponent();
        
        // Set up auto-refresh if needed
        this.setupAutoRefresh();
        
        // Listen for settings changes
        this.registerEvent(
            this.app.workspace.on('kanban-settings-changed', () => {
                this.settings = this.plugin.settings;
                this.renderComponent();
            })
        );

        // Listen for Datacore updates
        this.registerEvent(
            this.app.workspace.on('datacore-index-ready', () => {
                this.renderComponent();
            })
        );
    }

    async onClose(): Promise<void> {
        // Clean up auto-refresh
        if (this.refreshInterval) {
            window.clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
        
        // Unmount React component
        if (this.root) {
            this.root.unmount();
            this.root = null;
        }
    }

    private async renderComponent(): Promise<void> {
        if (!this.root) return;

        try {
            // Handle task movement
            const handleTaskMove = async (taskId: string, newTag: string): Promise<void> => {
                try {
                    // Find the task through DatacoreSync
                    const tasks = await this.plugin.datacoreSync.getTasks();
                    const task = tasks.find(t => t.id === taskId);
                    
                    if (task) {
                        await this.plugin.tagManager.updateTaskStatus(task, newTag);
                        
                        // Trigger a refresh after a short delay to allow file changes to propagate
                        setTimeout(() => {
                            this.renderComponent();
                        }, 100);
                    }
                } catch (error) {
                    console.error('Failed to move task:', error);
                    // You could show a notice here
                    // new Notice(`Failed to move task: ${error.message}`);
                }
            };

            // Handle manual refresh
            const handleRefresh = (): void => {
                this.plugin.datacoreSync.refresh();
                setTimeout(() => {
                    this.renderComponent();
                }, 100);
            };

            // Render the React component
            this.root.render(
                React.createElement(KanbanBoard, {
                    settings: this.settings,
                    onTaskMove: handleTaskMove,
                    onRefresh: handleRefresh,
                    className: 'obsidian-kanban-board'
                })
            );
        } catch (error) {
            console.error('Failed to render Kanban component:', error);
            
            // Fallback error display
            this.root.render(
                React.createElement('div', {
                    className: 'kanban-error-container',
                    style: {
                        padding: '20px',
                        textAlign: 'center',
                        color: 'var(--text-error)'
                    }
                }, [
                    React.createElement('h3', { key: 'title' }, 'Failed to load Kanban board'),
                    React.createElement('p', { key: 'message' }, `Error: ${error.message}`),
                    React.createElement('button', {
                        key: 'retry',
                        onClick: () => this.renderComponent(),
                        style: {
                            padding: '8px 16px',
                            backgroundColor: 'var(--interactive-accent)',
                            color: 'var(--text-on-accent)',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }
                    }, 'Retry')
                ])
            );
        }
    }

    private setupAutoRefresh(): void {
        // Auto-refresh every 30 seconds if enabled in settings
        // You can make this configurable
        const autoRefreshInterval = 30000; // 30 seconds
        
        if (autoRefreshInterval > 0) {
            this.refreshInterval = window.setInterval(() => {
                this.renderComponent();
            }, autoRefreshInterval);
        }
    }

    // Public method to force refresh
    public async refresh(): Promise<void> {
        await this.renderComponent();
    }

    // Public method to update settings
    public updateSettings(newSettings: KanbanSettings): void {
        this.settings = newSettings;
        this.renderComponent();
    }
}