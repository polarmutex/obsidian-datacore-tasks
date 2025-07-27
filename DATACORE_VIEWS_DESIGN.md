# Obsidian Datacore Views Plugin - Technical Design

## Overview

This document outlines the design for an Obsidian plugin that enables embedded JavaScript views directly in markdown files, with full Datacore integration and a modular component system.

## Core Features

### 1. Embedded JavaScript Code Blocks
- Execute JavaScript directly in markdown using `datacore-js` code blocks
- Full access to Datacore API and vault operations
- Live rendering and interactive components
- Real-time updates and reactivity

### 2. Module System (dc.require)
- Dynamic module loading for reusable components
- Built-in modules for common use cases
- Plugin extensibility for custom modules
- Dependency management and caching

### 3. File System Integration
- Safe file read/write operations
- File watching and change notifications
- Vault-scoped access with security restrictions
- Path resolution and validation

## Technical Architecture

### Plugin Structure
```
src/
├── main.ts                 # Plugin entry point
├── core/
│   ├── CodeBlockProcessor.ts    # Processes datacore-js blocks
│   ├── ModuleSystem.ts          # dc.require implementation
│   ├── JavaScriptRuntime.ts     # Sandboxed execution
│   └── SecurityManager.ts       # Permissions and restrictions
├── modules/
│   ├── kanban-view/
│   │   ├── index.ts
│   │   ├── KanbanComponent.ts
│   │   └── kanban.css
│   ├── file-api/
│   │   ├── index.ts
│   │   └── FileOperations.ts
│   ├── chart-view/
│   │   ├── index.ts
│   │   └── ChartRenderer.ts
│   └── table-view/
│       ├── index.ts
│       └── TableComponent.ts
├── api/
│   ├── DatacoreContext.ts       # dc global object
│   ├── VaultAPI.ts              # File system operations
│   └── ReactiveSystem.ts        # useState, useEffect
└── utils/
    ├── Security.ts              # Sandboxing utilities
    └── ErrorHandling.ts         # Error management
```

## Core Components

### 1. Code Block Processor

```typescript
export class CodeBlockProcessor {
  constructor(
    private app: App,
    private moduleSystem: ModuleSystem,
    private datacoreApi: DatacoreApi
  ) {}

  async processCodeBlock(
    source: string,
    el: HTMLElement,
    ctx: MarkdownPostProcessorContext
  ): Promise<void> {
    try {
      // Create execution context
      const context = this.createExecutionContext(el, ctx);
      
      // Execute JavaScript code
      const result = await this.executeCode(source, context);
      
      // Handle rendering and updates
      this.handleResult(result, el);
      
    } catch (error) {
      this.handleError(error, el);
    }
  }

  private createExecutionContext(
    container: HTMLElement,
    ctx: MarkdownPostProcessorContext
  ): ExecutionContext {
    return {
      dc: new DatacoreContext(this.app, this.moduleSystem, this.datacoreApi),
      container,
      sourcePath: ctx.sourcePath,
      refresh: () => this.refreshBlock(container, ctx)
    };
  }
}
```

### 2. Module System Implementation

```typescript
export class ModuleSystem {
  private modules = new Map<string, ModuleDefinition>();
  private cache = new Map<string, any>();

  constructor(private app: App, private security: SecurityManager) {
    this.registerBuiltinModules();
  }

  require(moduleName: string, context: ExecutionContext): any {
    // Check permissions
    if (!this.security.canRequireModule(moduleName, context)) {
      throw new Error(`Permission denied for module: ${moduleName}`);
    }

    // Return cached module if available
    if (this.cache.has(moduleName)) {
      return this.cache.get(moduleName);
    }

    // Load and instantiate module
    const moduleDefinition = this.modules.get(moduleName);
    if (!moduleDefinition) {
      throw new Error(`Module not found: ${moduleName}`);
    }

    const moduleInstance = this.instantiateModule(moduleDefinition, context);
    this.cache.set(moduleName, moduleInstance);
    
    return moduleInstance;
  }

  registerModule(name: string, definition: ModuleDefinition): void {
    this.modules.set(name, definition);
  }
}
```

### 3. Datacore Context API

