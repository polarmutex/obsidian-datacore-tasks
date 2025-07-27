import { App, TFile, Notice } from 'obsidian';
import type { App as ObsidianApp } from 'obsidian-typings';
import { DatacoreSync, TaskItem } from './DatacoreSync';
import { TasksPluginIntegration } from './TasksPluginIntegration';

export class TagManager {
    app: ObsidianApp;
    datacoreSync: DatacoreSync;
    tasksIntegration: TasksPluginIntegration;

    constructor(app: App, datacoreSync: DatacoreSync) {
        this.app = app as ObsidianApp;
        this.datacoreSync = datacoreSync;
        this.tasksIntegration = new TasksPluginIntegration(app);
    }

    async updateTaskStatus(task: TaskItem, newStatusTag: string): Promise<boolean> {
        try {
            const content = await this.app.vault.read(task.file);
            const lines = content.split('\n');
            
            if (task.line >= lines.length) {
                console.error('Task line is out of bounds');
                return false;
            }

            const originalLine = lines[task.line];
            
            // Use Tasks plugin integration for better parsing and formatting
            const taskMetadata = this.tasksIntegration.extractTaskMetadata(originalLine);
            
            if (!taskMetadata.isTask) {
                console.error('Line is not a valid task');
                return false;
            }

            // Update the task with new status
            const updatedLine = this.updateLineWithTasksIntegration(originalLine, newStatusTag, taskMetadata);
            
            if (originalLine === updatedLine) {
                console.log('No changes needed for task status');
                return true;
            }

            // Update the line
            lines[task.line] = updatedLine;
            const newContent = lines.join('\n');

            // Write back to file
            await this.app.vault.modify(task.file, newContent);

            // Trigger Datacore refresh
            await this.datacoreSync.refresh();

            const statusName = this.getStatusDisplayName(newStatusTag);
            new Notice(`Task moved to ${statusName}`);
            return true;

        } catch (error) {
            console.error('Failed to update task status:', error);
            new Notice('Failed to update task status');
            return false;
        }
    }

    private updateLineWithTasksIntegration(originalLine: string, newStatusTag: string, taskMetadata: any): string {
        // Status tags to replace
        const statusTagPattern = /#(todo|doing|waiting|done)\b/gi;
        
        // Remove existing status tags
        let updatedLine = originalLine.replace(statusTagPattern, '').trim();
        
        // Clean up extra spaces
        updatedLine = updatedLine.replace(/\s+/g, ' ');
        
        // Add new status tag at the end
        const cleanTag = newStatusTag.startsWith('#') ? newStatusTag : `#${newStatusTag}`;
        updatedLine = `${updatedLine} ${cleanTag}`;
        
        // If the tag indicates completion, update the checkbox
        if (newStatusTag === '#done' || newStatusTag === 'done') {
            updatedLine = updatedLine.replace(/- \[ \]/, '- [x]');
        } else if (taskMetadata.completed && newStatusTag !== '#done' && newStatusTag !== 'done') {
            // If moving away from done, uncheck the task
            updatedLine = updatedLine.replace(/- \[x\]/, '- [ ]');
        }
        
        return updatedLine;
    }

    private updateLineStatus(line: string, newStatusTag: string): string {
        // Fallback method for non-Tasks plugin integration
        const statusTagPattern = /#(todo|doing|waiting|done)\b/gi;
        
        // Remove existing status tags
        let updatedLine = line.replace(statusTagPattern, '').trim();
        
        // Clean up extra spaces
        updatedLine = updatedLine.replace(/\s+/g, ' ');
        
        // Add new status tag at the end
        const cleanTag = newStatusTag.startsWith('#') ? newStatusTag : `#${newStatusTag}`;
        updatedLine = `${updatedLine} ${cleanTag}`;
        
        return updatedLine;
    }

    private getStatusDisplayName(statusTag: string): string {
        const cleanTag = statusTag.replace('#', '').toLowerCase();
        switch (cleanTag) {
            case 'todo': return 'To Do';
            case 'doing': return 'In Progress';
            case 'waiting': return 'Waiting';
            case 'done': return 'Done';
            default: return cleanTag;
        }
    }

