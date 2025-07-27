// Test fixtures for sample tasks and data

import { TaskItem } from '../../src/DatacoreSync';
import { createMockFile } from '../__mocks__/obsidian';

export const sampleTaskTexts = [
  '- [ ] Complete project documentation #todo #work',
  '- [ ] Review pull request #doing #development',
  '- [ ] Deploy to production #waiting #deployment',
  '- [x] Fix bug in authentication #done #bugfix',
  '- [ ] Write unit tests #todo #testing',
  '- [ ] Update dependencies #todo #maintenance',
  '- [x] Setup CI/CD pipeline #done #devops'
];

export const sampleTasks: TaskItem[] = [
  {
    id: 'tasks.md:0',
    text: 'Complete project documentation',
    file: createMockFile('tasks.md'),
    line: 0,
    tags: ['#todo', '#work'],
    dueDate: '2024-01-15',
    priority: 'high',
    status: 'todo',
    completed: false,
    metadata: {
      path: 'tasks.md',
      original: { value: 'Complete project documentation' }
    }
  },
  {
    id: 'tasks.md:1',
    text: 'Review pull request',
    file: createMockFile('tasks.md'),
    line: 1,
    tags: ['#doing', '#development'],
    dueDate: '2024-01-12',
    priority: 'medium',
    status: 'doing',
    completed: false,
    metadata: {
      path: 'tasks.md',
      original: { value: 'Review pull request' }
    }
  },
  {
    id: 'tasks.md:2',
    text: 'Deploy to production',
    file: createMockFile('tasks.md'),
    line: 2,
    tags: ['#waiting', '#deployment'],
    priority: 'high',
    status: 'waiting',
    completed: false,
    metadata: {
      path: 'tasks.md',
      original: { value: 'Deploy to production' }
    }
  },
  {
    id: 'tasks.md:3',
    text: 'Fix bug in authentication',
    file: createMockFile('tasks.md'),
    line: 3,
    tags: ['#done', '#bugfix'],
    priority: 'high',
    status: 'done',
    completed: true,
    metadata: {
      path: 'tasks.md',
      original: { value: 'Fix bug in authentication' }
    }
  }
];

export const sampleDatacoreResults = {
  table: {
    type: 'table' as const,
    data: {
      headers: ['task', 'status', 'due', 'priority'],
      values: [
        [
          { value: 'Complete project documentation', path: 'tasks.md' },
          { value: 'todo' },
          { value: '2024-01-15' },
          { value: 'high' }
        ],
        [
          { value: 'Review pull request', path: 'tasks.md' },
          { value: 'doing' },
          { value: '2024-01-12' },
          { value: 'medium' }
        ],
        [
          { value: 'Deploy to production', path: 'tasks.md' },
          { value: 'waiting' },
          { value: undefined },
          { value: 'high' }
        ],
        [
          { value: 'Fix bug in authentication', path: 'tasks.md' },
          { value: 'done' },
          { value: undefined },
          { value: 'high' }
        ]
      ]
    }
  },
  list: {
    type: 'list' as const,
    data: [
      {
        file: { path: 'tasks.md' },
        text: 'Complete project documentation',
        status: 'todo',
        due: '2024-01-15',
        priority: 'high',
        tags: ['#todo', '#work']
      },
      {
        file: { path: 'tasks.md' },
        text: 'Review pull request',
        status: 'doing',
        due: '2024-01-12',
        priority: 'medium',
        tags: ['#doing', '#development']
      }
    ]
  }
};

export const sampleFileContents = {
  'tasks.md': `# Tasks

- [ ] Complete project documentation #todo #work
- [ ] Review pull request #doing #development  
- [ ] Deploy to production #waiting #deployment
- [x] Fix bug in authentication #done #bugfix

## Completed
- [x] Setup CI/CD pipeline #done #devops`,

  'projects.md': `# Project Tasks

- [ ] Write unit tests #todo #testing
- [ ] Update dependencies #todo #maintenance
- [x] Initialize repository #done #setup`,

  'empty.md': '# Empty File\n\nNo tasks here.'
};

export const sampleKanbanSettings = {
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
  datacoreQuery: '@task',
  refreshInterval: 5000,
  cardMaxHeight: 200,
  showDueDate: true,
  showPriority: true,
  showTags: true
};