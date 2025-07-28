import { Plugin, WorkspaceLeaf } from 'obsidian';
import type { App as ObsidianApp } from 'obsidian-typings';
import { KanbanView, VIEW_TYPE_KANBAN } from './KanbanView';
import { JavaScriptKanbanView, VIEW_TYPE_JS_KANBAN } from './JavaScriptKanbanView';
import { DatacoreSync } from './DatacoreSync';
import { TagManager } from './TagManager';
import { KanbanSettings, DEFAULT_SETTINGS } from './Settings';
import { KanbanSettingTab } from './SettingTab';
import { MarkdownProcessor } from './api/MarkdownProcessor';
import { TasksPluginBridge } from './integrations/TasksPluginBridge';

export default class DatacoreKanbanPlugin extends Plugin {
    settings: KanbanSettings;
    datacoreSync: DatacoreSync;
    tagManager: TagManager;
    markdownProcessor: MarkdownProcessor;
    tasksPluginBridge: TasksPluginBridge;
    
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
            
            // Initialize new datacore-native components
            this.markdownProcessor = new MarkdownProcessor(this);
            this.tasksPluginBridge = new TasksPluginBridge(this.app);
            
            // Register markdown code block processor
            this.markdownProcessor.registerCodeBlockProcessor();

            // Register both legacy and JavaScript kanban views
            this.registerView(
                VIEW_TYPE_KANBAN,
                (leaf: WorkspaceLeaf) => new KanbanView(leaf, this)
            );
            
            this.registerView(
                VIEW_TYPE_JS_KANBAN,
                (leaf: WorkspaceLeaf) => new JavaScriptKanbanView(leaf, this)
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

            // Add command for JavaScript Kanban Board
            console.log('Registering JavaScript Kanban Board command...');
            this.addCommand({
                id: 'open-js-kanban-board',
                name: 'Open JavaScript Kanban Board',
                icon: 'layout-grid',
                callback: () => {
                    console.log('JavaScript Kanban Board command executed');
                    this.activateJavaScriptView();
                },
                hotkeys: [
                    {
                        modifiers: ['Mod', 'Shift'],
                        key: 'j'
                    }
                ]
            });
            console.log('JavaScript Kanban Board command registered successfully');

            // Add command for refreshing all datacore views
            this.addCommand({
                id: 'refresh-datacore-kanban-views',
                name: 'Refresh All Datacore Kanban Views',
                icon: 'refresh-cw',
                callback: async () => {
                    await this.markdownProcessor.refreshAllViews();
                }
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
            } else {
            }

            // Register global events
            this.registerEvent(
                this.app.workspace.on('datacore-kanban:refresh', () => {
                    // This event is triggered when the board needs to refresh
                })
            );

        } catch (error) {
            console.error('Failed to load Datacore Kanban Plugin:', error);
        }
    }

