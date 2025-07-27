import { TaskCard } from './TaskCard.jsx';

/**
 * Kanban Column Component
 * Represents a single column in the kanban board with drag-and-drop support
 */
export function KanbanColumn(props) {
    const { 
        column, 
        tasks, 
        onDragStart, 
        onDrop, 
        onDragEnd, 
        draggedTask, 
        settings,
        selectedTasks,
        onTaskSelect,
        dc 
    } = props;
    
    const [isDragOver, setIsDragOver] = dc.useState(false);
    const [dropIndex, setDropIndex] = dc.useState(-1);
    
    // Handle drag over
    const handleDragOver = dc.useCallback((e) => {
        e.preventDefault();
        
        if (!draggedTask) return;
        
        setIsDragOver(true);
        
        // Calculate drop index based on mouse position
        const columnEl = e.currentTarget;
        const cards = Array.from(columnEl.querySelectorAll('.task-card'));
        
        let insertIndex = cards.length;
        
        for (let i = 0; i < cards.length; i++) {
            const card = cards[i];
            const rect = card.getBoundingClientRect();
            const cardCenter = rect.top + rect.height / 2;
            
            if (e.clientY < cardCenter) {
                insertIndex = i;
                break;
            }
        }
        
        setDropIndex(insertIndex);
    }, [draggedTask]);
    
    // Handle drag leave
    const handleDragLeave = dc.useCallback((e) => {
        // Only set isDragOver to false if we're leaving the column entirely
        if (!e.currentTarget.contains(e.relatedTarget)) {
            setIsDragOver(false);
            setDropIndex(-1);
        }
    }, []);
    
    // Handle drop
    const handleDropEvent = dc.useCallback((e) => {
        e.preventDefault();
        setIsDragOver(false);
        setDropIndex(-1);
        
        if (draggedTask && onDrop) {
            onDrop(column, dropIndex);
        }
    }, [column, dropIndex, draggedTask, onDrop]);
    
    // Handle task drag start
    const handleTaskDragStart = dc.useCallback((task) => {
        if (onDragStart) {
            onDragStart(task, column);
        }
    }, [column, onDragStart]);
    
    // Render drop indicator
    const renderDropIndicator = (index) => {
        if (!isDragOver || dropIndex !== index) return null;
        
        return dc.jsx('div', {
            key: `drop-indicator-${index}`,
            className: 'kanban-drop-indicator',
            style: {
                height: '2px',
                backgroundColor: column.color,
                margin: '4px 0',
                borderRadius: '1px'
            }
        });
    };
    
    return dc.jsx('div', {
        className: `kanban-column ${isDragOver ? 'drag-over' : ''}`,
        onDragOver: handleDragOver,
        onDragLeave: handleDragLeave,
        onDrop: handleDropEvent,
        style: {
            '--column-color': column.color
        },
        children: [
            // Column header
            dc.jsx('div', {
                className: 'kanban-column-header',
                style: {
                    backgroundColor: column.color,
                    color: '#ffffff'
                },
                children: [
                    dc.jsx('h3', {
                        className: 'kanban-column-title',
                        children: column.name
                    }),
                    dc.jsx('span', {
                        className: 'kanban-column-count',
                        children: tasks.length
                    })
                ]
            }),
            
            // Column content
            dc.jsx('div', {
                className: 'kanban-column-content',
                children: [
                    // Drop indicator at top
                    renderDropIndicator(0),
                    
                    // Task cards
                    ...tasks.map((task, index) => [
                        dc.jsx(TaskCard, {
                            key: task.id,
                            task: task,
                            onDragStart: handleTaskDragStart,
                            onDragEnd: onDragEnd,
                            settings: settings,
                            selectedTasks: selectedTasks,
                            onTaskSelect: onTaskSelect,
                            dc: dc,
                            isDragging: draggedTask?.task?.id === task.id
                        }),
                        
                        // Drop indicator after each card
                        renderDropIndicator(index + 1)
                    ]).flat(),
                    
                    // Empty state
                    tasks.length === 0 && dc.jsx('div', {
                        className: 'kanban-column-empty',
                        children: [
                            dc.jsx('div', {
                                className: 'kanban-empty-icon',
                                children: '📋'
                            }),
                            dc.jsx('div', {
                                className: 'kanban-empty-text',
                                children: 'No tasks'
                            })
                        ]
                    })
                ]
            })
        ]
    });
}

KanbanColumn.displayName = 'KanbanColumn';