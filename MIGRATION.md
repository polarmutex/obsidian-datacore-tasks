# Migration Guide: TypeScript to JavaScript Kanban Views

This guide helps you migrate from the legacy TypeScript Kanban implementation to the new JavaScript view powered by Datacore's native view system.

## What's New in the JavaScript View

### Performance Improvements
- **Faster Rendering**: Native Datacore integration eliminates unnecessary overhead
- **Real-time Updates**: Direct integration with Datacore's reactive system
- **Memory Efficiency**: Optimized component lifecycle and state management

### Enhanced Features
- **Advanced Search**: Full-text search across task content, file names, and tags
- **Smart Filtering**: Filter by status, due dates, and custom criteria
- **Bulk Operations**: Select multiple tasks for batch operations
- **Keyboard Shortcuts**: Full keyboard navigation and shortcuts
- **Responsive Design**: Better mobile and tablet support

### Developer Experience
- **Modern Architecture**: React-like JSX components with Datacore's state management
- **Better Testing**: Improved testability with component isolation
- **Extensibility**: Easier to extend with custom features

## Migration Steps

### 1. Switch to JavaScript View

#### Via Command Palette
1. Open Command Palette (`Ctrl+P` / `Cmd+P`)
2. Type "Open JavaScript Kanban Board"
3. Select the command

#### Via Keyboard Shortcut
- Use `Ctrl+Shift+J` / `Cmd+Shift+J` to open the JavaScript view

#### Via Settings
1. Open plugin settings
2. Set "Default View Type" to "JavaScript"
3. Use the regular kanban command

### 2. Verify Your Settings

Your existing settings will work with the JavaScript view, but you may want to review:

- **Column Configuration**: Tags and colors are preserved
- **Display Options**: Task metadata preferences are maintained
- **Query Settings**: Datacore queries work the same way

### 3. Test Your Workflow

1. **Drag and Drop**: Verify task movement between columns
2. **File Integration**: Test opening tasks in their source files
3. **Search and Filter**: Try the new search and filtering capabilities
4. **Keyboard Shortcuts**: Learn the new shortcuts (see below)

## New Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+F` / `Cmd+F` | Focus search input |
| `Ctrl+A` / `Cmd+A` | Select all visible tasks |
| `Enter` | Complete selected tasks |
| `Delete` | Delete selected tasks |
| `Escape` | Clear search and selection |
| `Ctrl+Click` / `Cmd+Click` | Toggle task selection |

## Feature Comparison

| Feature | Legacy TypeScript | New JavaScript |
|---------|------------------|----------------|
| Basic kanban board | ✅ | ✅ |
| Drag and drop | ✅ | ✅ |
| Datacore integration | ✅ | ✅✅ (Native) |
| Search functionality | ❌ | ✅ |
| Advanced filtering | ❌ | ✅ |
| Bulk operations | ❌ | ✅ |
| Keyboard shortcuts | Basic | Full |
| Mobile support | Limited | ✅ |
| Performance | Good | Excellent |
| Real-time updates | Basic | Advanced |

## Troubleshooting

### JavaScript View Not Loading

1. **Check Datacore Plugin**: Ensure Datacore plugin is installed and enabled
2. **Update Datacore**: Make sure you have Datacore v0.12.0 or later
3. **Restart Obsidian**: Try restarting Obsidian if the view doesn't load

### Tasks Not Appearing

1. **Verify Query**: Check that your Datacore query is valid
2. **Check File Format**: Ensure tasks use proper markdown format (`- [ ]` or `- [x]`)
3. **Refresh View**: Use the refresh button or `Ctrl+R`

### Performance Issues

1. **Large Datasets**: For >1000 tasks, consider filtering your query
2. **Complex Queries**: Simplify Datacore queries for better performance
3. **Memory Usage**: Close other heavy plugins if needed

### Migration Issues

1. **Settings Not Preserved**: Manually reconfigure if automatic migration fails
2. **Custom CSS**: Update CSS selectors for the new view structure
3. **Plugin Conflicts**: Disable other kanban plugins temporarily

## Deprecation Timeline

- **Current**: Both views available, JavaScript recommended
- **Next Minor Version**: Legacy view shows deprecation warnings
- **Next Major Version**: Legacy view removed entirely

## Getting Help

### Resources
- Plugin Documentation: See README.md
- Datacore Documentation: [Datacore Docs](https://blacksmithgu.github.io/datacore/)
- Issue Tracker: [GitHub Issues](https://github.com/polarmutex/obsidian-datacore-tasks/issues)

### Common Issues
1. Check the browser console for error messages
2. Verify Datacore plugin compatibility
3. Test with a simple query first (`@task`)

### Reporting Bugs
When reporting issues with the JavaScript view:
1. Include your Datacore query
2. Provide browser console logs
3. Mention your Obsidian and Datacore versions
4. Include steps to reproduce the issue

## Advanced Configuration

### Custom Styling
The JavaScript view uses CSS custom properties for theming:

```css
.js-kanban-view-container {
  --kanban-column-width: 300px;
  --kanban-card-spacing: 8px;
  --kanban-border-radius: 6px;
}
```

### Performance Tuning
For large vaults, optimize with:

```javascript
// Limit query results
@task LIMIT 500

// Add specific filters
@task WHERE !completed AND file.folder = "Projects"

// Use indexed fields
@task WHERE due >= date(today)
```

### Custom Columns
Configure advanced column setups:

```json
{
  "columns": [
    {
      "id": "backlog",
      "name": "Backlog",
      "tag": "#backlog",
      "color": "#6c757d"
    },
    {
      "id": "sprint",
      "name": "Sprint",
      "tag": "#sprint",
      "color": "#007bff"
    },
    {
      "id": "review",
      "name": "Review",
      "tag": "#review",
      "color": "#ffc107"
    },
    {
      "id": "done",
      "name": "Done",
      "tag": "#done",
      "color": "#28a745"
    }
  ]
}
```

This migration guide will help you transition smoothly to the new JavaScript view while taking advantage of its enhanced capabilities.