    onunload(): void {
        console.log('Unloading Datacore Kanban Plugin');
        
        try {
            // Cleanup new components
            this.markdownProcessor?.destroyAllViews();
            
            // Cleanup services
            this.datacoreSync?.cleanup();
            
            // Close any open kanban views (both legacy and JavaScript)
            const legacyLeaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_KANBAN);
            const jsLeaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_JS_KANBAN);
            [...legacyLeaves, ...jsLeaves].forEach(leaf => leaf.detach());
            
        } catch (error) {
            console.error('Error during plugin unload:', error);
        }
    }

    /**
     * Activates the Kanban view based on user's placement preference.
     * By default, opens in the main window instead of the sidebar.
     * Users can change this behavior in settings.
     */
    async activateView(): Promise<void> {
        const { workspace } = this.app;

        try {
            let leaf: WorkspaceLeaf | null = null;
            const leaves = workspace.getLeavesOfType(VIEW_TYPE_KANBAN);

            if (leaves.length > 0) {
                // A kanban view is already open, focus it
                leaf = leaves[0];
            } else {
                // Create a new kanban view based on user preference
                const placement = this.settings.viewPlacement;
                
                switch (placement) {
                    case 'main':
                        // Open in main window (active leaf or new tab)
                        // Note: workspace.activeLeaf is a property in modern Obsidian (not getActiveLeaf() method)
                        leaf = workspace.activeLeaf;
                        if (leaf) {
                            await leaf.setViewState({ 
                                type: VIEW_TYPE_KANBAN, 
                                active: true 
                            });
                        } else {
                            // Fallback to new tab if no active leaf
                            leaf = workspace.getLeaf('tab');
                            if (leaf) {
                                await leaf.setViewState({ 
                                    type: VIEW_TYPE_KANBAN, 
                                    active: true 
                                });
                            }
                        }
                        break;
                        
                    case 'new-tab':
                        // Force new tab
                        leaf = workspace.getLeaf('tab');
                        if (leaf) {
                            await leaf.setViewState({ 
                                type: VIEW_TYPE_KANBAN, 
                                active: true 
                            });
                        }
                        break;
                        
                    case 'left-sidebar':
                        // Open in left sidebar
                        leaf = workspace.getLeftLeaf(false);
                        if (leaf) {
                            await leaf.setViewState({ 
                                type: VIEW_TYPE_KANBAN, 
                                active: true 
                            });
                        }
                        break;
                        
                    case 'right-sidebar':
                    default:
                        // Open in right sidebar (original behavior)
                        leaf = workspace.getRightLeaf(false);
                        if (leaf) {
                            await leaf.setViewState({ 
                                type: VIEW_TYPE_KANBAN, 
                                active: true 
                            });
                        }
                        break;
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

    /**
     * Activates the JavaScript Kanban view based on user's placement preference.
     */
    async activateJavaScriptView(): Promise<void> {
        const { workspace } = this.app;

        try {
            let leaf: WorkspaceLeaf | null = null;
            const leaves = workspace.getLeavesOfType(VIEW_TYPE_JS_KANBAN);

            if (leaves.length > 0) {
                // A JS kanban view is already open, focus it
                leaf = leaves[0];
            } else {
                // Create a new JavaScript kanban view based on user preference
                const placement = this.settings.viewPlacement;
                
                switch (placement) {
                    case 'main':
                        leaf = workspace.activeLeaf;
                        if (leaf) {
                            await leaf.setViewState({ 
                                type: VIEW_TYPE_JS_KANBAN, 
                                active: true 
                            });
                        } else {
                            leaf = workspace.getLeaf('tab');
                            if (leaf) {
                                await leaf.setViewState({ 
                                    type: VIEW_TYPE_JS_KANBAN, 
                                    active: true 
                                });
                            }
                        }
                        break;
                        
                    case 'new-tab':
                        leaf = workspace.getLeaf('tab');
                        if (leaf) {
                            await leaf.setViewState({ 
                                type: VIEW_TYPE_JS_KANBAN, 
                                active: true 
                            });
                        }
                        break;
                        
                    case 'left-sidebar':
                        leaf = workspace.getLeftLeaf(false);
                        if (leaf) {
                            await leaf.setViewState({ 
                                type: VIEW_TYPE_JS_KANBAN, 
                                active: true 
                            });
                        }
                        break;
                        
                    case 'right-sidebar':
                    default:
                        leaf = workspace.getRightLeaf(false);
                        if (leaf) {
                            await leaf.setViewState({ 
                                type: VIEW_TYPE_JS_KANBAN, 
                                active: true 
                            });
                        }
                        break;
                }
            }

            // Focus the leaf
            if (leaf) {
                workspace.revealLeaf(leaf);
            }
        } catch (error) {
            console.error('Failed to activate JavaScript kanban view:', error);
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

    // Helper method to get Tasks plugin bridge
    get tasksPlugin(): TasksPluginBridge {
        return this.tasksPluginBridge;
    }

    // Public API for other plugins
    public getAPI() {
        return {
            createKanbanView: (container: HTMLElement, config: any) => {
                // This would need datacore context - implementation depends on usage
                console.log('Public API: createKanbanView called');
                return null;
            },
            refreshAllViews: () => this.markdownProcessor.refreshAllViews(),
            getActiveViews: () => this.markdownProcessor.getActiveViews(),
            isDatacoreReady: () => this.isDatacoreReady
        };
    }
}