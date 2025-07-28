/**
 * Kanban Datacore View - Optimized for direct use in Obsidian notes
 * 
 * This is the Datacore-native version that can be embedded directly
 * in markdown files using Datacore codeblocks
 */

return function KanbanBoardView() {
    // Datacore query with live updates and caching
    const tasks = dc.useQuery('@task', { cache: true });
    
    // Get current file context for scoped queries
    const currentFile = dc.useCurrentFile();
    
    // Kanban configuration (could be customizable via props)
    const kanbanSettings = dc.useMemo(() => ({
        columns: [
            {
                id: 'todo',
                name: 'To Do',
                tag: '#todo',
                color: '#ff6b6b'
            },
            {
                id: 'doing',
                name: 'In Progress', 
                tag: '#doing',
                color: '#4ecdc4'
            },
            {
                id: 'waiting',
                name: 'Waiting',
                tag: '#waiting',
                color: '#f9ca24'
            },
            {
                id: 'done',
                name: 'Done',
                tag: '#done',
                color: '#45b7d1'
            }
        ],
        cardMaxHeight: 200,
        showDueDate: true,
        showPriority: true,
        showTags: true
    }), []);

    // Memoized task filtering and grouping
    const tasksByColumn = dc.useMemo(() => {
        const grouped = {};
        
        // Initialize columns
        kanbanSettings.columns.forEach(column => {
            grouped[column.id] = [];
        });
        
        // Filter and group tasks
        tasks.forEach(task => {
            // Skip if task doesn't have the required properties
            if (!task.tags || !Array.isArray(task.tags)) return;
            
            // Find matching column
            const matchingColumn = kanbanSettings.columns.find(column => 
                task.tags.includes(column.tag)
            );
            
            if (matchingColumn) {
                grouped[matchingColumn.id].push(task);
            }
        });
        
        return grouped;
    }, [tasks, kanbanSettings]);

    // Column statistics
    const columnStats = dc.useMemo(() => {
        const stats = {};
        kanbanSettings.columns.forEach(column => {
            stats[column.id] = tasksByColumn[column.id]?.length || 0;
        });
        return stats;
    }, [tasksByColumn, kanbanSettings]);

    // Task update handler using Datacore file operations
    const handleTaskMove = React.useCallback(async (taskId, newTag) => {
        try {
            // Find the task
            const task = tasks.find(t => t.id === taskId);
            if (!task || !task.file) return;
            
            // Read current file content
            const content = await dc.readFile(task.file.path);
            if (!content) return;
            
            // Update task tags in the content
            const lines = content.split('\n');
            const taskLine = lines[task.line - 1]; // Line numbers are 1-based
            
            if (taskLine) {
                // Remove old status tags and add new one
                const statusTags = kanbanSettings.columns.map(col => col.tag);
                let updatedLine = taskLine;
                
                // Remove existing status tags
                statusTags.forEach(tag => {
                    updatedLine = updatedLine.replace(new RegExp(`\\s*${tag}`, 'g'), '');
                });
                
                // Add new tag
                updatedLine = `${updatedLine.trim()} ${newTag}`;
                
                // Update the line
                lines[task.line - 1] = updatedLine;
                
                // Write back to file
                await dc.writeFile(task.file.path, lines.join('\n'));
            }
        } catch (error) {
            console.error('Failed to update task:', error);
        }
    }, [tasks, kanbanSettings]);

    // Handle drag and drop
    const [draggedTask, setDraggedTask] = React.useState(null);

    const handleDragStart = React.useCallback((taskId) => {
        setDraggedTask(taskId);
    }, []);

    const handleDrop = React.useCallback(async (columnId) => {
        if (!draggedTask) return;
        
        const column = kanbanSettings.columns.find(col => col.id === columnId);
        if (column) {
            await handleTaskMove(draggedTask, column.tag);
        }
        
        setDraggedTask(null);
    }, [draggedTask, handleTaskMove, kanbanSettings]);

    // Task Card component
    const TaskCard = ({ task }) => (
        <div 
            className="datacore-task-card"
            draggable
            onDragStart={() => handleDragStart(task.id)}
            style={{
                padding: '8px 12px',
                margin: '6px 0',
                backgroundColor: 'var(--background-secondary)',
                border: '1px solid var(--background-modifier-border)',
                borderRadius: '6px',
                cursor: 'grab',
                transition: 'all 0.2s ease'
            }}
        >
            <div className="task-text" style={{ 
                fontWeight: '500',
                marginBottom: '4px',
                lineHeight: '1.4'
            }}>
                {task.text || task.task || 'Untitled Task'}
            </div>
            
            {kanbanSettings.showTags && task.tags && task.tags.length > 0 && (
                <div className="task-tags" style={{ 
                    display: 'flex', 
                    flexWrap: 'wrap', 
                    gap: '4px',
                    marginTop: '6px'
                }}>
                    {task.tags.map(tag => (
                        <span 
                            key={tag}
                            className="task-tag"
                            style={{
                                fontSize: '11px',
                                padding: '2px 6px',
                                backgroundColor: 'var(--tag-background)',
                                color: 'var(--tag-color)',
                                borderRadius: '10px',
                                fontFamily: 'var(--font-monospace)'
                            }}
                        >
                            {tag}
                        </span>
                    ))}
                </div>
            )}
            
            {task.file && (
                <div className="task-source" style={{
                    fontSize: '11px',
                    color: 'var(--text-muted)',
                    marginTop: '6px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <span>{task.file.name}</span>
                    {task.line && <span>Line {task.line}</span>}
                </div>
            )}
        </div>
    );

    // Column component
    const KanbanColumn = ({ column, tasks }) => (
        <div 
            className="datacore-kanban-column"
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(column.id)}
            style={{
                flex: '1',
                minWidth: '250px',
                margin: '0 8px',
                backgroundColor: 'var(--background-primary)',
                borderRadius: '8px',
                border: '1px solid var(--background-modifier-border)',
                overflow: 'hidden'
            }}
        >
            <div 
                className="column-header"
                style={{
                    padding: '12px 16px',
                    borderBottom: `3px solid ${column.color}`,
                    backgroundColor: 'var(--background-secondary)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}
            >
                <h3 style={{
                    margin: 0,
                    color: column.color,
                    fontSize: '16px',
                    fontWeight: '600'
                }}>
                    {column.name}
                </h3>
                <span style={{
                    backgroundColor: column.color,
                    color: 'white',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: '500'
                }}>
                    {tasks.length}
                </span>
            </div>
            
            <div 
                className="column-content"
                style={{
                    padding: '12px',
                    minHeight: '200px',
                    maxHeight: '600px',
                    overflowY: 'auto'
                }}
            >
                {tasks.map(task => (
                    <TaskCard key={task.id || task.file?.path + task.line} task={task} />
                ))}
                
                {tasks.length === 0 && (
                    <div style={{
                        textAlign: 'center',
                        color: 'var(--text-muted)',
                        fontStyle: 'italic',
                        marginTop: '40px'
                    }}>
                        <p>No tasks in {column.name.toLowerCase()}</p>
                        <p style={{ fontSize: '12px' }}>
                            Add {column.tag} to tasks to see them here
                        </p>
                    </div>
                )}
            </div>
        </div>
    );

    // Loading state
    if (!tasks) {
        return (
            <div style={{ 
                textAlign: 'center', 
                padding: '40px',
                color: 'var(--text-muted)'
            }}>
                <div style={{ fontSize: '24px', marginBottom: '12px' }}>⏳</div>
                <p>Loading tasks...</p>
            </div>
        );
    }

    // Main render
    return (
        <div className="datacore-kanban-board" style={{
            fontFamily: 'var(--font-text)',
            backgroundColor: 'var(--background-primary)',
            borderRadius: '8px',
            border: '1px solid var(--background-modifier-border)',
            overflow: 'hidden'
        }}>
            {/* Header */}
            <div style={{
                padding: '16px 20px',
                backgroundColor: 'var(--background-secondary)',
                borderBottom: '1px solid var(--background-modifier-border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>
                        Task Board
                    </h2>
                    <p style={{ 
                        margin: '4px 0 0 0', 
                        color: 'var(--text-muted)', 
                        fontSize: '14px' 
                    }}>
                        {tasks.length} total tasks • Live updates enabled
                    </p>
                </div>
                
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    {currentFile && (
                        <span style={{ 
                            fontSize: '12px', 
                            color: 'var(--text-muted)',
                            padding: '4px 8px',
                            backgroundColor: 'var(--background-primary)',
                            borderRadius: '4px'
                        }}>
                            📄 {currentFile.name}
                        </span>
                    )}
                </div>
            </div>
            
            {/* Kanban columns */}
            <div style={{
                display: 'flex',
                padding: '16px',
                gap: '0',
                overflowX: 'auto',
                minHeight: '400px'
            }}>
                {kanbanSettings.columns.map(column => (
                    <KanbanColumn
                        key={column.id}
                        column={column}
                        tasks={tasksByColumn[column.id] || []}
                    />
                ))}
            </div>
            
            {/* Footer stats */}
            <div style={{
                padding: '12px 20px',
                backgroundColor: 'var(--background-secondary)',
                borderTop: '1px solid var(--background-modifier-border)',
                display: 'flex',
                justifyContent: 'center',
                gap: '20px',
                fontSize: '12px',
                color: 'var(--text-muted)'
            }}>
                <span>📊 Total: {tasks.length}</span>
                {kanbanSettings.columns.map(column => (
                    <span key={column.id}>
                        <span style={{ color: column.color }}>●</span> {column.name}: {columnStats[column.id]}
                    </span>
                ))}
            </div>
        </div>
    );
}