```typescript
export class DatacoreContext {
  constructor(
    private app: App,
    private moduleSystem: ModuleSystem,
    private datacoreApi: DatacoreApi
  ) {}

  // Module system
  require = (moduleName: string) => {
    return this.moduleSystem.require(moduleName, this);
  };

  // Datacore integration
  query = async (queryString: string) => {
    return await this.datacoreApi.query(queryString);
  };

  // Reactive system
  useState = <T>(initialValue: T): [T, (value: T) => void] => {
    return this.reactiveSystem.useState(initialValue);
  };

  useEffect = (callback: () => void, dependencies?: any[]) => {
    return this.reactiveSystem.useEffect(callback, dependencies);
  };

  // File system access
  vault = new VaultAPI(this.app.vault, this.security);
}
```

## Built-in Modules

### Kanban View Module

```typescript
// modules/kanban-view/index.ts
export interface KanbanConfig {
  tasks: QueryResult;
  columns: ColumnDefinition[];
  settings?: {
    dragAndDrop?: boolean;
    search?: boolean;
    filters?: boolean;
  };
  onTaskMove?: (task: Task, fromColumn: string, toColumn: string) => void;
  onTaskClick?: (task: Task) => void;
}

export class KanbanView {
  render(container: HTMLElement, config: KanbanConfig): void {
    // Clear container
    container.empty();
    
    // Create kanban board
    const board = this.createBoard(config);
    container.appendChild(board);
    
    // Setup event listeners
    this.setupEventListeners(board, config);
  }

  private createBoard(config: KanbanConfig): HTMLElement {
    const board = document.createElement('div');
    board.className = 'datacore-kanban-board';
    
    // Create columns
    config.columns.forEach(column => {
      const columnEl = this.createColumn(column, config.tasks);
      board.appendChild(columnEl);
    });
    
    return board;
  }
}

// Export for dc.require
export default {
  render: (container: HTMLElement, config: KanbanConfig) => {
    const kanban = new KanbanView();
    kanban.render(container, config);
  }
};
```

### File API Module

```typescript
// modules/file-api/index.ts
export class FileAPI {
  constructor(private vault: Vault, private security: SecurityManager) {}

  async read(path: string): Promise<string> {
    this.security.validatePath(path);
    const file = this.vault.getAbstractFileByPath(path);
    if (!(file instanceof TFile)) {
      throw new Error(`File not found: ${path}`);
    }
    return await this.vault.read(file);
  }

  async write(path: string, content: string): Promise<void> {
    this.security.validatePath(path);
    this.security.checkWritePermission(path);
    
    const file = this.vault.getAbstractFileByPath(path);
    if (file instanceof TFile) {
      await this.vault.modify(file, content);
    } else {
      await this.vault.create(path, content);
    }
  }

  async list(folderPath: string, options?: ListOptions): Promise<string[]> {
    this.security.validatePath(folderPath);
    
    const folder = this.vault.getAbstractFileByPath(folderPath);
    if (!(folder instanceof TFolder)) {
      throw new Error(`Folder not found: ${folderPath}`);
    }

    return this.vault.adapter.list(folderPath);
  }

  watch(path: string, callback: (event: string, file: string) => void): () => void {
    this.security.validatePath(path);
    
    const ref = this.vault.on('modify', (file) => {
      if (file.path.startsWith(path)) {
        callback('modify', file.path);
      }
    });

    return () => this.vault.offref(ref);
  }
}

// Export for dc.require
export default new FileAPI(vault, security);
```

## Security Model

### Permissions System
```typescript
export interface ModulePermissions {
  fileRead: boolean;
  fileWrite: boolean;
  fileWatch: boolean;
  networkAccess: boolean;
  domAccess: 'none' | 'sandbox' | 'full';
  datacoreAccess: boolean;
}

export class SecurityManager {
  private modulePermissions = new Map<string, ModulePermissions>();

  canRequireModule(moduleName: string, context: ExecutionContext): boolean {
    const permissions = this.modulePermissions.get(moduleName);
    return permissions !== undefined;
  }

  validatePath(path: string): void {
    // Ensure path is within vault
    if (path.includes('..') || path.startsWith('/')) {
      throw new Error('Invalid path: must be within vault');
    }
  }

  checkWritePermission(path: string): void {
    // Check if path is writable (not system files)
    if (path.startsWith('.obsidian/') && !path.startsWith('.obsidian/plugins/')) {
      throw new Error('Cannot write to system files');
    }
  }
}
```

