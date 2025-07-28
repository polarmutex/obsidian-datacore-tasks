import { Notice } from 'obsidian';
import { KanbanColumn, DatacoreTask, TaskUpdate, DragState, DropResult } from '../types/KanbanTypes';
import { TagUpdater } from './TagUpdater';
import { SerializationUtils } from '../utils/SerializationUtils';

export class DragDropController {
  private dragState: DragState = {
    isDragging: false,
    draggedTask: null,
    sourceColumn: null,
    targetColumn: null
  };

  constructor(
    private tagUpdater: TagUpdater,
    private onTaskMove?: (task: DatacoreTask, from: string, to: string) => void,
    private onRefresh?: () => Promise<void>
  ) {}

  setupDragDropEvents(boardElement: HTMLElement): void {
    // Global drag events
    boardElement.addEventListener('dragstart', this.handleDragStart.bind(this));
    boardElement.addEventListener('dragover', this.handleDragOver.bind(this));
    boardElement.addEventListener('dragenter', this.handleDragEnter.bind(this));
    boardElement.addEventListener('dragleave', this.handleDragLeave.bind(this));
    boardElement.addEventListener('drop', this.handleDrop.bind(this));
    boardElement.addEventListener('dragend', this.handleDragEnd.bind(this));
  }

  private handleDragStart(e: DragEvent): void {
    const taskCard = (e.target as HTMLElement).closest('.datacore-task-card') as HTMLElement;
    if (!taskCard || !e.dataTransfer) return;

    try {
      const taskData = taskCard.dataset.taskData;
      if (!taskData) {
        console.warn('No task data found on dragged element');
        return;
      }

      const task = SerializationUtils.restoreFromDragData(taskData);
      if (!task) {
        console.warn('Failed to restore task from drag data');
        return;
      }
      const sourceColumn = this.findColumnByElement(taskCard);

      this.dragState = {
        isDragging: true,
        draggedTask: task,
        sourceColumn: sourceColumn,
        targetColumn: null
      };

      // Set transfer data
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('application/json', taskData);
      e.dataTransfer.setData('text/plain', task.$text);

      // Visual feedback
      taskCard.classList.add('dragging');
      this.highlightDropZones(true);

      console.log('Drag started for task:', task.$text);
    } catch (error) {
      console.error('Error in drag start:', error);
    }
  }

  private handleDragOver(e: DragEvent): void {
    e.preventDefault();
    if (!this.dragState.isDragging) return;

    const dropZone = (e.target as HTMLElement).closest('.datacore-column-content');
    if (dropZone) {
      e.dataTransfer!.dropEffect = 'move';
      dropZone.classList.add('drag-over');
    }
  }

  private handleDragEnter(e: DragEvent): void {
    e.preventDefault();
    const dropZone = (e.target as HTMLElement).closest('.datacore-column-content');
    if (dropZone) {
      dropZone.classList.add('drag-over');
    }
  }

  private handleDragLeave(e: DragEvent): void {
    const dropZone = (e.target as HTMLElement).closest('.datacore-column-content');
    if (dropZone && !dropZone.contains(e.relatedTarget as Node)) {
      dropZone.classList.remove('drag-over');
    }
  }

  private async handleDrop(e: DragEvent): Promise<void> {
    e.preventDefault();
    
    const dropZone = (e.target as HTMLElement).closest('.datacore-column-content');
    if (!dropZone || !this.dragState.draggedTask) {
      console.warn('Invalid drop target or no dragged task');
      return;
    }

    try {
      const targetColumn = this.findColumnByDropZone(dropZone);
      if (!targetColumn) {
        console.warn('Target column not found');
        return;
      }

      this.dragState.targetColumn = targetColumn;

      // Validate drop operation
      const validation = this.validateDrop(this.dragState.draggedTask, targetColumn, this.dragState.sourceColumn);
      if (!validation.valid) {
        new Notice(validation.reason || 'Invalid drop operation');
        return;
      }

      // Perform the move
      const result = await this.moveTaskToColumn(this.dragState.draggedTask, targetColumn);
      
      if (result.success) {
        // Success feedback
        new Notice(`Task moved to ${targetColumn.name}`);
        
        // Trigger callbacks
        this.onTaskMove?.(
          this.dragState.draggedTask, 
          this.dragState.sourceColumn?.id || 'unknown',
          targetColumn.id
        );
        
        // Refresh view
        await this.onRefresh?.();
      } else {
        new Notice(result.message || 'Failed to move task');
      }

    } catch (error) {
      console.error('Error handling drop:', error);
      new Notice('Failed to move task: ' + error.message);
    } finally {
      // Clean up drag state
      dropZone.classList.remove('drag-over');
    }
  }

  private handleDragEnd(e: DragEvent): void {
    try {
      // Clean up visual feedback
      const taskCard = (e.target as HTMLElement).closest('.datacore-task-card');
      if (taskCard) {
        taskCard.classList.remove('dragging');
      }

      this.highlightDropZones(false);
      this.cleanupDragState();

      console.log('Drag ended');
    } catch (error) {
      console.error('Error in drag end:', error);
    }
  }

