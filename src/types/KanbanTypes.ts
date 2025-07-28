export interface KanbanColumn {
  id: string;
  name: string;
  color: string;
  statusTag: string;
  filterQuery?: string;
  completesTask?: boolean;
  autoUpdates: {
    completion: 'mark-complete' | 'mark-incomplete' | 'no-change';
    removeConflictingTags: boolean;
    addCustomTags: string[];
    setPriority?: 'low' | 'medium' | 'high' | 'urgent';
  };
  maxTasks?: number;
  sortBy?: 'due' | 'created' | 'priority' | 'alphabetical';
  collapsible?: boolean;
}

export interface KanbanConfig {
  query: string;
  columns: KanbanColumn[];
  settings: {
    dragDrop: boolean;
    autoRefresh: boolean;
    showTaskCount: boolean;
    compactMode: boolean;
    animationsEnabled?: boolean;
  };
}

export interface TaskUpdate {
  action: 'add' | 'remove' | 'replace';
  tag: string;
  oldTag?: string;
}

export interface DatacoreTask {
  $text: string;
  $file: string;
  $line?: number;
  $tags?: string[];
  completed?: boolean;
  due?: string;
  priority?: string;
  created?: string;
  [key: string]: any;
}

export interface DropResult {
  success: boolean;
  message?: string;
  updatedTask?: DatacoreTask;
}

export interface DragState {
  isDragging: boolean;
  draggedTask: DatacoreTask | null;
  sourceColumn: KanbanColumn | null;
  targetColumn: KanbanColumn | null;
}

export interface DatacoreContext {
  query: (queryString: string) => Promise<any>;
  refresh: () => Promise<void>;
  vault: any;
  container: HTMLElement;
  sourcePath?: string;
  tagUpdater: any;
  settings: any;
}

export const DEFAULT_COLUMNS: KanbanColumn[] = [
  {
    id: 'todo',
    name: 'To Do',
    color: '#fd7e14',
    statusTag: '#todo',
    autoUpdates: {
      completion: 'mark-incomplete',
      removeConflictingTags: true,
      addCustomTags: []
    },
    sortBy: 'due',
    collapsible: false
  },
  {
    id: 'doing',
    name: 'In Progress',
    color: '#0d6efd',
    statusTag: '#doing',
    autoUpdates: {
      completion: 'mark-incomplete',
      removeConflictingTags: true,
      addCustomTags: ['#active']
    },
    maxTasks: 5,
    sortBy: 'created',
    collapsible: false
  },
  {
    id: 'done',
    name: 'Completed',
    color: '#198754',
    statusTag: '#done',
    completesTask: true,
    autoUpdates: {
      completion: 'mark-complete',
      removeConflictingTags: true,
      addCustomTags: []
    },
    sortBy: 'created',
    collapsible: true
  }
];