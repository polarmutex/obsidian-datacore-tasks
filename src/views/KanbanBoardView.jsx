import { KanbanColumn } from './components/KanbanColumn.jsx';
import { taskUtils } from './utils/taskUtils.js';
import { dragDropUtils } from './utils/dragDropUtils.js';

/**
 * Main Kanban Board View using Datacore JavaScript views
 * This replaces the legacy TypeScript KanbanBoard implementation
 */
export function KanbanBoardView(props) {
    const { dc, settings } = props;
    
    // Use Datacore's state management
    const [tasks, setTasks] = dc.useState([]);
    const [isLoading, setIsLoading] = dc.useState(true);
    const [error, setError] = dc.useState(null);
    const [draggedTask, setDraggedTask] = dc.useState(null);
    const [searchTerm, setSearchTerm] = dc.useState('');
    const [selectedFilter, setSelectedFilter] = dc.useState('all');
    const [showSettings, setShowSettings] = dc.useState(false);
    const [selectedTasks, setSelectedTasks] = dc.useState(new Set());
    
    // Query tasks using Datacore's query hook
    const taskQuery = dc.useQuery(settings.datacoreQuery || '@task');
    
    // Process tasks when query results change
    dc.useEffect(() => {
        if (taskQuery.successful) {
            const processedTasks = taskUtils.processQueryResults(taskQuery.value);
            setTasks(processedTasks);
            setIsLoading(false);
            setError(null);
        } else if (taskQuery.error) {
            setError(taskQuery.error);
            setIsLoading(false);
        }
    }, [taskQuery]);
    
    // Filter tasks based on search and filter criteria
    const filteredTasks = dc.useMemo(() => {
        let filtered = tasks;
        
        // Apply search filter
        if (searchTerm.trim()) {
            const searchLower = searchTerm.toLowerCase();
            filtered = filtered.filter(task => 
                task.text.toLowerCase().includes(searchLower) ||
                task.file.basename.toLowerCase().includes(searchLower) ||
                task.tags.some(tag => tag.toLowerCase().includes(searchLower))
            );
        }
        
        // Apply status filter
        switch (selectedFilter) {
            case 'completed':
                filtered = filtered.filter(task => task.completed);
                break;
            case 'pending':
                filtered = filtered.filter(task => !task.completed);
                break;
            case 'overdue':
                filtered = filtered.filter(task => {
                    if (!task.dueDate) return false;
                    const dueDate = new Date(task.dueDate);
                    const now = new Date();
                    return dueDate < now && !task.completed;
                });
                break;
            case 'today':
                filtered = filtered.filter(task => {
                    if (!task.dueDate) return false;
                    const dueDate = new Date(task.dueDate);
                    const today = new Date();
                    return dueDate.toDateString() === today.toDateString();
                });
                break;
            default:
                // 'all' - no additional filtering
                break;
        }
        
        return filtered;
    }, [tasks, searchTerm, selectedFilter]);

    // Group filtered tasks by column based on tags
    const tasksByColumn = dc.useMemo(() => {
        return taskUtils.groupTasksByColumn(filteredTasks, settings.columns);
    }, [filteredTasks, settings.columns]);
    
    // Handle task drag start
    const handleDragStart = dc.useCallback((task, sourceColumn) => {
        setDraggedTask({ task, sourceColumn });
    }, []);
    
    // Handle task drop
    const handleDrop = dc.useCallback(async (targetColumn, dropIndex) => {
        if (!draggedTask) return;
        
        try {
            const { task, sourceColumn } = draggedTask;
            
            // Update task tags in the file
            await taskUtils.updateTaskTags(
                task,
                sourceColumn.tag,
                targetColumn.tag,
                dc.api
            );
            
            // Update local state
            const updatedTasks = taskUtils.moveTaskBetweenColumns(
                tasks,
                task,
                sourceColumn,
                targetColumn,
                dropIndex
            );
            setTasks(updatedTasks);
            
        } catch (error) {
            console.error('Failed to move task:', error);
            setError('Failed to move task');
        } finally {
            setDraggedTask(null);
        }
    }, [draggedTask, tasks]);
    
    // Handle drag end (cleanup)
    const handleDragEnd = dc.useCallback(() => {
        setDraggedTask(null);
    }, []);
    
    // Handle task selection
    const handleTaskSelect = dc.useCallback((taskId, selected) => {
        setSelectedTasks(prev => {
            const newSet = new Set(prev);
            if (selected) {
                newSet.add(taskId);
            } else {
                newSet.delete(taskId);
            }
            return newSet;
        });
    }, []);
    
    // Handle bulk operations
    const handleBulkOperation = dc.useCallback(async (operation) => {
        if (selectedTasks.size === 0) return;
        
        try {
            const tasksToUpdate = tasks.filter(task => selectedTasks.has(task.id));
            
            switch (operation) {
                case 'complete':
                    for (const task of tasksToUpdate) {
                        await taskUtils.updateTaskStatus(task, 'done', dc.api);
                    }
                    break;
                case 'uncomplete':
                    for (const task of tasksToUpdate) {
                        await taskUtils.updateTaskStatus(task, 'todo', dc.api);
                    }
                    break;
                case 'delete':
                    for (const task of tasksToUpdate) {
                        await taskUtils.deleteTask(task, dc.api);
                    }
                    break;
            }
            
            // Clear selection
            setSelectedTasks(new Set());
            
        } catch (error) {
            console.error('Bulk operation failed:', error);
            setError('Bulk operation failed');
        }
    }, [selectedTasks, tasks]);
    
    // Keyboard shortcuts
    dc.useEffect(() => {
        const handleKeyDown = (e) => {
            // Only handle shortcuts when kanban board is focused
            if (!document.querySelector('.kanban-board:focus-within')) return;
            
            // Ctrl/Cmd + F - Focus search
            if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                e.preventDefault();
                const searchInput = document.querySelector('.kanban-search-input');
                if (searchInput) searchInput.focus();
            }
            
            // Escape - Clear search and selection
            if (e.key === 'Escape') {
                setSearchTerm('');
                setSelectedTasks(new Set());
                setShowSettings(false);
            }
            
            // Ctrl/Cmd + A - Select all visible tasks
            if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
                e.preventDefault();
                const allVisibleTaskIds = new Set(filteredTasks.map(task => task.id));
                setSelectedTasks(allVisibleTaskIds);
            }
            
            // Delete key - Delete selected tasks
            if (e.key === 'Delete' && selectedTasks.size > 0) {
                e.preventDefault();
                if (confirm(`Delete ${selectedTasks.size} selected tasks?`)) {
                    handleBulkOperation('delete');
                }
            }
            
            // Enter - Complete selected tasks
            if (e.key === 'Enter' && selectedTasks.size > 0) {
                e.preventDefault();
                handleBulkOperation('complete');
            }
        };
        
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [filteredTasks, selectedTasks, handleBulkOperation]);
    
    // Render loading state
    if (isLoading) {
        return dc.jsx('div', {
            className: 'kanban-loading',
            children: [
                dc.jsx('div', { className: 'kanban-loading-spinner' }),
                dc.jsx('div', { children: 'Loading tasks...' })
            ]
        });
    }
    
    // Render error state
    if (error) {
        return dc.jsx('div', {
            className: 'kanban-error',
            children: [
                dc.jsx('div', { 
                    className: 'kanban-error-icon',
                    children: '⚠️'
                }),
                dc.jsx('div', {
                    className: 'kanban-error-message',
                    children: `Error: ${error}`
                }),
                dc.jsx('button', {
                    className: 'kanban-error-retry',
                    onClick: () => {
                        setError(null);
                        setIsLoading(true);
                    },
                    children: 'Retry'
                })
            ]
        });
    }
    
    // Main kanban board render
    return dc.jsx('div', {
        className: 'kanban-board',
        tabIndex: 0,
        children: [
            // Header
            dc.jsx('div', {
                className: 'kanban-header',
                children: [
                    dc.jsx('div', {
                        className: 'kanban-title-section',
                        children: [
                            dc.jsx('h2', {
                                className: 'kanban-title',
                                children: 'Kanban Board'
                            }),
                            dc.jsx('div', {
                                className: 'kanban-stats',
                                children: `${filteredTasks.length}/${tasks.length} tasks${selectedTasks.size > 0 ? ` (${selectedTasks.size} selected)` : ''}`
                            })
                        ]
                    }),
                    
                    // Toolbar
                    dc.jsx('div', {
                        className: 'kanban-toolbar',
                        children: [
                            // Search
                            dc.jsx('div', {
                                className: 'kanban-search',
                                children: [
                                    dc.jsx('input', {
                                        type: 'text',
                                        className: 'kanban-search-input',
                                        placeholder: 'Search tasks... (Ctrl+F)',
                                        value: searchTerm,
                                        onChange: (e) => setSearchTerm(e.target.value)
                                    }),
                                    searchTerm && dc.jsx('button', {
                                        className: 'kanban-search-clear',
                                        onClick: () => setSearchTerm(''),
                                        children: '×'
                                    })
                                ]
                            }),
                            
                            // Filter
                            dc.jsx('select', {
                                className: 'kanban-filter',
                                value: selectedFilter,
                                onChange: (e) => setSelectedFilter(e.target.value),
                                children: [
                                    dc.jsx('option', { value: 'all', children: 'All Tasks' }),
                                    dc.jsx('option', { value: 'pending', children: 'Pending' }),
                                    dc.jsx('option', { value: 'completed', children: 'Completed' }),
                                    dc.jsx('option', { value: 'overdue', children: 'Overdue' }),
                                    dc.jsx('option', { value: 'today', children: 'Due Today' })
                                ]
                            }),
                            
                            // Bulk actions (shown when tasks are selected)
                            selectedTasks.size > 0 && dc.jsx('div', {
                                className: 'kanban-bulk-actions',
                                children: [
                                    dc.jsx('button', {
                                        className: 'kanban-bulk-complete',
                                        onClick: () => handleBulkOperation('complete'),
                                        children: '✓ Complete'
                                    }),
                                    dc.jsx('button', {
                                        className: 'kanban-bulk-uncomplete',
                                        onClick: () => handleBulkOperation('uncomplete'),
                                        children: '○ Uncomplete'
                                    }),
                                    dc.jsx('button', {
                                        className: 'kanban-bulk-delete',
                                        onClick: () => {
                                            if (confirm(`Delete ${selectedTasks.size} selected tasks?`)) {
                                                handleBulkOperation('delete');
                                            }
                                        },
                                        children: '🗑 Delete'
                                    })
                                ]
                            }),
                            
                            // Settings button
                            dc.jsx('button', {
                                className: 'kanban-settings-button',
                                onClick: () => setShowSettings(!showSettings),
                                title: 'Settings',
                                children: '⚙️'
                            })
                        ]
                    })
                ]
            }),
            
            // Keyboard shortcuts help (shown when no tasks visible)
            filteredTasks.length === 0 && tasks.length > 0 && dc.jsx('div', {
                className: 'kanban-no-results',
                children: [
                    dc.jsx('div', {
                        className: 'kanban-no-results-icon',
                        children: '🔍'
                    }),
                    dc.jsx('div', {
                        children: 'No tasks match your search or filter criteria'
                    }),
                    dc.jsx('button', {
                        className: 'kanban-clear-filters',
                        onClick: () => {
                            setSearchTerm('');
                            setSelectedFilter('all');
                        },
                        children: 'Clear filters'
                    })
                ]
            }),
            
            // Columns container
            dc.jsx('div', {
                className: 'kanban-columns',
                children: settings.columns.map(column => 
                    dc.jsx(KanbanColumn, {
                        key: column.id,
                        column: column,
                        tasks: tasksByColumn[column.id] || [],
                        onDragStart: handleDragStart,
                        onDrop: handleDrop,
                        onDragEnd: handleDragEnd,
                        draggedTask: draggedTask,
                        settings: settings,
                        selectedTasks: selectedTasks,
                        onTaskSelect: handleTaskSelect,
                        dc: dc
                    })
                )
            }),
            
            // Keyboard shortcuts help
            dc.jsx('div', {
                className: 'kanban-shortcuts-help',
                children: [
                    dc.jsx('div', {
                        className: 'kanban-shortcuts-title',
                        children: 'Keyboard Shortcuts:'
                    }),
                    dc.jsx('div', {
                        className: 'kanban-shortcuts-list',
                        children: 'Ctrl+F: Search • Ctrl+A: Select All • Enter: Complete • Del: Delete • Esc: Clear'
                    })
                ]
            }),
            
            // Settings panel overlay
            showSettings && dc.jsx('div', {
                className: 'kanban-settings-overlay',
                onClick: (e) => {
                    if (e.target.classList.contains('kanban-settings-overlay')) {
                        setShowSettings(false);
                    }
                },
                children: [
                    dc.jsx('div', {
                        className: 'kanban-settings-panel',
                        children: [
                            // Settings panel content will be imported
                            'Settings panel coming soon...'
                        ]
                    })
                ]
            })
        ]
    });
}

// Component metadata for Datacore
KanbanBoardView.displayName = 'KanbanBoardView';
KanbanBoardView.description = 'Dynamic kanban board with task management';