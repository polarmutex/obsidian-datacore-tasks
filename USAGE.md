# Datacore Kanban Plugin - Usage Guide

## Overview

The Enhanced Datacore Kanban Plugin provides powerful task management through datacore-native views with drag-and-drop functionality. This implementation includes both traditional Obsidian views and markdown-embedded kanban boards.

## Features

### ✨ Core Features
- **Datacore Native**: Built on datacore views for maximum integration
- **Drag & Drop**: Move tasks between columns with automatic tag updates
- **Markdown Embedding**: Add kanban boards directly in your notes
- **Tasks Plugin Integration**: Full compatibility with Obsidian Tasks plugin
- **Real-time Updates**: Automatic refresh when files change

### 🎯 New in Phase 1 & 2
- **Enhanced Tag Management**: Smart tag replacement and conflict resolution
- **Visual Feedback**: Smooth animations and drop indicators
- **Column Intelligence**: Configurable auto-updates per column
- **Mobile Support**: Touch-friendly drag operations
- **Error Handling**: Robust error recovery and user feedback

## Usage

### 1. Markdown Code Blocks

Add kanban boards directly in your markdown files:

```markdown
# Project Dashboard

```datacore-kanban
query: '@task AND path("Projects/")'
columns:
  - name: "Backlog"
    tag: "#backlog"
    color: "#6c757d"
    autoUpdates:
      completion: "mark-incomplete"
      removeConflictingTags: true
      addCustomTags: []
  - name: "Active"
    tag: "#doing" 
    color: "#0d6efd"
    autoUpdates:
      completion: "mark-incomplete"
      removeConflictingTags: true
      addCustomTags: ["#active"]
      setPriority: "high"
    maxTasks: 3
  - name: "Review"
    tag: "#review"
    color: "#6f42c1"
  - name: "Done"
    tag: "#done"
    color: "#198754"
    completesTask: true
    autoUpdates:
      completion: "mark-complete"
      removeConflictingTags: true
settings:
  dragDrop: true
  autoRefresh: true
  showTaskCount: true
  compactMode: false
```
```

### 2. Simple Configuration

For basic workflows:

```markdown
```datacore-kanban
query: '@task AND !path("Archive/")'
columns:
  - name: "Todo"
    tag: "#todo"
    color: "#fd7e14"
  - name: "Done"
    tag: "#done" 
    color: "#20c997"
    completesTask: true
```
```

### 3. Advanced Configuration

#### Column Configuration Options

```yaml
columns:
  - name: "Column Name"          # Display name
    id: "unique-id"              # Optional unique identifier
    tag: "#status-tag"           # Tag that identifies tasks in this column
    color: "#hex-color"          # Column color
    completesTask: true          # Whether dropping here completes the task
    maxTasks: 5                  # Maximum tasks allowed (optional)
    sortBy: "due"                # Sort order: due, created, priority, alphabetical
    collapsible: true            # Whether column can be collapsed
    autoUpdates:                 # Automatic updates when task is dropped
      completion: "mark-complete"     # mark-complete, mark-incomplete, no-change
      removeConflictingTags: true     # Remove other status tags
      addCustomTags: ["#active"]      # Add additional tags
      setPriority: "high"             # Set priority level
```

#### Settings Options

```yaml
settings:
  dragDrop: true              # Enable drag and drop
  autoRefresh: true           # Auto-refresh on file changes
  showTaskCount: true         # Show task count in column headers
  compactMode: false          # Compact display mode
  animationsEnabled: true     # Enable animations
```

### 4. Query Examples

#### Project-based Tasks
```yaml
query: '@task AND path("Projects/MyProject/")'
```

#### Due Date Filtering
```yaml
query: '@task AND due <= date(today + 7 days)'
```

#### Priority and Status
```yaml
query: '@task AND (priority = "high" OR #urgent) AND !#done'
```

#### Complex Filtering
```yaml
query: '@task AND path("Work/") AND !completed AND (due <= date(today) OR #urgent)'
```

## Drag & Drop Behavior

### Tag Updates
When you drag a task to a new column:
1. **Remove Conflicting Tags**: Old status tags are removed (if enabled)
2. **Add New Status Tag**: Column's status tag is added
3. **Update Completion**: Checkbox state updated based on column settings
4. **Add Custom Tags**: Additional tags specified in column configuration
5. **Set Priority**: Priority level updated if specified

