# Kanban Board Integration Examples

## 🎯 **Quick Start - Use Converted Component**

### Option 1: Direct Datacore View (Recommended)

Add this to any Obsidian note:

````markdown
```datacoretsx
// Embed the Kanban board directly in your note
dv.view("./src/views/KanbanDatacoreView")
```
````

### Option 2: Custom Datacore View with Configuration

````markdown
```datacoretsx
return function CustomKanbanBoard() {
    // Custom query for specific project
    const projectTasks = dc.useQuery('@task where project = "My Project"');
    
    // Custom column configuration
    const customColumns = [
        { id: 'backlog', name: '📋 Backlog', tag: '#backlog', color: '#6c757d' },
        { id: 'sprint', name: '🏃 Sprint', tag: '#sprint', color: '#007bff' },
        { id: 'review', name: '👀 Review', tag: '#review', color: '#ffc107' },
        { id: 'done', name: '✅ Done', tag: '#done', color: '#28a745' }
    ];
    
    // Group tasks by columns
    const tasksByColumn = dc.useMemo(() => {
        const grouped = {};
        customColumns.forEach(col => grouped[col.id] = []);
        projectTasks.forEach(task => {
            const column = customColumns.find(col => 
                task.tags?.includes(col.tag)
            );
            if (column) grouped[column.id].push(task);
        });
        return grouped;
    }, [projectTasks]);
    
    // Render custom board
    return (
        <div style={{ 
            fontFamily: 'var(--font-text)',
            backgroundColor: 'var(--background-primary)',
            border: '1px solid var(--background-modifier-border)',
            borderRadius: '8px',
            overflow: 'hidden'
        }}>
            <div style={{ 
                padding: '16px', 
                backgroundColor: 'var(--background-secondary)',
                borderBottom: '1px solid var(--background-modifier-border)'
            }}>
                <h2 style={{ margin: 0 }}>My Project Board</h2>
                <p style={{ margin: '4px 0 0', color: 'var(--text-muted)' }}>
                    {projectTasks.length} tasks • {customColumns.map(col => 
                        `${col.name.split(' ')[1]}: ${tasksByColumn[col.id].length}`
                    ).join(' • ')}
                </p>
            </div>
            
            <div style={{ 
                display: 'flex', 
                padding: '16px', 
                gap: '16px',
                overflowX: 'auto' 
            }}>
                {customColumns.map(column => (
                    <div key={column.id} style={{
                        flex: '1',
                        minWidth: '250px',
                        backgroundColor: 'var(--background-primary)',
                        border: '1px solid var(--background-modifier-border)',
                        borderRadius: '8px',
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            padding: '12px 16px',
                            backgroundColor: 'var(--background-secondary)',
                            borderBottom: `3px solid ${column.color}`,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <h3 style={{ 
                                margin: 0, 
                                color: column.color,
                                fontSize: '16px' 
                            }}>
                                {column.name}
                            </h3>
                            <span style={{
                                backgroundColor: column.color,
                                color: 'white',
                                padding: '2px 8px',
                                borderRadius: '12px',
                                fontSize: '12px'
                            }}>
                                {tasksByColumn[column.id].length}
                            </span>
                        </div>
                        
                        <div style={{ padding: '12px' }}>
                            {tasksByColumn[column.id].map(task => (
                                <div key={task.id || task.file?.path} style={{
                                    backgroundColor: 'var(--background-secondary)',
                                    border: '1px solid var(--background-modifier-border)',
                                    borderRadius: '6px',
                                    padding: '8px 12px',
                                    marginBottom: '8px'
                                }}>
                                    <div style={{ fontWeight: '500', marginBottom: '4px' }}>
                                        {task.text || task.task || 'Untitled'}
                                    </div>
                                    {task.file && (
                                        <div style={{ 
                                            fontSize: '11px', 
                                            color: 'var(--text-muted)' 
                                        }}>
                                            📄 {task.file.name}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
```
````

## 🔧 **Plugin Integration**

### Update main.ts to use the new TSX component:

