/**
 * Task Card Component
 * Represents an individual task in the kanban board
 */
export function TaskCard(props) {
    const { task, onDragStart, onDragEnd, settings, dc, isDragging, selectedTasks, onTaskSelect } = props;
    
    // Handle drag start
    const handleDragStart = dc.useCallback((e) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', task.id);
        
        // Add visual feedback
        e.currentTarget.style.opacity = '0.5';
        
        if (onDragStart) {
            onDragStart(task);
        }
    }, [task, onDragStart]);
    
    // Handle drag end
    const handleDragEnd = dc.useCallback((e) => {
        e.currentTarget.style.opacity = '1';
        
        if (onDragEnd) {
            onDragEnd();
        }
    }, [onDragEnd]);
    
    // Handle click to open file
    const handleClick = dc.useCallback(async (e) => {
        // Handle checkbox click for selection
        if (e.target.type === 'checkbox') {
            return; // Let checkbox handler manage this
        }
        
        e.preventDefault();
        
        // If Ctrl/Cmd is held, toggle selection
        if (e.ctrlKey || e.metaKey) {
            if (onTaskSelect) {
                const isSelected = selectedTasks?.has(task.id);
                onTaskSelect(task.id, !isSelected);
            }
            return;
        }
        
        try {
            // Open the file containing the task
            await app.workspace.openLinkText(
                `${task.file.basename}#${task.text}`,
                task.file.path,
                true
            );
        } catch (error) {
            console.error('Failed to open task file:', error);
        }
    }, [task, selectedTasks, onTaskSelect]);
    
    // Handle checkbox change
    const handleCheckboxChange = dc.useCallback((e) => {
        if (onTaskSelect) {
            onTaskSelect(task.id, e.target.checked);
        }
    }, [task.id, onTaskSelect]);
    
    // Format due date
    const formatDueDate = (dateStr) => {
        if (!dateStr) return null;
        
        try {
            const date = new Date(dateStr);
            const now = new Date();
            const diffTime = date.getTime() - now.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays < 0) {
                return { text: `${Math.abs(diffDays)}d overdue`, className: 'overdue' };
            } else if (diffDays === 0) {
                return { text: 'Due today', className: 'due-today' };
            } else if (diffDays === 1) {
                return { text: 'Due tomorrow', className: 'due-soon' };
            } else if (diffDays <= 7) {
                return { text: `Due in ${diffDays}d`, className: 'due-soon' };
            } else {
                return { text: date.toLocaleDateString(), className: 'due-later' };
            }
        } catch (error) {
            return { text: dateStr, className: 'due-invalid' };
        }
    };
    
    // Get priority indicator
    const getPriorityIndicator = (priority) => {
        if (!priority) return null;
        
        const priorityMap = {
            'high': { icon: '🔴', className: 'priority-high' },
            'medium': { icon: '🟡', className: 'priority-medium' },
            'low': { icon: '🟢', className: 'priority-low' },
            '1': { icon: '🔴', className: 'priority-high' },
            '2': { icon: '🟡', className: 'priority-medium' },
            '3': { icon: '🟢', className: 'priority-low' }
        };
        
        return priorityMap[priority.toLowerCase()] || null;
    };
    
    const dueInfo = formatDueDate(task.dueDate);
    const priorityInfo = getPriorityIndicator(task.priority);
    const isSelected = selectedTasks?.has(task.id) || false;
    
    return dc.jsx('div', {
        className: `task-card ${isDragging ? 'dragging' : ''} ${task.completed ? 'completed' : ''} ${isSelected ? 'selected' : ''}`,
        draggable: true,
        onDragStart: handleDragStart,
        onDragEnd: handleDragEnd,
        onClick: handleClick,
        style: {
            maxHeight: `${settings.cardMaxHeight}px`,
            opacity: isDragging ? 0.5 : 1
        },
        children: [
            // Selection checkbox
            onTaskSelect && dc.jsx('div', {
                className: 'task-selection',
                children: [
                    dc.jsx('input', {
                        type: 'checkbox',
                        className: 'task-checkbox',
                        checked: isSelected,
                        onChange: handleCheckboxChange,
                        onClick: (e) => e.stopPropagation()
                    })
                ]
            }),
            
            // Task text
            dc.jsx('div', {
                className: 'task-text',
                children: task.text
            }),
            
            // Metadata section
            (settings.showPriority && priorityInfo) || 
            (settings.showDueDate && dueInfo) || 
            (settings.showTags && task.tags.length > 0) ? 
            dc.jsx('div', {
                className: 'task-metadata',
                children: [
                    // Priority indicator
                    settings.showPriority && priorityInfo && dc.jsx('span', {
                        className: `task-priority ${priorityInfo.className}`,
                        title: `Priority: ${task.priority}`,
                        children: priorityInfo.icon
                    }),
                    
                    // Due date
                    settings.showDueDate && dueInfo && dc.jsx('span', {
                        className: `task-due-date ${dueInfo.className}`,
                        title: `Due: ${task.dueDate}`,
                        children: dueInfo.text
                    }),
                    
                    // Tags
                    settings.showTags && task.tags.length > 0 && dc.jsx('div', {
                        className: 'task-tags',
                        children: task.tags.map(tag => 
                            dc.jsx('span', {
                                key: tag,
                                className: 'task-tag',
                                children: tag
                            })
                        )
                    })
                ]
            }) : null,
            
            // File info
            dc.jsx('div', {
                className: 'task-file-info',
                children: [
                    dc.jsx('span', {
                        className: 'task-file-name',
                        title: task.file.path,
                        children: task.file.basename
                    }),
                    dc.jsx('span', {
                        className: 'task-line-number',
                        children: `:${task.line + 1}`
                    })
                ]
            })
        ]
    });
}

TaskCard.displayName = 'TaskCard';