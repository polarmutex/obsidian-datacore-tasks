import { MarkdownPostProcessorContext, Plugin } from 'obsidian';
import { KanbanConfig, DatacoreContext, DEFAULT_COLUMNS } from '../types/KanbanTypes';
import { DatacoreKanbanView } from '../views/DatacoreKanbanView';
import { TagUpdater } from '../core/TagUpdater';
import * as yaml from 'js-yaml';

export class MarkdownProcessor {
  private activeViews = new Map<string, DatacoreKanbanView>();

  constructor(private plugin: Plugin) {}

  registerCodeBlockProcessor(): void {
    // Register datacore-kanban code block
    this.plugin.registerMarkdownCodeBlockProcessor(
      'datacore-kanban',
      this.processKanbanBlock.bind(this)
    );
  }

  async processKanbanBlock(
    source: string,
    el: HTMLElement,
    ctx: MarkdownPostProcessorContext
  ): Promise<void> {
    try {
      // Parse configuration
      const config = this.parseKanbanConfig(source);
      
      // Validate configuration
      this.validateConfig(config);
      
      // Create unique ID for this view
      const viewId = this.generateViewId(ctx.sourcePath, source);
      
      // Clean up any existing view with this ID
      if (this.activeViews.has(viewId)) {
        this.activeViews.get(viewId)?.destroy();
        this.activeViews.delete(viewId);
      }

      // Create datacore context for the block
      const dcContext = this.createDatacoreContext(el, ctx);
      
      // Create and render kanban view
      const kanbanView = new DatacoreKanbanView(dcContext, el, config);
      await kanbanView.render();
      
      // Store active view
      this.activeViews.set(viewId, kanbanView);
      
      // Setup auto-refresh on file changes
      this.setupAutoRefresh(kanbanView, ctx.sourcePath, viewId);
      
      console.log(`Datacore kanban view created: ${viewId}`);

    } catch (error) {
      console.error('Failed to process datacore-kanban block:', error);
      this.renderError(el, error.message);
    }
  }