### Visual Feedback
- **Drag Start**: Task card becomes semi-transparent and rotated
- **Drop Zones**: Valid drop areas are highlighted
- **Drop Indicators**: Visual indicators show where task will be placed
- **Success Animation**: Smooth animation on successful drop
- **Error Messages**: Clear feedback if drop fails

### Mobile Support
- **Touch Events**: Full touch support for mobile devices
- **Long Press**: Long press to initiate drag on touch devices
- **Scroll Support**: Automatic scrolling during drag operations

## Commands

### Available Commands
- `Ctrl+Shift+K`: Open Kanban Board (traditional view)
- `Ctrl+Shift+J`: Open JavaScript Kanban Board
- **Refresh All Datacore Kanban Views**: Refresh all embedded views
- **Refresh Kanban Board**: Refresh traditional views

## Integration

### Tasks Plugin
The plugin automatically detects the Tasks plugin and provides enhanced features:
- **Advanced Date Parsing**: Due dates, scheduled dates, start dates
- **Priority Emojis**: ⏫🔼🔽⏬ priority indicators
- **Recurrence Support**: Recurring task patterns
- **Tasks Formatting**: Proper Tasks plugin syntax preservation

### Datacore
Deep integration with Datacore provides:
- **Live Queries**: Real-time task filtering and organization
- **Metadata Access**: Full access to file metadata and properties
- **Event System**: Automatic refresh on datacore index updates
- **Query Language**: Full datacore query syntax support

## Troubleshooting

### Common Issues

#### Tasks Not Appearing
1. Check datacore query syntax
2. Verify file paths in query
3. Ensure tasks have proper checkbox format: `- [ ] Task text`
4. Check if Datacore plugin is enabled and indexed

#### Drag & Drop Not Working
1. Verify `dragDrop: true` in settings
2. Check browser permissions
3. Ensure tasks have proper data attributes
4. Try refreshing the view

#### Tags Not Updating
1. Check file permissions
2. Verify tag format (include # symbol)
3. Ensure no file conflicts or locks
4. Check plugin error logs

#### Performance Issues
1. Limit query scope with path restrictions
2. Use `compactMode: true` for large boards
3. Reduce auto-refresh frequency
4. Consider breaking large boards into smaller ones

### Debug Information
Enable developer console to see detailed logs:
1. Open Developer Tools (F12)
2. Check Console tab for plugin logs
3. Look for Datacore API errors
4. Verify task data structure

## Best Practices

### Query Optimization
- Use path restrictions to limit scope
- Combine multiple conditions efficiently
- Test queries in Datacore view first

### Column Design
- Use clear, distinct status tags
- Limit columns to 3-5 for optimal usability
- Choose contrasting colors for accessibility

### Task Organization
- Use consistent tagging conventions
- Include due dates for time-sensitive tasks
- Group related tasks in same folder/project

### Performance
- Keep boards focused on current work
- Archive completed tasks regularly
- Use separate boards for different projects

## Examples

### Personal Task Management
```yaml
query: '@task AND path("Personal/")'
columns:
  - name: "Inbox"
    tag: "#inbox"
    color: "#6c757d"
  - name: "Today"
    tag: "#today"
    color: "#dc3545"
    maxTasks: 5
  - name: "This Week"
    tag: "#week"
    color: "#fd7e14"
  - name: "Done"
    tag: "#done"
    color: "#198754"
    completesTask: true
```

### Project Sprint Board
```yaml
query: '@task AND path("Projects/Sprint-1/")'
columns:
  - name: "Backlog"
    tag: "#backlog"
    color: "#6c757d"
    sortBy: "priority"
  - name: "In Progress"
    tag: "#doing"
    color: "#0d6efd"
    maxTasks: 3
    autoUpdates:
      removeConflictingTags: true
      addCustomTags: ["#active"]
  - name: "Review"
    tag: "#review"
    color: "#6f42c1"
  - name: "Done"
    tag: "#done"
    color: "#198754"
    completesTask: true
```

This enhanced plugin provides a powerful, flexible task management system that integrates seamlessly with your Obsidian workflow while maintaining the power and flexibility of datacore queries.