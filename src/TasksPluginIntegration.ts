import { App, Plugin } from 'obsidian';
import type { App as ObsidianApp } from 'obsidian-typings';
import { TaskItem } from './DatacoreSync';

/**
 * Integration layer for the Tasks plugin
 * Provides enhanced task parsing and compatibility with Tasks plugin format
 */
export class TasksPluginIntegration {
    app: ObsidianApp;
    tasksPlugin: Plugin | null = null;
    tasksApi: any = null;

    constructor(app: App) {
        this.app = app as ObsidianApp;
        this.initialize();
    }

    private initialize(): void {
        // Try to get Tasks plugin
        this.tasksPlugin = this.app.plugins.plugins['obsidian-tasks-plugin'] || null;
        
        if (this.tasksPlugin) {
            // Tasks plugin might expose an API - check for common patterns
            this.tasksApi = (this.tasksPlugin as any).api || null;
            console.log('Tasks plugin detected and integrated');
        }
    }

    /**
     * Check if Tasks plugin is available
     */
    get isAvailable(): boolean {
        return this.tasksPlugin !== null;
    }

    /**
     * Parse a task line using Tasks plugin patterns if available
     */
    parseTaskLine(line: string): TaskParseResult | null {
        // Basic task regex: match indentation, checkbox, and content
        const taskMatch = line.match(/^(\s*)- \[([ xX])\]\s*(.*)/);
        
        if (!taskMatch) return null;

        const [, indent, completed, content] = taskMatch;
        
        // Extract different components from the content
        let workingText = content;
        
        // Extract dates (order matters - Tasks plugin has specific order)
        const dueMatch = workingText.match(/📅\s*(\d{4}-\d{2}-\d{2})/);
        const due = dueMatch?.[1];
        if (due) workingText = workingText.replace(/📅\s*\d{4}-\d{2}-\d{2}/, '').trim();
        
        const scheduledMatch = workingText.match(/🛫\s*(\d{4}-\d{2}-\d{2})/);
        const scheduled = scheduledMatch?.[1];
        if (scheduled) workingText = workingText.replace(/🛫\s*\d{4}-\d{2}-\d{2}/, '').trim();
        
        const startsMatch = workingText.match(/⏳\s*(\d{4}-\d{2}-\d{2})/);
        const starts = startsMatch?.[1];
        if (starts) workingText = workingText.replace(/⏳\s*\d{4}-\d{2}-\d{2}/, '').trim();
        
        const doneMatch = workingText.match(/✅\s*(\d{4}-\d{2}-\d{2})/);
        const done = doneMatch?.[1];
        if (done) workingText = workingText.replace(/✅\s*\d{4}-\d{2}-\d{2}/, '').trim();
        
        // Extract priority
        const priorityMatch = workingText.match(/(⏫|🔼|🔽|⏬)/);
        let priority = 'normal';
        if (priorityMatch) {
            switch (priorityMatch[0]) {
                case '⏫': priority = 'highest'; break;
                case '🔼': priority = 'high'; break;
                case '🔽': priority = 'low'; break;
                case '⏬': priority = 'lowest'; break;
            }
            workingText = workingText.replace(/(⏫|🔼|🔽|⏬)/, '').trim();
        }

        // Extract recurrence rule
        const recurrenceMatch = workingText.match(/🔁\s*([^#]*?)(?=\s+#|\s*$)/);
        const recurrenceRule = recurrenceMatch?.[1]?.trim();
        if (recurrenceRule) {
            workingText = workingText.replace(/🔁\s*[^#]*?(?=\s+#|\s*$)/, '').trim();
        }

        // Extract tags (keep them in the original text but also extract separately)
        const tags = this.extractTags(workingText);

        // Clean text by removing tags for the clean version
        const cleanText = workingText
            .replace(/#[\w-]+/g, '')
            .trim();

        return {
            indent: indent.length,
            completed: completed !== ' ',
            text: cleanText,
            originalText: content,
            due,
            scheduled,
            starts,
            done,
            priority,
            tags,
            isRecurring: !!recurrenceRule,
            recurrenceRule
        };
    }

    /**
     * Format a task according to Tasks plugin conventions
     */
    formatTask(task: TaskFormatOptions): string {
        let line = `- [${task.completed ? 'x' : ' '}] ${task.text}`;
        
        // Add priority emoji
        if (task.priority && task.priority !== 'normal') {
            const priorityEmoji = this.getPriorityEmoji(task.priority);
            line += ` ${priorityEmoji}`;
        }

        // Add dates
        if (task.scheduled) line += ` 🛫 ${task.scheduled}`;
        if (task.starts) line += ` ⏳ ${task.starts}`;
        if (task.due) line += ` 📅 ${task.due}`;
        if (task.done) line += ` ✅ ${task.done}`;

        // Add recurrence
        if (task.recurrenceRule) line += ` 🔁 ${task.recurrenceRule}`;

        // Add tags
        if (task.tags?.length) {
            line += ` ${task.tags.join(' ')}`;
        }

        return line;
    }

    /**
     * Convert TaskItem to Tasks plugin format
     */
    convertToTasksFormat(taskItem: TaskItem): string {
        const task: TaskFormatOptions = {
            text: taskItem.text,
            completed: taskItem.completed,
            due: taskItem.dueDate,
            priority: taskItem.priority,
            tags: taskItem.tags
        };

        return this.formatTask(task);
    }

    /**
     * Extract enhanced task metadata
     */
    extractTaskMetadata(line: string): TaskMetadata {
        const parseResult = this.parseTaskLine(line);
        if (!parseResult) {
            return {
                isTask: false,
                completed: false,
                text: line,
                tags: []
            };
        }

        return {
            isTask: true,
            completed: parseResult.completed,
            text: parseResult.text,
            originalText: parseResult.originalText,
            due: parseResult.due,
            scheduled: parseResult.scheduled,
            starts: parseResult.starts,
            done: parseResult.done,
            priority: parseResult.priority,
            tags: parseResult.tags,
            isRecurring: parseResult.isRecurring,
            recurrenceRule: parseResult.recurrenceRule,
            indent: parseResult.indent
        };
    }

    private extractTags(text: string): string[] {
        const tagRegex = /#[\w-]+/g;
        const matches = text.match(tagRegex);
        return matches || [];
    }


    private getPriorityEmoji(priority: string): string {
        switch (priority.toLowerCase()) {
            case 'highest': return '⏫';
            case 'high': return '🔼';
            case 'low': return '🔽';
            case 'lowest': return '⏬';
            default: return '';
        }
    }

    /**
     * Get task status based on completion and dates
     */
    getTaskStatus(metadata: TaskMetadata): string {
        if (metadata.completed) return 'done';
        if (metadata.starts && new Date(metadata.starts) > new Date()) return 'scheduled';
        if (metadata.due && new Date(metadata.due) < new Date()) return 'overdue';
        return 'todo';
    }

    /**
     * Check if a task is overdue
     */
    isOverdue(metadata: TaskMetadata): boolean {
        if (metadata.completed || !metadata.due) return false;
        return new Date(metadata.due) < new Date();
    }

    /**
     * Get task urgency score (0-10)
     */
    getUrgencyScore(metadata: TaskMetadata): number {
        let score = 0;
        
        // Priority scoring
        switch (metadata.priority) {
            case 'highest': score += 8; break;
            case 'high': score += 6; break;
            case 'normal': score += 4; break;
            case 'low': score += 2; break;
            case 'lowest': score += 1; break;
        }

        // Due date scoring
        if (metadata.due) {
            const daysUntilDue = Math.ceil((new Date(metadata.due).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
            if (daysUntilDue < 0) score += 3; // Overdue
            else if (daysUntilDue === 0) score += 2; // Due today
            else if (daysUntilDue <= 3) score += 1; // Due soon
        }

        return Math.min(score, 10);
    }
}

// Type definitions
export interface TaskParseResult {
    indent: number;
    completed: boolean;
    text: string;
    originalText: string;
    due?: string;
    scheduled?: string;
    starts?: string;
    done?: string;
    priority: string;
    tags: string[];
    isRecurring: boolean;
    recurrenceRule?: string;
}

export interface TaskFormatOptions {
    text: string;
    completed: boolean;
    due?: string;
    scheduled?: string;
    starts?: string;
    done?: string;
    priority?: string;
    tags?: string[];
    recurrenceRule?: string;
}

export interface TaskMetadata {
    isTask: boolean;
    completed: boolean;
    text: string;
    originalText?: string;
    due?: string;
    scheduled?: string;
    starts?: string;
    done?: string;
    priority?: string;
    tags: string[];
    isRecurring?: boolean;
    recurrenceRule?: string;
    indent?: number;
}