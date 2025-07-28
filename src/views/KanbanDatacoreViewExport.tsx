/**
 * Standalone Datacore View Export
 * This file can be used for direct embedding in notes
 */

// Re-export the main view for easier access
export { default as KanbanDatacoreView } from './KanbanDatacoreView';

// Create a simple wrapper for global access
export function createKanbanView() {
    // Import the view function from the main file
    const KanbanDatacoreView = require('./KanbanDatacoreView');
    return KanbanDatacoreView;
}

// Global registration for Datacore embedding
if (typeof window !== 'undefined') {
    (window as any).DatacoreKanbanViews = {
        KanbanBoard: createKanbanView,
        createView: createKanbanView
    };
}