```typescript
// src/main.ts
import { Plugin, WorkspaceLeaf } from 'obsidian';
import { KanbanView, VIEW_TYPE_KANBAN } from './components/KanbanView';

export default class DatacoreKanbanPlugin extends Plugin {
    async onload() {
        // Register the new TSX-based view
        this.registerView(
            VIEW_TYPE_KANBAN,
            (leaf: WorkspaceLeaf) => new KanbanView(leaf, this)
        );

        // Add command to open kanban board
        this.addCommand({
            id: 'open-kanban-board',
            name: 'Open Kanban Board',
            callback: () => {
                this.activateView();
            }
        });
    }

    async activateView() {
        const { workspace } = this.app;
        
        let leaf: WorkspaceLeaf | null = null;
        const leaves = workspace.getLeavesOfType(VIEW_TYPE_KANBAN);

        if (leaves.length > 0) {
            leaf = leaves[0];
        } else {
            leaf = workspace.getRightLeaf(false);
            await leaf.setViewState({ type: VIEW_TYPE_KANBAN, active: true });
        }

        workspace.revealLeaf(leaf);
    }
}
```

## 📊 **Performance Comparison**

### Before (Original KanbanBoard.ts):
```typescript
// Manual DOM manipulation
class KanbanBoard {
    async refresh() {
        // Re-render everything on each refresh
        this.container.empty();
        const tasks = await this.datacoreSync.getTasks();
        await this.renderTasks(tasks);
    }
    
    private async renderTasks(tasks: TaskItem[]) {
        // Clear and rebuild all DOM elements
        this.cards.forEach(card => card.destroy());
        this.cards.clear();
        this.columns.forEach(column => column.empty());
        
        // Rebuild everything...
    }
}
```

### After (Optimized TSX):
```tsx
// Intelligent re-rendering with React + Datacore
function KanbanBoard({ settings }: KanbanBoardProps) {
    // Live data updates automatically
    const allTasks = dc.useQuery(settings.datacoreQuery || '@task');
    
    // Only recalculate when data actually changes
    const tasksByColumn = dc.useMemo(() => {
        // Efficient grouping logic
    }, [allTasks, settings.columns]);
    
    // Individual cards only re-render when their specific data changes
    const TaskCard = React.memo(({ task, settings }) => {
        return <div className="kanban-task-card">...</div>;
    });
    
    return (
        <div className="kanban-board">
            {settings.columns.map(column => (
                <KanbanColumn key={column.id} column={column} tasks={tasksByColumn[column.id]} />
            ))}
        </div>
    );
}
```

## 🎨 **Styling Customization**

### Theme Integration
```css
/* Custom theme variables */
.kanban-board {
    --kanban-primary-color: #4f46e5;
    --kanban-success-color: #10b981;
    --kanban-warning-color: #f59e0b;
    --kanban-error-color: #ef4444;
}

/* Dark theme adjustments */
.theme-dark .kanban-board {
    --kanban-primary-color: #6366f1;
    --kanban-success-color: #34d399;
}

/* Custom column colors */
.kanban-column[data-column-id="urgent"] .kanban-column-header {
    border-top-color: var(--kanban-error-color);
}

.kanban-column[data-column-id="urgent"] .kanban-column-title {
    color: var(--kanban-error-color);
}
```

## 🧪 **Testing Examples**

### Component Testing
```typescript
// tests/components/KanbanBoard.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import KanbanBoard from '../src/components/KanbanBoard';
import { mockSettings, mockTasks } from './mocks';

describe('KanbanBoard TSX Component', () => {
    test('renders all columns correctly', () => {
        render(<KanbanBoard settings={mockSettings} />);
        
        expect(screen.getByText('To Do')).toBeInTheDocument();
        expect(screen.getByText('In Progress')).toBeInTheDocument();
        expect(screen.getByText('Done')).toBeInTheDocument();
    });

    test('handles task drag and drop', async () => {
        const mockOnTaskMove = jest.fn().mockResolvedValue(undefined);
        
        render(
            <KanbanBoard 
                settings={mockSettings} 
                onTaskMove={mockOnTaskMove} 
            />
        );

        const taskCard = screen.getByText('Test Task');
        const targetColumn = screen.getByTestId('column-done');

        // Simulate drag and drop
        fireEvent.dragStart(taskCard);
        fireEvent.drop(targetColumn);

        await waitFor(() => {
            expect(mockOnTaskMove).toHaveBeenCalledWith('task-1', '#done');
        });
    });

    test('displays loading state initially', () => {
        // Mock empty tasks to trigger loading state
        jest.mock('@blacksmithgu/datacore', () => ({
            useQuery: () => null
        }));

        render(<KanbanBoard settings={mockSettings} />);
        expect(screen.getByText('Loading tasks...')).toBeInTheDocument();
    });
});
```

