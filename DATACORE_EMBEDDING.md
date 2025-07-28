# 🎯 Datacore View Embedding Guide

Complete guide for accessing and embedding your plugin's Datacore views in Obsidian notes.

## 🚀 Quick Start

### Method 1: Global Plugin API (Recommended)

After installing your plugin, use this in any note:

````markdown
```datacoretsx
// Access via global plugin API
const kanbanView = window.DatacoreKanbanPlugin?.KanbanBoard;
return kanbanView ? kanbanView() : <div>Plugin not loaded</div>;
```
````

### Method 2: App Plugin Registry

````markdown
```datacoretsx
// Access through Obsidian's plugin system
const plugin = app.plugins.getPlugin('obsidian-datacore-kanban');
if (plugin?.getAPI) {
    const api = plugin.getAPI();
    const KanbanView = await api.createKanbanView();
    return KanbanView();
}
return <div>Kanban plugin not available</div>;
```
````

### Method 3: Direct Import (Requires setup)

````markdown
```datacoretsx
// If view is exported to vault
dv.view("Scripts/KanbanDatacoreView")
```
````

## 🛠️ Setup Instructions

### Step 1: Update Your Plugin's Main File

Add this to your plugin's `onload()` method:

```typescript
// In your main plugin file
import { DatacoreViewAPI } from './src/DatacoreViewAPI';

export default class DatacoreKanbanPlugin extends Plugin {
    private datacoreViewAPI: DatacoreViewAPI;

    async onload() {
        // ... existing setup code ...
        
        // 🎯 Initialize Datacore view API
        this.datacoreViewAPI = new DatacoreViewAPI(this);
        this.datacoreViewAPI.initializeGlobalAPI();
        
        // ... rest of your code ...
    }

    onunload() {
        // Clean up global API
        this.datacoreViewAPI?.cleanup();
        
        // ... existing cleanup code ...
    }

    // Expose API for other plugins
    getAPI() {
        return {
            createKanbanView: () => this.datacoreViewAPI.getKanbanView(),
            renderView: (type, config) => this.datacoreViewAPI.renderView(type, config),
            isReady: () => this.isDatacoreReady
        };
    }
}
```

### Step 2: Update Build Configuration

Ensure your `esbuild.config.mjs` includes the new files:

```javascript
// esbuild.config.mjs
import esbuild from 'esbuild';

const prod = process.argv[2] === 'production';

esbuild.build({
    entryPoints: ['src/main.ts'],
    bundle: true,
    external: ['obsidian', '@blacksmithgu/datacore'],
    format: 'cjs',
    target: 'es2018',
    logLevel: 'info',
    sourcemap: prod ? false : 'inline',
    treeShaking: true,
    outfile: 'main.js',
}).catch(() => process.exit(1));
```

## 📝 Usage Examples

### Basic Kanban Board

````markdown
# My Tasks

```datacoretsx
return window.DatacoreKanbanPlugin?.KanbanBoard?.() || 
    <div>Install Datacore Kanban plugin</div>;
```
````

### Configured Kanban Board

````markdown
```datacoretsx
// Custom configuration
const plugin = window.DatacoreKanbanPlugin;
if (!plugin) return <div>Plugin not loaded</div>;

const KanbanView = plugin.KanbanBoard();
if (!KanbanView) return <div>View not available</div>;

// Override default settings
return KanbanView({
    query: '@task and #work',
    columns: [
        { id: 'todo', name: 'To Do', tag: '#todo', color: '#ff6b6b' },
        { id: 'doing', name: 'Working', tag: '#doing', color: '#4ecdc4' },
        { id: 'done', name: 'Done', tag: '#done', color: '#45b7d1' }
    ]
});
```
````

### Error Handling

````markdown
```datacoretsx
try {
    const plugin = window.DatacoreKanbanPlugin;
    
    if (!plugin) {
        return (
            <div style={{ 
                padding: '20px', 
                textAlign: 'center',
                color: 'var(--text-muted)',
                border: '1px dashed var(--background-modifier-border)'
            }}>
                📋 Install <strong>Datacore Kanban Plugin</strong> to view board
            </div>
        );
    }
    
    if (!plugin.isReady()) {
        return (
            <div style={{ padding: '20px', textAlign: 'center' }}>
                ⏳ Loading Datacore...
            </div>
        );
    }
    
    const KanbanView = plugin.KanbanBoard();
    return KanbanView ? KanbanView() : <div>View not available</div>;
    
} catch (error) {
    return (
        <div style={{ 
            padding: '20px', 
            color: 'var(--text-error)',
            border: '1px solid var(--color-red)'
        }}>
            ❌ Error: {error.message}
        </div>
    );
}
```
````

