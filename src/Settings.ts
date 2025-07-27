export interface KanbanColumn {
    id: string;
    name: string;
    tag: string;
    color: string;
}

export interface KanbanSettings {
    columns: KanbanColumn[];
    datacoreQuery: string;
    refreshInterval: number;
    cardMaxHeight: number;
    showDueDate: boolean;
    showPriority: boolean;
    showTags: boolean;
}

export const DEFAULT_SETTINGS: KanbanSettings = {
    columns: [
        {
            id: 'todo',
            name: 'To Do',
            tag: '#todo',
            color: '#ff6b6b'
        },
        {
            id: 'doing',
            name: 'In Progress',
            tag: '#doing',
            color: '#4ecdc4'
        },
        {
            id: 'waiting',
            name: 'Waiting',
            tag: '#waiting',
            color: '#f9ca24'
        },
        {
            id: 'done',
            name: 'Done',
            tag: '#done',
            color: '#45b7d1'
        }
    ],
    datacoreQuery: 'TABLE task, status, due, priority FROM "Tasks" WHERE task != null',
    refreshInterval: 5000,
    cardMaxHeight: 200,
    showDueDate: true,
    showPriority: true,
    showTags: true
};