import { App, PluginSettingTab, Setting } from 'obsidian';
import DatacoreKanbanPlugin from './main';

export class KanbanSettingTab extends PluginSettingTab {
    plugin: DatacoreKanbanPlugin;

    constructor(app: App, plugin: DatacoreKanbanPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty();
        containerEl.createEl('h2', { text: 'Datacore Kanban Settings' });

        // Datacore Query Setting
        new Setting(containerEl)
            .setName('Datacore Query')
            .setDesc('The Datacore query to retrieve tasks')
            .addTextArea(text => text
                .setPlaceholder('@task')
                .setValue(this.plugin.settings.datacoreQuery)
                .onChange(async (value) => {
                    this.plugin.settings.datacoreQuery = value;
                    await this.plugin.saveSettings();
                }));

        // Refresh Interval Setting
        new Setting(containerEl)
            .setName('Refresh Interval (Fallback)')
            .setDesc('Auto-refresh interval in milliseconds. Set to 0 (recommended) to use Datacore\'s intelligent change tracking instead of polling. Only used as fallback when Datacore events fail.')
            .addText(text => text
                .setPlaceholder('0 (use Datacore events)')
                .setValue(this.plugin.settings.refreshInterval.toString())
                .onChange(async (value) => {
                    const interval = parseInt(value);
                    if (!isNaN(interval) && interval >= 0) {
                        this.plugin.settings.refreshInterval = interval;
                        await this.plugin.saveSettings();
                        // Trigger settings change event
                        this.app.workspace.trigger('datacore-kanban:settings-changed');
                    }
                }));

        // Card Max Height Setting
        new Setting(containerEl)
            .setName('Card Maximum Height')
            .setDesc('Maximum height for task cards in pixels (0 for no limit)')
            .addText(text => text
                .setPlaceholder('200')
                .setValue(this.plugin.settings.cardMaxHeight.toString())
                .onChange(async (value) => {
                    const height = parseInt(value);
                    if (!isNaN(height) && height >= 0) {
                        this.plugin.settings.cardMaxHeight = height;
                        await this.plugin.saveSettings();
                    }
                }));

        // Show Due Date Setting
        new Setting(containerEl)
            .setName('Show Due Date')
            .setDesc('Display due dates on task cards')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.showDueDate)
                .onChange(async (value) => {
                    this.plugin.settings.showDueDate = value;
                    await this.plugin.saveSettings();
                }));

        // Show Priority Setting
        new Setting(containerEl)
            .setName('Show Priority')
            .setDesc('Display priority indicators on task cards')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.showPriority)
                .onChange(async (value) => {
                    this.plugin.settings.showPriority = value;
                    await this.plugin.saveSettings();
                }));

        // Show Tags Setting
        new Setting(containerEl)
            .setName('Show Tags')
            .setDesc('Display tags on task cards')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.showTags)
                .onChange(async (value) => {
                    this.plugin.settings.showTags = value;
                    await this.plugin.saveSettings();
                }));

        // View Placement Setting
        new Setting(containerEl)
            .setName('View Placement')
            .setDesc('Choose where to open the Kanban board when clicking the ribbon icon')
            .addDropdown(dropdown => dropdown
                .addOption('main', 'Main Window (Replace current note)')
                .addOption('new-tab', 'New Tab')
                .addOption('right-sidebar', 'Right Sidebar')
                .addOption('left-sidebar', 'Left Sidebar')
                .setValue(this.plugin.settings.viewPlacement)
                .onChange(async (value) => {
                    this.plugin.settings.viewPlacement = value as any;
                    await this.plugin.saveSettings();
                }));

        // Column Configuration
        containerEl.createEl('h3', { text: 'Column Configuration' });
        
        this.plugin.settings.columns.forEach((column, index) => {
            const columnDiv = containerEl.createEl('div', { cls: 'kanban-column-setting' });
            
            columnDiv.createEl('h4', { text: `Column ${index + 1}: ${column.name}` });

            new Setting(columnDiv)
                .setName('Column Name')
                .addText(text => text
                    .setValue(column.name)
                    .onChange(async (value) => {
                        this.plugin.settings.columns[index].name = value;
                        await this.plugin.saveSettings();
                    }));

            new Setting(columnDiv)
                .setName('Status Tag')
                .addText(text => text
                    .setValue(column.tag)
                    .onChange(async (value) => {
                        this.plugin.settings.columns[index].tag = value;
                        await this.plugin.saveSettings();
                    }));

            new Setting(columnDiv)
                .setName('Color')
                .addText(text => text
                    .setValue(column.color)
                    .onChange(async (value) => {
                        this.plugin.settings.columns[index].color = value;
                        await this.plugin.saveSettings();
                    }));
        });
    }
}