    async addTag(task: TaskItem, tag: string): Promise<boolean> {
        try {
            const content = await this.app.vault.read(task.file);
            const lines = content.split('\n');
            
            if (task.line >= lines.length) {
                return false;
            }

            const originalLine = lines[task.line];
            const cleanTag = tag.startsWith('#') ? tag : `#${tag}`;
            
            // Check if tag already exists
            if (originalLine.includes(cleanTag)) {
                return true;
            }

            // Add tag at the end of the line
            const updatedLine = `${originalLine} ${cleanTag}`;
            lines[task.line] = updatedLine;
            
            const newContent = lines.join('\n');
            await this.app.vault.modify(task.file, newContent);
            
            await this.datacoreSync.refresh();
            return true;

        } catch (error) {
            console.error('Failed to add tag:', error);
            return false;
        }
    }

    async removeTag(task: TaskItem, tag: string): Promise<boolean> {
        try {
            const content = await this.app.vault.read(task.file);
            const lines = content.split('\n');
            
            if (task.line >= lines.length) {
                return false;
            }

            const originalLine = lines[task.line];
            const cleanTag = tag.startsWith('#') ? tag : `#${tag}`;
            
            // Remove the tag
            const updatedLine = originalLine.replace(new RegExp(`\\s*${this.escapeRegex(cleanTag)}\\b`, 'gi'), '').trim();
            
            if (originalLine === updatedLine) {
                return true; // Tag wasn't present
            }

            lines[task.line] = updatedLine;
            const newContent = lines.join('\n');
            await this.app.vault.modify(task.file, newContent);
            
            await this.datacoreSync.refresh();
            return true;

        } catch (error) {
            console.error('Failed to remove tag:', error);
            return false;
        }
    }

    async toggleTaskCompletion(task: TaskItem): Promise<boolean> {
        try {
            const content = await this.app.vault.read(task.file);
            const lines = content.split('\n');
            
            if (task.line >= lines.length) {
                return false;
            }

            const originalLine = lines[task.line];
            
            // Check if this is actually a task line first
            if (!originalLine.includes('- [ ]') && !originalLine.includes('- [x]')) {
                console.error('Line is not a valid task - cannot toggle completion');
                return false;
            }
            
            let updatedLine = originalLine;

            // Toggle checkbox
            if (originalLine.includes('- [ ]')) {
                updatedLine = originalLine.replace('- [ ]', '- [x]');
                // Also update to done status
                updatedLine = this.updateLineStatus(updatedLine, 'done');
            } else if (originalLine.includes('- [x]')) {
                updatedLine = originalLine.replace('- [x]', '- [ ]');
                // Also update to todo status
                updatedLine = this.updateLineStatus(updatedLine, 'todo');
            }

            if (originalLine === updatedLine) {
                return true;
            }

            lines[task.line] = updatedLine;
            const newContent = lines.join('\n');
            await this.app.vault.modify(task.file, newContent);
            
            await this.datacoreSync.refresh();
            return true;

        } catch (error) {
            console.error('Failed to toggle task completion:', error);
            return false;
        }
    }

    private escapeRegex(string: string): string {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    async createTask(file: TFile, text: string, tags: string[] = []): Promise<boolean> {
        try {
            const content = await this.app.vault.read(file);
            
            // Create new task line
            const taskLine = `- [ ] ${text}`;
            const tagsString = tags.map(tag => tag.startsWith('#') ? tag : `#${tag}`).join(' ');
            const fullLine = tagsString ? `${taskLine} ${tagsString}` : taskLine;
            
            // Handle empty file case
            if (content.trim() === '') {
                await this.app.vault.modify(file, fullLine);
                await this.datacoreSync.refresh();
                new Notice('Task created successfully');
                return true;
            }
            
            const lines = content.split('\n');
            
            // Find a good place to insert the task (end of file or after last task)
            let insertIndex = lines.length;
            for (let i = lines.length - 1; i >= 0; i--) {
                if (lines[i].trim().startsWith('- [ ]') || lines[i].trim().startsWith('- [x]')) {
                    insertIndex = i + 1;
                    break;
                }
            }
            
            lines.splice(insertIndex, 0, fullLine);
            const newContent = lines.join('\n');
            await this.app.vault.modify(file, newContent);
            
            await this.datacoreSync.refresh();
            new Notice('Task created successfully');
            return true;

        } catch (error) {
            console.error('Failed to create task:', error);
            new Notice('Failed to create task');
            return false;
        }
    }
}