  private async moveTaskToColumn(task: DatacoreTask, targetColumn: KanbanColumn): Promise<DropResult> {
    try {
      const updates = this.calculateTagUpdates(task, targetColumn);
      
      // Apply tag updates
      await this.tagUpdater.applyTagUpdates(task, updates);
      
      // Update completion status if needed
      if (targetColumn.autoUpdates.completion !== 'no-change') {
        const shouldComplete = targetColumn.autoUpdates.completion === 'mark-complete';
        await this.tagUpdater.updateTaskCompletion(task, shouldComplete);
      }
      
      return {
        success: true,
        message: `Task moved to ${targetColumn.name}`,
        updatedTask: task
      };

    } catch (error) {
      console.error('Failed to move task:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  private calculateTagUpdates(task: DatacoreTask, targetColumn: KanbanColumn): TaskUpdate[] {
    const updates: TaskUpdate[] = [];
    
    // Remove old status tags if configured
    if (targetColumn.autoUpdates.removeConflictingTags) {
      const oldStatusTags = this.tagUpdater.extractStatusTags(task);
      oldStatusTags.forEach(tag => {
        if (tag !== targetColumn.statusTag) {
          updates.push({ action: 'remove', tag });
        }
      });
    }
    
    // Add new status tag
    if (targetColumn.statusTag && !this.taskHasTag(task, targetColumn.statusTag)) {
      updates.push({ action: 'add', tag: targetColumn.statusTag });
    }
    
    // Add custom tags
    if (targetColumn.autoUpdates.addCustomTags.length > 0) {
      targetColumn.autoUpdates.addCustomTags.forEach(tag => {
        if (!this.taskHasTag(task, tag)) {
          updates.push({ action: 'add', tag });
        }
      });
    }
    
    return updates;
  }

  private taskHasTag(task: DatacoreTask, tag: string): boolean {
    const tags = task.$tags || [];
    const cleanTag = tag.replace('#', '');
    return tags.some(t => t.replace('#', '').toLowerCase() === cleanTag.toLowerCase());
  }

  private validateDrop(task: DatacoreTask, targetColumn: KanbanColumn, sourceColumn: KanbanColumn | null): { valid: boolean; reason?: string } {
    // Basic validation
    if (!task || !targetColumn) {
      return { valid: false, reason: 'Invalid drag operation' };
    }
    
    // Check if moving to same column
    if (sourceColumn && sourceColumn.id === targetColumn.id) {
      return { valid: true, reason: 'Reordering within same column' };
    }
    
    // Check column task limits
    if (targetColumn.maxTasks !== undefined) {
      const currentTasksInColumn = this.getTaskCountInColumn(targetColumn.id);
      if (currentTasksInColumn >= targetColumn.maxTasks) {
        return { valid: false, reason: `Column "${targetColumn.name}" is full (max ${targetColumn.maxTasks} tasks)` };
      }
    }
    
    return { valid: true, reason: 'Valid drop operation' };
  }

  private findColumnByElement(element: HTMLElement): KanbanColumn | null {
    const columnElement = element.closest('.datacore-kanban-column') as HTMLElement;
    if (!columnElement) return null;
    
    const columnId = columnElement.dataset.columnId;
    if (!columnId) return null;
    
    // This should be populated by the parent component
    const columnData = columnElement.dataset.columnData;
    if (columnData) {
      try {
        return SerializationUtils.safeParse(columnData) as KanbanColumn;
      } catch (error) {
        console.error('Error parsing column data:', error);
      }
    }
    
    return null;
  }

  private findColumnByDropZone(dropZone: HTMLElement): KanbanColumn | null {
    const columnElement = dropZone.closest('.datacore-kanban-column') as HTMLElement;
    return this.findColumnByElement(columnElement);
  }

  private highlightDropZones(highlight: boolean): void {
    const dropZones = document.querySelectorAll('.datacore-column-content');
    dropZones.forEach(zone => {
      if (highlight) {
        zone.classList.add('drop-zone-highlight');
      } else {
        zone.classList.remove('drop-zone-highlight');
      }
    });
  }

  private cleanupDragState(): void {
    this.dragState = {
      isDragging: false,
      draggedTask: null,
      sourceColumn: null,
      targetColumn: null
    };
    
    // Remove any remaining drag classes
    document.querySelectorAll('.drag-over, .drop-zone-highlight').forEach(el => {
      el.classList.remove('drag-over', 'drop-zone-highlight');
    });
  }

  private getTaskCountInColumn(columnId: string): number {
    const columnElement = document.querySelector(`[data-column-id="${columnId}"]`);
    if (!columnElement) return 0;
    
    const taskCards = columnElement.querySelectorAll('.datacore-task-card');
    return taskCards.length;
  }

  // Public methods
  public getCurrentDragState(): DragState {
    return { ...this.dragState };
  }

  public cancelDrag(): void {
    this.cleanupDragState();
  }

  public destroy(): void {
    this.cleanupDragState();
  }
}