## Usage Examples

### Basic Kanban Board
```markdown
# Project Dashboard

```datacore-js
const kanban = dc.require('kanban-view');

// Query project tasks
const tasks = await dc.query('@task AND path("Projects/MyProject")');

// Render kanban board
kanban.render(dc.container, {
  tasks: tasks,
  columns: [
    { id: 'todo', name: 'To Do', tag: '#todo', color: '#ff6b6b' },
    { id: 'doing', name: 'In Progress', tag: '#doing', color: '#4ecdc4' },
    { id: 'done', name: 'Done', tag: '#done', color: '#45b7d1' }
  ],
  settings: {
    dragAndDrop: true,
    search: true
  }
});
```
```

### File Statistics Dashboard
```markdown
# Vault Statistics

```datacore-js
const files = dc.require('file-api');
const chart = dc.require('chart-view');

// Get all markdown files
const allFiles = await files.list('/', { pattern: '*.md' });

// Calculate statistics
const stats = [];
for (const filePath of allFiles) {
  const content = await files.read(filePath);
  const wordCount = content.split(/\s+/).length;
  stats.push({
    file: filePath,
    words: wordCount,
    size: content.length
  });
}

// Render chart
chart.render(dc.container, {
  type: 'bar',
  data: stats,
  xAxis: 'file',
  yAxis: 'words',
  title: 'Word Count by File'
});
```
```

### Dynamic Task List with Live Updates
```markdown
# Today's Tasks

```datacore-js
const [filter, setFilter] = dc.useState('all');
const [tasks, setTasks] = dc.useState([]);

// Load tasks on mount and when filter changes
dc.useEffect(async () => {
  let query = '@task';
  if (filter === 'due-today') {
    query += ' AND due = date(today)';
  } else if (filter === 'overdue') {
    query += ' AND due < date(today) AND !completed';
  }
  
  const result = await dc.query(query);
  setTasks(result);
}, [filter]);

// Render filter buttons
const filterContainer = document.createElement('div');
filterContainer.innerHTML = `
  <button onclick="setFilter('all')">All Tasks</button>
  <button onclick="setFilter('due-today')">Due Today</button>
  <button onclick="setFilter('overdue')">Overdue</button>
`;
dc.container.appendChild(filterContainer);

// Render task list
const table = dc.require('table-view');
table.render(dc.container, {
  data: tasks,
  columns: [
    { field: 'text', title: 'Task' },
    { field: 'due', title: 'Due Date' },
    { field: 'file', title: 'File' }
  ],
  sortable: true
});
```
```

## Implementation Phases

### Phase 1: Core Infrastructure
1. **Code Block Processor**: Basic JavaScript execution in markdown
2. **Security Framework**: Sandboxing and permission system
3. **Datacore Integration**: Basic query access

### Phase 2: Module System
1. **Module Registry**: Dynamic module loading
2. **Built-in Modules**: kanban-view, file-api
3. **Context API**: dc global object with full functionality

### Phase 3: Advanced Features
1. **Reactive System**: useState, useEffect implementation
2. **Additional Modules**: chart-view, table-view, calendar-view
3. **Performance Optimization**: Caching and efficiency improvements

### Phase 4: Extensibility
1. **Plugin API**: Allow other plugins to register modules
2. **Custom Components**: User-defined module system
3. **Advanced Security**: Fine-grained permissions

## Benefits

### For Users
- **Embedded Interactivity**: Rich, interactive content directly in notes
- **Real-time Data**: Live queries and dynamic updates
- **Customizable Views**: Flexible component system for any use case
- **Seamless Integration**: Works within existing Obsidian workflow

### For Developers
- **Modular Architecture**: Easy to extend and maintain
- **Security First**: Safe execution with proper sandboxing
- **Plugin Ecosystem**: Extensible for community contributions
- **Modern API**: React-like patterns for familiar development

## Conclusion

This design provides a comprehensive framework for embedded JavaScript views in Obsidian, with full Datacore integration and a secure, extensible module system. The architecture balances power and flexibility with security and performance, enabling rich interactive content while maintaining the safety and stability of the Obsidian environment.