# Obsidian Datacore Kanban Plugin

A dynamic kanban board plugin for Obsidian that integrates with Datacore queries and the Tasks plugin to provide a visual task management interface.

## Features

### Core Functionality
- 🎯 **Dynamic Kanban Board**: Auto-populated from Datacore queries
- 🏷️ **Tag-Based Columns**: Organize tasks by status tags (#todo, #doing, #waiting, #done)
- 🎨 **Drag & Drop**: Move tasks between columns by dragging cards
- 🔄 **Auto-Sync**: Tags automatically update when cards are moved
- 📱 **Mobile Friendly**: Responsive design for mobile and desktop
- ⚙️ **Configurable**: Customizable columns, colors, and queries
- 🔗 **Tasks Plugin Integration**: Compatible with Tasks plugin format

### Advanced Features (JavaScript View)
- 🔍 **Advanced Search**: Full-text search across tasks, files, and tags
- 🎛️ **Smart Filtering**: Filter by status, due dates, and custom criteria
- ✅ **Bulk Operations**: Select and modify multiple tasks at once
- ⌨️ **Keyboard Shortcuts**: Full keyboard navigation and control
- ⚡ **Real-time Updates**: Native Datacore integration for instant updates
- 🎨 **Enhanced UI**: Modern interface with improved accessibility

## Requirements

- Obsidian v0.15.0 or higher
- [Datacore plugin](https://github.com/blacksmithgu/datacore) v0.12.0+ (required)
- [Tasks plugin](https://github.com/obsidian-tasks-group/obsidian-tasks) (recommended)
- Node.js 20+ and npm (for development)

## Installation

### Manual Installation

1. Download the latest release from the [releases page](https://github.com/yourusername/obsidian-datacore-kanban/releases)
2. Extract the files to your vault's plugins folder: `.obsidian/plugins/obsidian-datacore-kanban/`
3. Reload Obsidian and enable the plugin in Settings → Community Plugins

### Development Installation

1. Clone this repository into your vault's plugins folder
2. Install dependencies: `npm install`
3. Build the plugin: `npm run build`
4. Enable the plugin in Obsidian

**Note**: The plugin now uses official packages:
- `@blacksmithgu/datacore` for official Datacore API integration
- `obsidian-typings` for enhanced type safety

### Using Nix (Development)

1. Ensure you have Nix with flakes enabled
2. Enter the development environment: `nix develop`
3. Install dependencies and start development: `npm run dev`

## Usage

### Opening the Kanban Board

#### JavaScript View (Recommended)
- **Command**: "Open JavaScript Kanban Board"
- **Shortcut**: `Ctrl+Shift+J` / `Cmd+Shift+J`
- Native Datacore integration with enhanced features

#### Legacy TypeScript View
- **Command**: "Open Kanban Board" 
- **Shortcut**: `Ctrl+Shift+K` / `Cmd+Shift+K`
- Classic implementation (deprecated)

The board will open in the main workspace by default (configurable in settings).

### Configuring Columns

Go to Settings → Datacore Kanban to configure:

- **Column names and colors**
- **Status tags** for each column
- **Datacore query** to fetch tasks
- **Display options** (due dates, priorities, tags)
- **Refresh interval**

### Task Format

Tasks should be in markdown format with status tags:

```markdown
- [ ] Complete project documentation #todo #work
- [ ] Review pull request #doing #development  
- [ ] Deploy to production #waiting #deployment
- [x] Fix bug in authentication #done #bugfix
```

### Default Columns

- **To Do** (#todo) - Red
- **In Progress** (#doing) - Teal  
- **Waiting** (#waiting) - Yellow
- **Done** (#done) - Blue

### JavaScript View Features

#### Search and Filtering
- **Global Search**: Search across task text, file names, and tags
- **Status Filters**: Show only completed, pending, overdue, or due today
- **Combined Filters**: Use search and filters together

#### Bulk Operations
1. **Select Tasks**: Use checkboxes or Ctrl+Click
2. **Select All**: `Ctrl+A` / `Cmd+A` for all visible tasks
3. **Bulk Actions**: Complete, uncomplete, or delete selected tasks

#### Keyboard Shortcuts
| Shortcut | Action |
|----------|--------|
| `Ctrl+F` / `Cmd+F` | Focus search |
| `Ctrl+A` / `Cmd+A` | Select all visible |
| `Enter` | Complete selected |
| `Delete` | Delete selected |
| `Escape` | Clear search/selection |

## Configuration

### Datacore Query

The default query fetches all tasks:

```datacore
@task
```

You can customize this query to:
- Filter by tags: `@task and #work`
- Filter incomplete tasks: `@task and $completed = false`
- Include specific paths: `@task and path("Projects")`

### Settings Options

| Setting | Description | Default |
|---------|-------------|---------|
| Datacore Query | Query to fetch tasks | Default table query |
| Refresh Interval | Auto-refresh frequency (ms) | 5000 |
| Card Max Height | Maximum card height (px) | 200 |
| Show Due Date | Display due dates on cards | true |
| Show Priority | Display priority indicators | true |
| Show Tags | Display tags on cards | true |

## Development

### Prerequisites

- Node.js 20+
- npm
- Obsidian for testing

### Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/obsidian-datacore-kanban.git
cd obsidian-datacore-kanban

# Install dependencies
npm install

# Start development mode
npm run dev
```

### Build Commands

```bash
npm run dev      # Watch mode for development
npm run build    # Production build
npm run lint     # Code linting
npm run check    # TypeScript type checking
npm run clean    # Clean build artifacts
```

### Project Structure

```
src/
├── main.ts           # Plugin entry point
├── KanbanView.ts     # Main kanban view component
├── KanbanBoard.ts    # Board logic and rendering
├── TaskCard.ts       # Individual task card component
├── DatacoreSync.ts   # Datacore integration
├── TagManager.ts     # Tag management system
├── Settings.ts       # Plugin settings interface
└── SettingTab.ts     # Settings UI
```

## Troubleshooting

### Plugin Not Loading

1. Ensure Datacore plugin is installed and enabled
2. Check that the plugin files are in the correct directory
3. Reload Obsidian and check the console for errors

### Tasks Not Appearing

1. Verify your Datacore query syntax
2. Check that tasks have the expected format
3. Ensure status tags match column configuration
4. Try refreshing the board manually

### Drag & Drop Not Working

1. Ensure JavaScript is enabled
2. Try refreshing the board
3. Check browser console for errors
4. Verify file permissions for task files

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) for details.

## Support

- 📝 [Issues](https://github.com/yourusername/obsidian-datacore-kanban/issues)
- 💬 [Discussions](https://github.com/yourusername/obsidian-datacore-kanban/discussions)
- 💖 [Sponsor](https://github.com/sponsors/yourusername)

## Acknowledgments

- [Datacore](https://github.com/blacksmithgu/datacore) for the powerful query engine
- [Tasks](https://github.com/obsidian-tasks-group/obsidian-tasks) for task management inspiration
- [Obsidian](https://obsidian.md) for the amazing platform