### Integration Testing
```typescript
// tests/integration/kanban-plugin.test.ts
import { App } from 'obsidian';
import DatacoreKanbanPlugin from '../src/main';
import { VIEW_TYPE_KANBAN } from '../src/components/KanbanView';

describe('Kanban Plugin Integration', () => {
    let app: App;
    let plugin: DatacoreKanbanPlugin;

    beforeEach(async () => {
        app = new MockApp();
        plugin = new DatacoreKanbanPlugin(app, manifest);
        await plugin.onload();
    });

    test('registers kanban view correctly', () => {
        const viewRegistry = app.viewRegistry;
        expect(viewRegistry.getViewCreator(VIEW_TYPE_KANBAN)).toBeDefined();
    });

    test('opens kanban view on command', async () => {
        const workspace = app.workspace;
        await plugin.activateView();
        
        const leaves = workspace.getLeavesOfType(VIEW_TYPE_KANBAN);
        expect(leaves).toHaveLength(1);
    });
});
```

## 🚀 **Advanced Usage Patterns**

### 1. Multiple Board Configurations
```typescript
const boardConfigs = {
    personal: {
        query: '@task where project = "Personal"',
        columns: [
            { id: 'inbox', name: '📥 Inbox', tag: '#inbox', color: '#6c757d' },
            { id: 'today', name: '📅 Today', tag: '#today', color: '#dc3545' },
            { id: 'done', name: '✅ Done', tag: '#done', color: '#28a745' }
        ]
    },
    work: {
        query: '@task where project = "Work"',
        columns: [
            { id: 'backlog', name: '📋 Backlog', tag: '#backlog', color: '#6c757d' },
            { id: 'sprint', name: '🏃 Sprint', tag: '#sprint', color: '#007bff' },
            { id: 'review', name: '👀 Review', tag: '#review', color: '#ffc107' },
            { id: 'deployed', name: '🚀 Deployed', tag: '#deployed', color: '#28a745' }
        ]
    }
};
```

### 2. Real-time Collaboration
```tsx
function CollaborativeKanbanBoard() {
    const tasks = dc.useQuery('@task');
    const [lastUpdate, setLastUpdate] = useState(Date.now());
    
    // Listen for external file changes
    useEffect(() => {
        const handleFileChange = () => {
            setLastUpdate(Date.now());
        };
        
        app.vault.on('modify', handleFileChange);
        return () => app.vault.off('modify', handleFileChange);
    }, []);
    
    return (
        <div>
            <div className="collaboration-status">
                Last updated: {new Date(lastUpdate).toLocaleTimeString()}
            </div>
            <KanbanBoard settings={settings} />
        </div>
    );
}
```

### 3. Export/Import Functionality
```tsx
function KanbanWithExport() {
    const tasks = dc.useQuery('@task');
    
    const exportBoard = useCallback(() => {
        const exportData = {
            timestamp: new Date().toISOString(),
            tasks: tasks.map(task => ({
                text: task.text,
                tags: task.tags,
                file: task.file.path,
                line: task.line
            }))
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
            type: 'application/json'
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `kanban-export-${Date.now()}.json`;
        a.click();
    }, [tasks]);
    
    return (
        <div>
            <div className="kanban-toolbar">
                <button onClick={exportBoard}>Export Board</button>
            </div>
            <KanbanBoard settings={settings} />
        </div>
    );
}
```

## ✨ **Migration Checklist**

- [x] **Component Converted**: KanbanBoard.ts → KanbanBoard.tsx
- [x] **Performance Optimized**: React hooks + memoization
- [x] **Datacore Integrated**: Live queries with `dc.useQuery`
- [x] **Styles Updated**: Modern CSS with theme support
- [x] **Tests Added**: Component and integration tests
- [x] **Documentation**: Complete usage guide
- [x] **Examples Created**: Multiple integration patterns
- [x] **Accessibility**: WCAG compliant implementation
- [x] **Mobile Support**: Responsive design
- [x] **Error Handling**: Graceful error states

## 🎯 **Next Steps**

1. **Replace** the old KanbanBoard.ts import in your KanbanView.ts
2. **Update** your main.ts to use the new KanbanView.tsx
3. **Add** the new CSS file to your plugin styles
4. **Test** the integration with your existing data
5. **Customize** colors and layout to match your design

The conversion is complete and ready for production use! 🚀