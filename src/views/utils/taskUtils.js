/**
 * Task manipulation utilities for the Kanban board
 */

export const taskUtils = {
    /**
     * Process query results from Datacore into standardized task objects
     */
    processQueryResults(queryResult) {
        if (!queryResult) return [];
        
        // Handle different result formats
        if (Array.isArray(queryResult)) {
            return queryResult.map(item => this.normalizeTask(item)).filter(Boolean);
        }
        
        if (queryResult.type === 'list' && queryResult.data) {
            return queryResult.data.map(item => this.normalizeTask(item)).filter(Boolean);
        }
        
        if (queryResult.type === 'table' && queryResult.data) {
            return queryResult.data.values.map((row, index) => 
                this.normalizeTaskFromTableRow(row, queryResult.data.headers)
            ).filter(Boolean);
        }
        
        return [];
    },
    
    /**
     * Normalize a task object from various Datacore formats
     */
    normalizeTask(item) {
        if (!item || typeof item !== 'object') return null;
        
        // Handle _MarkdownTaskItem from Datacore
        if (item.constructor?.name === '_MarkdownTaskItem') {
            return this.normalizeMarkdownTaskItem(item);
        }
        
        // Handle generic task objects
        return this.normalizeGenericTask(item);
    },
    
    /**
     * Normalize a Datacore _MarkdownTaskItem
     */
    normalizeMarkdownTaskItem(taskItem) {
        try {
            const text = taskItem.$text || taskItem.$cleantext || taskItem.text || '';
            
            if (!text || text.trim() === '') return null;
            
            const completed = taskItem.$completed ?? (taskItem.$status === 'x' || taskItem.$status === 'X');
            const filePath = taskItem.$file;
            
            if (!filePath) return null;
            
            // Get file object from app
            const file = app.vault.getAbstractFileByPath(filePath);
            if (!file) return null;
            
            return {
                id: taskItem.$id || `${filePath}:${taskItem.$line || 0}`,
                text: text,
                file: file,
                line: taskItem.$line || 0,
                tags: taskItem.$tags || this.extractTagsFromText(text),
                dueDate: taskItem.due || taskItem.dueDate,
                priority: taskItem.priority,
                status: completed ? 'done' : 'todo',
                completed: completed,
                metadata: taskItem
            };
        } catch (error) {
            console.error('Error normalizing markdown task item:', error);
            return null;
        }
    },
    
    /**
     * Normalize a generic task object
     */
    normalizeGenericTask(data) {
        try {
            const fileData = data.file || data.path;
            if (!fileData || !fileData.path) return null;
            
            const file = app.vault.getAbstractFileByPath(fileData.path);
            if (!file) return null;
            
            const text = this.extractStringValue(data.text || data.task || data.description);
            if (!text) return null;
            
            const status = this.extractStringValue(data.status) || 'todo';
            const completed = data.completed === true || status === 'done';
            
            return {
                id: `${fileData.path}:${data.line || 0}`,
                text: text,
                file: file,
                line: data.line || 0,
                tags: this.extractTags(data.tags) || this.extractTagsFromText(text),
                dueDate: this.extractStringValue(data.due || data.dueDate),
                priority: this.extractStringValue(data.priority),
                status: status,
                completed: completed,
                metadata: data
            };
        } catch (error) {
            console.error('Error normalizing generic task:', error);
            return null;
        }
    },
    
    /**
     * Normalize a task from table row data
     */
    normalizeTaskFromTableRow(row, headers) {
        const rowData = {};
        headers.forEach((header, index) => {
            rowData[header] = row[index];
        });
        return this.normalizeGenericTask(rowData);
    },
    
    /**
     * Group tasks by column based on their tags
     */
    groupTasksByColumn(tasks, columns) {
        const grouped = {};
        
        // Initialize empty arrays for each column
        columns.forEach(column => {
            grouped[column.id] = [];
        });
        
        // Group tasks by matching tags
        tasks.forEach(task => {
            let assigned = false;
            
            // Check each column for matching tags
            for (const column of columns) {
                if (this.taskMatchesColumn(task, column)) {
                    grouped[column.id].push(task);
                    assigned = true;
                    break;
                }
            }
            
            // If no specific column matches, assign to first column (default)
            if (!assigned && columns.length > 0) {
                grouped[columns[0].id].push(task);
            }
        });
        
        return grouped;
    },
    
    /**
     * Check if a task matches a column based on tags
     */
    taskMatchesColumn(task, column) {
        const columnTag = column.tag.toLowerCase();
        
        // Check if any task tag matches the column tag
        return task.tags.some(tag => 
            tag.toLowerCase() === columnTag || 
            tag.toLowerCase() === columnTag.replace('#', '')
        );
    },
    
    /**
     * Update task tags in the source file
     */
    async updateTaskTags(task, oldTag, newTag, datacoreApi) {
        try {
            const file = task.file;
            const content = await app.vault.read(file);
            const lines = content.split('\n');
            
            if (task.line >= 0 && task.line < lines.length) {
                let line = lines[task.line];
                
                // Remove old tag and add new tag
                if (oldTag && oldTag !== newTag) {
                    // Remove old tag (with or without #)
                    const oldTagPattern = new RegExp(`\\s*${oldTag.replace('#', '#?')}\\b`, 'gi');
                    line = line.replace(oldTagPattern, '');
                }
                
                // Add new tag if it doesn't exist
                if (newTag && !line.includes(newTag)) {
                    // Add tag at the end of the line
                    line = line.trim() + ' ' + newTag;
                }
                
                // Update the line
                lines[task.line] = line;
                
                // Write back to file
                const newContent = lines.join('\n');
                await app.vault.modify(file, newContent);
                
                // Trigger Datacore refresh if API is available
                if (datacoreApi?.index?.touch) {
                    datacoreApi.index.touch(file.path);
                }
            }
        } catch (error) {
            console.error('Failed to update task tags:', error);
            throw error;
        }
    },
    
    /**
     * Move a task between columns in the local state
     */
    moveTaskBetweenColumns(tasks, task, sourceColumn, targetColumn, dropIndex) {
        // Create a new tasks array
        const updatedTasks = tasks.map(t => {
            if (t.id === task.id) {
                // Update the task's tags
                const newTags = t.tags.filter(tag => 
                    !this.taskMatchesColumn({ tags: [tag] }, sourceColumn)
                );
                
                // Add target column tag if not present
                if (!newTags.some(tag => this.taskMatchesColumn({ tags: [tag] }, targetColumn))) {
                    newTags.push(targetColumn.tag);
                }
                
                return {
                    ...t,
                    tags: newTags,
                    status: targetColumn.id === 'done' ? 'done' : 'todo',
                    completed: targetColumn.id === 'done'
                };
            }
            return t;
        });
        
        return updatedTasks;
    },
    
    /**
     * Extract string value from various Datacore literal types
     */
    extractStringValue(value) {
        if (typeof value === 'string') return value;
        if (typeof value === 'object' && value !== null) {
            if ('display' in value) return value.display;
            if ('value' in value) return String(value.value);
        }
        return undefined;
    },
    
    /**
     * Extract tags from various formats
     */
    extractTags(tagsData) {
        if (Array.isArray(tagsData)) {
            return tagsData.map(tag => this.extractStringValue(tag)).filter(Boolean);
        }
        if (typeof tagsData === 'string') {
            return [tagsData];
        }
        return undefined;
    },
    
    /**
     * Extract tags from text using regex
     */
    extractTagsFromText(text) {
        if (!text || typeof text !== 'string') return [];
        
        const tagRegex = /#[\w-]+/g;
        const matches = text.match(tagRegex);
        return matches || [];
    },
    
    /**
     * Update task status (complete/incomplete)
     */
    async updateTaskStatus(task, status, datacoreApi) {
        try {
            const file = task.file;
            const content = await app.vault.read(file);
            const lines = content.split('\n');
            
            if (task.line >= 0 && task.line < lines.length) {
                let line = lines[task.line];
                
                // Update the task checkbox
                if (status === 'done') {
                    line = line.replace(/- \[ \]/, '- [x]');
                } else {
                    line = line.replace(/- \[x\]/, '- [ ]');
                }
                
                lines[task.line] = line;
                
                // Write back to file
                const newContent = lines.join('\n');
                await app.vault.modify(file, newContent);
                
                // Trigger Datacore refresh if API is available
                if (datacoreApi?.index?.touch) {
                    datacoreApi.index.touch(file.path);
                }
            }
        } catch (error) {
            console.error('Failed to update task status:', error);
            throw error;
        }
    },
    
    /**
     * Delete a task from its source file
     */
    async deleteTask(task, datacoreApi) {
        try {
            const file = task.file;
            const content = await app.vault.read(file);
            const lines = content.split('\n');
            
            if (task.line >= 0 && task.line < lines.length) {
                // Remove the task line
                lines.splice(task.line, 1);
                
                // Write back to file
                const newContent = lines.join('\n');
                await app.vault.modify(file, newContent);
                
                // Trigger Datacore refresh if API is available
                if (datacoreApi?.index?.touch) {
                    datacoreApi.index.touch(file.path);
                }
            }
        } catch (error) {
            console.error('Failed to delete task:', error);
            throw error;
        }
    }
};