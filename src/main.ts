import { Plugin, WorkspaceLeaf } from 'obsidian';
import type { App as ObsidianApp } from 'obsidian-typings';
import { KanbanView, VIEW_TYPE_KANBAN } from './KanbanView';
import { DatacoreSync } from './DatacoreSync';
import { TagManager } from './TagManager';
import { KanbanSettings, DEFAULT_SETTINGS } from './Settings';
import { KanbanSettingTab } from './SettingTab';

export default class DatacoreKanbanPlugin extends Plugin {
    settings: KanbanSettings;
    datacoreSync: DatacoreSync;
    tagManager: TagManager;
    
    // Type the app property properly
    declare app: ObsidianApp;

    async onload(): Promise<void> {
        console.log('Loading Datacore Kanban Plugin v1.0.0');

        try {
            // Load settings first
            await this.loadSettings();

            // Initialize core services
            this.datacoreSync = new DatacoreSync(this.app, this);
            this.tagManager = new TagManager(this.app, this.datacoreSync);

            // Register the kanban view
            this.registerView(
                VIEW_TYPE_KANBAN,
                (leaf: WorkspaceLeaf) => new KanbanView(leaf, this)
            );

            // Add ribbon icon with proper typing
            const ribbonIconEl = this.addRibbonIcon('layout-grid', 'Open Kanban Board', (evt: MouseEvent) => {
                this.activateView();
            });
            ribbonIconEl.addClass('datacore-kanban-ribbon-icon');

            // Add command with proper typing
            this.addCommand({
                id: 'open-kanban-board',
                name: 'Open Kanban Board',
                icon: 'layout-grid',
                callback: () => {
                    this.activateView();
                },
                hotkeys: [
                    {
                        modifiers: ['Mod', 'Shift'],
                        key: 'k'
                    }
                ]
            });

            // Add command to refresh board
            this.addCommand({
                id: 'refresh-kanban-board',
                name: 'Refresh Kanban Board',
                icon: 'refresh-cw',
                callback: () => {
                    this.datacoreSync.refresh();
                }
            });

            // Add settings tab
            this.addSettingTab(new KanbanSettingTab(this.app, this));

            // Initialize Datacore integration
            const initialized = await this.datacoreSync.initialize();
            if (initialized) {
                console.log('Datacore Kanban Plugin loaded successfully');
            } else {
                console.warn('Datacore Kanban Plugin loaded but Datacore integration failed');
            }

            // Register global events
            this.registerEvent(
                this.app.workspace.on('datacore-kanban:refresh', () => {
                    // This event is triggered when the board needs to refresh
                    console.debug('Kanban board refresh triggered');
                })
            );

        } catch (error) {
            console.error('Failed to load Datacore Kanban Plugin:', error);
        }
    }

    onunload(): void {
        console.log('Unloading Datacore Kanban Plugin');
        
        try {
            // Cleanup services
            this.datacoreSync?.cleanup();
            
            // Close any open kanban views
            const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_KANBAN);
            leaves.forEach(leaf => leaf.detach());
            
        } catch (error) {
            console.error('Error during plugin unload:', error);
        }
    }

    async activateView(): Promise<void> {
        const { workspace } = this.app;

        try {
            let leaf: WorkspaceLeaf | null = null;
            const leaves = workspace.getLeavesOfType(VIEW_TYPE_KANBAN);

            if (leaves.length > 0) {
                // A kanban view is already open, focus it
                leaf = leaves[0];
            } else {
                // No kanban view, create a new one in the right sidebar
                leaf = workspace.getRightLeaf(false);
                if (leaf) {
                    await leaf.setViewState({ 
                        type: VIEW_TYPE_KANBAN, 
                        active: true 
                    });
                }
            }

            // Focus the leaf
            if (leaf) {
                workspace.revealLeaf(leaf);
            }
        } catch (error) {
            console.error('Failed to activate kanban view:', error);
        }
    }

    async loadSettings(): Promise<void> {
        try {
            const data = await this.loadData();
            this.settings = Object.assign({}, DEFAULT_SETTINGS, data);
        } catch (error) {
            console.error('Failed to load settings, using defaults:', error);
            this.settings = { ...DEFAULT_SETTINGS };
        }
    }

    async saveSettings(): Promise<void> {
        try {
            await this.saveData(this.settings);
        } catch (error) {
            console.error('Failed to save settings:', error);
        }
    }

    // Helper method to check if Datacore is available
    get isDatacoreReady(): boolean {
        return this.datacoreSync?.isReady ?? false;
    }

    // Helper method to get the Datacore API
    get datacoreApi() {
        return this.datacoreSync?.api;
    }
}