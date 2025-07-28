/**
 * KanbanBoard - Converted from TypeScript class to optimized Datacore TSX component
 * 
 * Original: DOM manipulation with manual state management
 * Converted: React hooks with Datacore integration, performance optimizations
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { KanbanSettings, KanbanColumn } from '../Settings';
import type { TaskItem } from '../DatacoreSync';

// Component Props Interface
interface KanbanBoardProps {
    settings: KanbanSettings;
    onTaskMove?: (taskId: string, newTag: string) => Promise<void>;
    onRefresh?: () => void;
    className?: string;
}

// Column Statistics Interface
interface ColumnStats {
    [columnId: string]: number;
}

// Task Group Interface
interface TasksByColumn {
    [columnId: string]: TaskItem[];
}

/**
 * Modern Datacore-optimized Kanban Board Component
 * 
 * Features:
 * - Live data updates via Datacore queries
 * - Drag & drop task management
 * - Performance optimizations with memoization
 * - Responsive design with accessibility
 */
return function KanbanBoard({ settings, onTaskMove, onRefresh, className }: KanbanBoardProps) {
    // Datacore query for live task updates
    const allTasks = dc.useQuery(settings.datacoreQuery || '@task');
    
    // Local state for UI interactions
    const [draggedTask, setDraggedTask] = useState<string | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Memoized task grouping by columns
    const tasksByColumn = dc.useMemo(() => {
        const grouped: TasksByColumn = {};
        
        // Initialize all columns
        settings.columns.forEach(column => {
            grouped[column.id] = [];
        });
        
        // Group tasks by matching column tags
        allTasks.forEach((task: TaskItem) => {
            const matchingColumn = getColumnForTask(task, settings.columns);
            if (matchingColumn) {
                grouped[matchingColumn.id].push(task);
            }
        });
        
        return grouped;
    }, [allTasks, settings.columns]);

    // Memoized column statistics
    const columnStats = dc.useMemo((): ColumnStats => {
        const stats: ColumnStats = {};
        settings.columns.forEach(column => {
            stats[column.id] = tasksByColumn[column.id]?.length || 0;
        });
        return stats;
    }, [tasksByColumn, settings.columns]);

    // Get column for task based on tags
    const getColumnForTask = useCallback((task: TaskItem, columns: KanbanColumn[]): KanbanColumn | null => {
        for (const column of columns) {
            if (task.tags.includes(column.tag)) {
                return column;
            }
        }
        // Default to first column if no tag matches
        return columns[0] || null;
    }, []);

    // Handle task drag start
    const handleDragStart = useCallback((e: React.DragEvent, taskId: string) => {
        setDraggedTask(taskId);
        e.dataTransfer.setData('text/plain', taskId);
        e.dataTransfer.effectAllowed = 'move';
    }, []);

    // Handle drag over column
    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }, []);

    // Handle task drop on column
    const handleDrop = useCallback(async (e: React.DragEvent, targetColumn: KanbanColumn) => {
        e.preventDefault();
        const taskId = e.dataTransfer.getData('text/plain');
        
        if (taskId && onTaskMove) {
            try {
                await onTaskMove(taskId, targetColumn.tag);
                setError(null);
            } catch (err) {
                setError(`Failed to move task: ${err.message}`);
                console.error('Failed to move task:', err);
            }
        }
        
        setDraggedTask(null);
    }, [onTaskMove]);

    // Handle manual refresh
    const handleRefresh = useCallback(async () => {
        setIsRefreshing(true);
        try {
            onRefresh?.();
            setError(null);
        } catch (err) {
            setError(`Failed to refresh: ${err.message}`);
        } finally {
            setIsRefreshing(false);
        }
    }, [onRefresh]);

    // Task Card Component
    const TaskCard = React.memo(({ task, settings: cardSettings }: { task: TaskItem; settings: KanbanSettings }) => {
        return (
            <div
                className="kanban-task-card"
                draggable
                onDragStart={(e) => handleDragStart(e, task.id)}
                style={{
                    maxHeight: cardSettings.cardMaxHeight ? `${cardSettings.cardMaxHeight}px` : undefined
                }}
            >
                <div className="task-content">
                    <div className="task-text">{task.text}</div>
                    
                    {cardSettings.showDueDate && task.dueDate && (
                        <div className="task-due-date">
                            <span className="task-label">Due:</span>
                            <time dateTime={task.dueDate}>{task.dueDate}</time>
                        </div>
                    )}
                    
                    {cardSettings.showPriority && task.priority && (
                        <div className={`task-priority priority-${task.priority.toLowerCase()}`}>
                            <span className="task-label">Priority:</span>
                            <span className="priority-value">{task.priority}</span>
                        </div>
                    )}
                    
                    {cardSettings.showTags && task.tags.length > 0 && (
                        <div className="task-tags">
                            {task.tags.map(tag => (
                                <span key={tag} className="task-tag">
                                    {tag}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
                
                <div className="task-meta">
                    <span className="task-file">{task.file.basename}</span>
                    <span className="task-line">Line {task.line}</span>
                </div>
            </div>
        );
    });

    // Column Component
    const KanbanColumn = React.memo(({ 
        column, 
        tasks, 
        taskCount, 
        isDragTarget 
    }: { 
        column: KanbanColumn; 
        tasks: TaskItem[]; 
        taskCount: number;
        isDragTarget: boolean;
    }) => {
        return (
            <div 
                className={`kanban-column ${isDragTarget ? 'kanban-drop-zone-active' : ''}`}
                data-column-id={column.id}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, column)}
            >
                <div 
                    className="kanban-column-header"
                    style={{ borderTopColor: column.color }}
                >
                    <h3 
                        className="kanban-column-title"
                        style={{ color: column.color }}
                    >
                        {column.name}
                    </h3>
                    <span className="kanban-column-count">
                        {taskCount}
                    </span>
                </div>
                
                <div className="kanban-column-content">
                    {tasks.map(task => (
                        <TaskCard 
                            key={task.id} 
                            task={task} 
                            settings={settings}
                        />
                    ))}
                    
                    {tasks.length === 0 && (
                        <div className="kanban-empty-column">
                            <p>No tasks in {column.name.toLowerCase()}</p>
                            <p className="kanban-drop-hint">
                                Drop tasks here to move them to {column.name}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        );
    });

    // Error Display Component
    const ErrorDisplay = React.memo(({ error }: { error: string }) => (
        <div className="kanban-error" role="alert">
            <span className="error-icon">⚠️</span>
            <span className="error-message">{error}</span>
            <button 
                className="error-dismiss"
                onClick={() => setError(null)}
                aria-label="Dismiss error"
            >
                ×
            </button>
        </div>
    ));

    // Loading state
    if (!allTasks) {
        return (
            <div className="kanban-loading">
                <div className="loading-spinner"></div>
                <p>Loading tasks...</p>
            </div>
        );
    }

    return (
        <div className={`kanban-board ${className || ''}`}>
            {/* Header with controls */}
            <div className="kanban-header">
                <div className="kanban-title">
                    <h2>Task Board</h2>
                    <span className="task-count">
                        {allTasks.length} total tasks
                    </span>
                </div>
                
                <div className="kanban-controls">
                    <button
                        className="kanban-refresh-btn"
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        title="Refresh board"
                        aria-label="Refresh kanban board"
                    >
                        {isRefreshing ? (
                            <span className="refresh-spinner">⟳</span>
                        ) : (
                            '🔄'
                        )}
                    </button>
                </div>
            </div>

            {/* Error display */}
            {error && <ErrorDisplay error={error} />}

            {/* Kanban columns */}
            <div className="kanban-columns">
                {settings.columns.map(column => (
                    <KanbanColumn
                        key={column.id}
                        column={column}
                        tasks={tasksByColumn[column.id] || []}
                        taskCount={columnStats[column.id] || 0}
                        isDragTarget={draggedTask !== null}
                    />
                ))}
            </div>

            {/* Board statistics */}
            <div className="kanban-stats">
                <div className="stats-summary">
                    <span>Total: {allTasks.length}</span>
                    {settings.columns.map(column => (
                        <span key={column.id} className="column-stat">
                            {column.name}: {columnStats[column.id] || 0}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
}

// Export component with display name for debugging
KanbanBoard.displayName = 'KanbanBoard';

export default KanbanBoard;