## 🔧 Advanced Usage

### Multiple Boards in One Note

````markdown
# Personal Tasks
```datacoretsx
const PersonalBoard = window.DatacoreKanbanPlugin?.KanbanBoard?.();
return PersonalBoard ? PersonalBoard({
    query: '@task and #personal'
}) : <div>Loading...</div>;
```

# Work Tasks  
```datacoretsx
const WorkBoard = window.DatacoreKanbanPlugin?.KanbanBoard?.();
return WorkBoard ? WorkBoard({
    query: '@task and #work',
    columns: [
        { id: 'backlog', name: 'Backlog', tag: '#backlog', color: '#6c757d' },
        { id: 'sprint', name: 'Sprint', tag: '#sprint', color: '#007bff' },
        { id: 'review', name: 'Review', tag: '#review', color: '#ffc107' },
        { id: 'done', name: 'Done', tag: '#done', color: '#28a745' }
    ]
}) : <div>Loading...</div>;
```
````

### Plugin Command Integration

Add this command to your plugin for easy insertion:

```typescript
// Add to your plugin's onload()
this.addCommand({
    id: 'insert-datacore-kanban',
    name: 'Insert Datacore Kanban View',
    editorCallback: (editor) => {
        const cursor = editor.getCursor();
        const codeblock = `\`\`\`datacoretsx
return window.DatacoreKanbanPlugin?.KanbanBoard?.() || 
    <div>Install Datacore Kanban plugin</div>;
\`\`\``;
        editor.replaceRange(codeblock, cursor);
    }
});
```

## 🐛 Troubleshooting

### Common Issues

1. **"Plugin not loaded" error**
   - Ensure the Datacore Kanban plugin is installed and enabled
   - Check that Datacore plugin is also installed

2. **"View not available" error**
   - Plugin may still be loading - wait a moment and refresh
   - Check browser console for errors

3. **Empty board**
   - Verify your vault has tasks with the expected tags
   - Check the query syntax in your configuration

### Debug Information

````markdown
```datacoretsx
// Debug view to check plugin status
const plugin = window.DatacoreKanbanPlugin;
const isReady = plugin?.isReady?.();

return (
    <div style={{ 
        padding: '20px',
        backgroundColor: 'var(--background-secondary)',
        borderRadius: '8px',
        fontFamily: 'var(--font-monospace)'
    }}>
        <h3>Debug Information</h3>
        <ul>
            <li>Plugin Available: {plugin ? '✅' : '❌'}</li>
            <li>Datacore Ready: {isReady ? '✅' : '❌'}</li>
            <li>KanbanBoard Function: {plugin?.KanbanBoard ? '✅' : '❌'}</li>
            <li>Settings: {plugin?.getSettings ? '✅' : '❌'}</li>
        </ul>
    </div>
);
```
````

## 🎨 Customization

### Custom Styling

````markdown
```datacoretsx
const KanbanView = window.DatacoreKanbanPlugin?.KanbanBoard?.();
if (!KanbanView) return <div>Loading...</div>;

// Wrap with custom styling
return (
    <div style={{
        border: '2px solid var(--interactive-accent)',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
    }}>
        {KanbanView()}
    </div>
);
```
````

### Theme Integration

Your views automatically use Obsidian's CSS variables:
- `var(--background-primary)` - Main background
- `var(--background-secondary)` - Card backgrounds
- `var(--text-normal)` - Primary text
- `var(--text-muted)` - Secondary text
- `var(--interactive-accent)` - Accent color

## 📋 Summary

<function_calls>
<invoke name="TodoWrite">
<parameter name="todos">[{"id": "1", "content": "Design plugin API for exposing Datacore views", "status": "completed", "priority": "high"}, {"id": "2", "content": "Create view registration system in main plugin", "status": "completed", "priority": "high"}, {"id": "3", "content": "Add global access method for Datacore views", "status": "completed", "priority": "medium"}, {"id": "4", "content": "Document usage patterns for embedded views", "status": "completed", "priority": "low"}]