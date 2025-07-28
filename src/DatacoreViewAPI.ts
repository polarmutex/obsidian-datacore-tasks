/**
 * Datacore View API - Exposes plugin views for embedding in notes
 */

export class DatacoreViewAPI {
    private plugin: any;
    
    constructor(plugin: any) {
        this.plugin = plugin;
    }

    /**
     * Initialize global access to Datacore views
     */
    initializeGlobalAPI() {
        // Make views available globally for Datacore embedding
        (window as any).DatacoreKanbanPlugin = {
            // Main kanban view
            KanbanBoard: this.getKanbanView.bind(this),
            
            // Utility methods
            isReady: () => this.plugin.isDatacoreReady,
            getSettings: () => this.plugin.settings,
            
            // Direct view access
            renderView: this.renderView.bind(this)
        };
    }

    /**
     * Get the Kanban view function for embedding
     */
    async getKanbanView() {
        try {
            // Import the view dynamically
            const viewModule = await import('./views/KanbanDatacoreView');
            return viewModule.default || viewModule;
        } catch (error) {
            console.error('Failed to load KanbanDatacoreView:', error);
            return this.createErrorView('Failed to load Kanban view');
        }
    }

    /**
     * Render a view with optional configuration
     */
    async renderView(viewType = 'kanban', config = {}) {
        switch (viewType) {
            case 'kanban':
                return await this.getKanbanView();
            default:
                return this.createErrorView(`Unknown view type: ${viewType}`);
        }
    }

    /**
     * Create an error view component
     */
    private createErrorView(message: string) {
        return function ErrorView() {
            return {
                type: 'div',
                props: {
                    style: {
                        padding: '20px',
                        textAlign: 'center',
                        color: 'var(--text-error)',
                        border: '1px solid var(--background-modifier-border)',
                        borderRadius: '8px',
                        backgroundColor: 'var(--background-secondary)'
                    }
                },
                children: [
                    {
                        type: 'h3',
                        props: {},
                        children: ['⚠️ Datacore Kanban Error']
                    },
                    {
                        type: 'p',
                        props: {},
                        children: [message]
                    },
                    {
                        type: 'p',
                        props: { style: { fontSize: '12px', color: 'var(--text-muted)' } },
                        children: ['Make sure the Datacore Kanban plugin is installed and enabled.']
                    }
                ]
            };
        };
    }

    /**
     * Clean up global API on plugin unload
     */
    cleanup() {
        if ((window as any).DatacoreKanbanPlugin) {
            delete (window as any).DatacoreKanbanPlugin;
        }
    }
}