import { TFile } from 'obsidian';
import { DatacoreTask, TaskUpdate, DatacoreContext } from '../types/KanbanTypes';

export class TagUpdater {
  constructor(private dcContext: DatacoreContext) {}

  async applyTagUpdates(task: DatacoreTask, updates: TaskUpdate[]): Promise<boolean> {
    try {
      const filePath = task.$file;
      const file = this.dcContext.vault.getAbstractFileByPath(filePath) as TFile;
      
      if (!file) {
        throw new Error(`File not found: ${filePath}`);
      }

      // Read file content
      const content = await this.dcContext.vault.read(file);
      const lines = content.split('\n');
      
      // Find task line using datacore metadata
      const taskLineIndex = this.findTaskLine(lines, task);
      if (taskLineIndex === -1) {
        throw new Error('Task not found in file');
      }
      
      // Apply tag updates
      let updatedLine = lines[taskLineIndex];
      let hasChanges = false;

      for (const update of updates) {
        const result = this.applyTagUpdate(updatedLine, update);
        if (result.changed) {
          updatedLine = result.line;
          hasChanges = true;
        }
      }
      
      // Only write if there are actual changes
      if (hasChanges) {
        lines[taskLineIndex] = updatedLine;
        await this.dcContext.vault.modify(file, lines.join('\n'));
        
        // Trigger datacore refresh
        await this.dcContext.refresh();
        return true;
      }

      return true;
    } catch (error) {
      console.error('Failed to apply tag updates:', error);
      throw error;
    }
  }

  async updateTaskCompletion(task: DatacoreTask, completed: boolean): Promise<boolean> {
    try {
      const filePath = task.$file;
      const file = this.dcContext.vault.getAbstractFileByPath(filePath) as TFile;
      
      if (!file) {
        throw new Error(`File not found: ${filePath}`);
      }

      const content = await this.dcContext.vault.read(file);
      const lines = content.split('\n');
      const taskLineIndex = this.findTaskLine(lines, task);
      
      if (taskLineIndex === -1) {
        throw new Error('Task not found in file');
      }

      let updatedLine = lines[taskLineIndex];
      let hasChanges = false;

      if (completed) {
        if (updatedLine.includes('- [ ]')) {
          updatedLine = updatedLine.replace(/- \[ \]/g, '- [x]');
          hasChanges = true;
        }
      } else {
        if (updatedLine.includes('- [x]') || updatedLine.includes('- [X]')) {
          updatedLine = updatedLine.replace(/- \[x\]/gi, '- [ ]');
          hasChanges = true;
        }
      }

      if (hasChanges) {
        lines[taskLineIndex] = updatedLine;
        await this.dcContext.vault.modify(file, lines.join('\n'));
        await this.dcContext.refresh();
      }

      return true;
    } catch (error) {
      console.error('Failed to update task completion:', error);
      throw error;
    }
  }

  private findTaskLine(lines: string[], task: DatacoreTask): number {
    const taskText = task.$text || task.text;
    const lineNumber = task.$line;
    
    // First try exact line number if available from datacore
    if (lineNumber !== undefined && lineNumber < lines.length) {
      const line = lines[lineNumber];
      if (line.includes(taskText) && this.isTaskLine(line)) {
        return lineNumber;
      }
    }
    
    // Fallback: search for task text
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes(taskText) && this.isTaskLine(line)) {
        return i;
      }
    }
    
    return -1;
  }

  private isTaskLine(line: string): boolean {
    return line.includes('- [ ]') || line.includes('- [x]') || line.includes('- [X]');
  }

  private applyTagUpdate(line: string, update: TaskUpdate): { line: string; changed: boolean } {
    let updatedLine = line;
    let changed = false;

    switch (update.action) {
      case 'add':
        if (!this.hasTag(line, update.tag)) {
          updatedLine = `${line.trim()} ${update.tag}`;
          changed = true;
        }
        break;

      case 'remove':
        const removed = this.removeTag(line, update.tag);
        if (removed !== line) {
          updatedLine = removed;
          changed = true;
        }
        break;

      case 'replace':
        if (update.oldTag && this.hasTag(line, update.oldTag)) {
          updatedLine = this.removeTag(line, update.oldTag);
        }
        if (!this.hasTag(updatedLine, update.tag)) {
          updatedLine = `${updatedLine.trim()} ${update.tag}`;
        }
        changed = updatedLine !== line;
        break;
    }

    return { line: updatedLine, changed };
  }

  private hasTag(line: string, tag: string): boolean {
    const cleanTag = tag.startsWith('#') ? tag : `#${tag}`;
    return line.includes(cleanTag);
  }

  private removeTag(line: string, tag: string): string {
    const cleanTag = tag.startsWith('#') ? tag : `#${tag}`;
    return line.replace(new RegExp(`\\s*${this.escapeRegex(cleanTag)}\\b`, 'gi'), '').trim();
  }

  private escapeRegex(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // Utility method to extract current status tags from task
  extractStatusTags(task: DatacoreTask): string[] {
    const tags = task.$tags || [];
    const statusPatterns = ['todo', 'doing', 'waiting', 'review', 'done', 'cancelled'];
    
    return tags.filter(tag => {
      const cleanTag = tag.replace('#', '').toLowerCase();
      return statusPatterns.includes(cleanTag);
    });
  }

  // Utility method to extract all tags from task text
  extractAllTags(taskText: string): string[] {
    const tagRegex = /#[\w-]+/g;
    const matches = taskText.match(tagRegex);
    return matches || [];
  }
}