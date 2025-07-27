// Mock implementation of Obsidian API for testing

export class Plugin {
  app: App;
  manifest: any;

  constructor(app: App, manifest: any) {
    this.app = app;
    this.manifest = manifest;
  }

  addRibbonIcon = jest.fn().mockReturnValue({
    addClass: jest.fn()
  });
  addCommand = jest.fn();
  addSettingTab = jest.fn();
  registerView = jest.fn();
  registerEvent = jest.fn();
  loadData = jest.fn().mockResolvedValue({});
  saveData = jest.fn().mockResolvedValue(undefined);
  onload = jest.fn();
  onunload = jest.fn();
}

export class ItemView {
  app: App;
  leaf: WorkspaceLeaf;
  containerEl: HTMLElement;

  constructor(leaf: WorkspaceLeaf) {
    this.leaf = leaf;
    this.app = leaf.view?.app as App;
    this.containerEl = document.createElement('div');
    this.containerEl.children[1] = document.createElement('div') as any;
  }

  getViewType = jest.fn();
  getDisplayText = jest.fn();
  getIcon = jest.fn();
  onOpen = jest.fn();
  onClose = jest.fn();
  registerEvent = jest.fn();
}

export class TFile {
  path: string;
  extension: string;
  name: string;

  constructor(path: string) {
    this.path = path;
    this.extension = path.split('.').pop() || '';
    this.name = path.split('/').pop() || '';
  }
}

export class Notice {
  constructor(message: string, timeout?: number) {
    // Mock implementation
  }
}

export class PluginSettingTab {
  app: App;
  plugin: Plugin;
  containerEl: HTMLElement;

  constructor(app: App, plugin: Plugin) {
    this.app = app;
    this.plugin = plugin;
    this.containerEl = document.createElement('div');
  }

  display = jest.fn();
}

export class Setting {
  constructor(containerEl: HTMLElement) {
    // Mock implementation
  }

  setName = jest.fn().mockReturnThis();
  setDesc = jest.fn().mockReturnThis();
  addText = jest.fn().mockReturnThis();
  addTextArea = jest.fn().mockReturnThis();
  addToggle = jest.fn().mockReturnThis();
  onChange = jest.fn().mockReturnThis();
}

export interface App {
  vault: Vault;
  workspace: Workspace;
  plugins: {
    plugins: Record<string, any>;
    getPlugin: jest.Mock;
    enabledPlugins: Set<string>;
  };
  setting: {
    open: jest.Mock;
    openTabById: jest.Mock;
  };
}

export interface Vault {
  read: jest.Mock;
  modify: jest.Mock;
  getAbstractFileByPath: jest.Mock;
  on: jest.Mock;
  off: jest.Mock;
  offref: jest.Mock;
}

export interface Workspace {
  getLeavesOfType: jest.Mock;
  getRightLeaf: jest.Mock;
  revealLeaf: jest.Mock;
  on: jest.Mock;
  off: jest.Mock;
  trigger: jest.Mock;
}

export interface WorkspaceLeaf {
  view?: any;
  setViewState: jest.Mock;
  detach: jest.Mock;
}

export interface EventRef {
  off?: jest.Mock;
}

// Create mock app instance
export const createMockApp = (): App => ({
  vault: {
    read: jest.fn(),
    modify: jest.fn(),
    getAbstractFileByPath: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    offref: jest.fn()
  },
  workspace: {
    getLeavesOfType: jest.fn().mockReturnValue([]),
    getRightLeaf: jest.fn(),
    revealLeaf: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    trigger: jest.fn()
  },
  plugins: {
    plugins: {},
    getPlugin: jest.fn(),
    enabledPlugins: new Set()
  },
  setting: {
    open: jest.fn(),
    openTabById: jest.fn()
  }
});

// Create mock file instance
export const createMockFile = (path: string): TFile => new TFile(path);

// Create mock workspace leaf
export const createMockLeaf = (): WorkspaceLeaf => ({
  setViewState: jest.fn(),
  detach: jest.fn()
});

// Default exports for backward compatibility
export default {
  Plugin,
  ItemView,
  TFile,
  Notice,
  PluginSettingTab,
  Setting,
  createMockApp,
  createMockFile,
  createMockLeaf
};