  private parseKanbanConfig(source: string): KanbanConfig {
    try {
      const parsed = yaml.load(source) as any;
      
      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Invalid YAML configuration');
      }

      return {
        query: parsed.query || '@task',
        columns: this.parseColumns(parsed.columns),
        settings: {
          dragDrop: parsed.settings?.dragDrop ?? true,
          autoRefresh: parsed.settings?.autoRefresh ?? true,
          showTaskCount: parsed.settings?.showTaskCount ?? true,
          compactMode: parsed.settings?.compactMode ?? false,
          animationsEnabled: parsed.settings?.animationsEnabled ?? true,
          ...parsed.settings
        }
      };

    } catch (error) {
      throw new Error(`Failed to parse configuration: ${error.message}`);
    }
  }

  private parseColumns(columnsConfig: any): KanbanConfig['columns'] {
    if (!columnsConfig || !Array.isArray(columnsConfig)) {
      return DEFAULT_COLUMNS;
    }

    return columnsConfig.map((col, index) => {
      if (!col || typeof col !== 'object') {
        throw new Error(`Invalid column configuration at index ${index}`);
      }

      return {
        id: col.id || col.name?.toLowerCase().replace(/\s+/g, '-') || `column-${index}`,
        name: col.name || `Column ${index + 1}`,
        color: col.color || this.getDefaultColor(index),
        statusTag: col.tag || col.statusTag || `#${col.name?.toLowerCase() || 'status'}`,
        filterQuery: col.filterQuery || col.filter,
        completesTask: col.completesTask || col.completes || false,
        autoUpdates: {
          completion: col.autoUpdates?.completion || col.completion || 'no-change',
          removeConflictingTags: col.autoUpdates?.removeConflictingTags ?? col.removeConflicting ?? true,
          addCustomTags: col.autoUpdates?.addCustomTags || col.addTags || [],
          setPriority: col.autoUpdates?.setPriority || col.priority
        },
        maxTasks: col.maxTasks || col.limit,
        sortBy: col.sortBy || col.sort || 'created',
        collapsible: col.collapsible ?? false
      };
    });
  }

  private getDefaultColor(index: number): string {
    const colors = ['#fd7e14', '#0d6efd', '#198754', '#6f42c1', '#dc3545', '#20c997'];
    return colors[index % colors.length];
  }

  private validateConfig(config: KanbanConfig): void {
    if (!config.query || typeof config.query !== 'string') {
      throw new Error('Query is required and must be a string');
    }

    if (!config.columns || !Array.isArray(config.columns) || config.columns.length === 0) {
      throw new Error('At least one column is required');
    }

    // Validate each column
    config.columns.forEach((column, index) => {
      if (!column.name || typeof column.name !== 'string') {
        throw new Error(`Column ${index}: name is required`);
      }
      
      if (!column.statusTag || typeof column.statusTag !== 'string') {
        throw new Error(`Column ${index}: statusTag is required`);
      }
      
      if (!column.color || typeof column.color !== 'string') {
        throw new Error(`Column ${index}: color is required`);
      }
    });

    // Check for duplicate column IDs
    const columnIds = config.columns.map(col => col.id);
    const uniqueIds = new Set(columnIds);
    if (uniqueIds.size !== columnIds.length) {
      throw new Error('Duplicate column IDs found');
    }
  }

  private createDatacoreContext(el: HTMLElement, ctx: MarkdownPostProcessorContext): DatacoreContext {
    // Get plugin instance with type assertion
    const plugin = this.plugin as any;
    
    // Check if datacore is available
    if (!plugin.datacoreApi) {
      throw new Error('Datacore API not available. Make sure the Datacore plugin is installed and enabled.');
    }

    return {
      // Datacore API access
      query: async (queryString: string) => {
        try {
          return await plugin.datacoreApi.query(queryString);
        } catch (error) {
          console.error('Datacore query failed:', error);
          throw new Error(`Query failed: ${error.message}`);
        }
      },
      
      refresh: async () => {
        try {
          await plugin.datacoreSync?.refresh();
        } catch (error) {
          console.error('Datacore refresh failed:', error);
        }
      },
      
      // Obsidian vault access
      vault: plugin.app.vault,
      
      // Container and context
      container: el,
      sourcePath: ctx.sourcePath,
      
      // Plugin utilities
      tagUpdater: null, // Will be created by the view
      settings: plugin.settings || {}
    };
  }

  private generateViewId(sourcePath: string, source: string): string {
    // Create a simple hash from source path and configuration
    const content = `${sourcePath}:${source}`;
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `kanban-${Math.abs(hash)}`;
  }

  private setupAutoRefresh(view: DatacoreKanbanView, sourcePath: string, viewId: string): void {
    // Set up file watching for auto-refresh
    const plugin = this.plugin as any;
    
    if (view.getConfig().settings.autoRefresh) {
      // Listen for datacore refresh events
      plugin.registerEvent?.(
        plugin.app.workspace.on('datacore:refresh', () => {
          view.refresh();
        })
      );

      // Listen for file modifications
      plugin.registerEvent?.(
        plugin.app.vault.on('modify', (file) => {
          // Refresh if any markdown file is modified
          if (file.extension === 'md') {
            setTimeout(() => view.refresh(), 500); // Small delay to ensure datacore has processed
          }
        })
      );
    }
  }

  private renderError(el: HTMLElement, message: string): void {
    el.empty();
    el.addClass('datacore-kanban-error');
    
    const errorContainer = el.createEl('div', { cls: 'datacore-error-container' });
    
    errorContainer.createEl('div', { 
      text: '⚠️ Datacore Kanban Error', 
      cls: 'datacore-error-title' 
    });
    
    errorContainer.createEl('div', { 
      text: message, 
      cls: 'datacore-error-message' 
    });
    
    errorContainer.createEl('div', { 
      text: 'Check the configuration syntax and ensure Datacore plugin is enabled.', 
      cls: 'datacore-error-hint' 
    });
  }

  // Public methods for cleanup
  destroyView(viewId: string): void {
    const view = this.activeViews.get(viewId);
    if (view) {
      view.destroy();
      this.activeViews.delete(viewId);
    }
  }

  destroyAllViews(): void {
    this.activeViews.forEach(view => view.destroy());
    this.activeViews.clear();
  }

  getActiveViews(): Map<string, DatacoreKanbanView> {
    return new Map(this.activeViews);
  }

  // Utility method to refresh all views
  async refreshAllViews(): Promise<void> {
    const refreshPromises = Array.from(this.activeViews.values()).map(view => 
      view.refresh().catch(error => 
        console.error('Failed to refresh view:', error)
      )
    );
    
    await Promise.all(refreshPromises);
  }
}