# Obsidian Datacore Kanban Plugin - Web Reference

This plugin provides a dynamic kanban board for Obsidian that integrates with Datacore queries and the Tasks plugin.

## Web Resources & Documentation

### Plugin Information

- **Plugin ID**: `obsidian-datacore-kanban`
- **Name**: Datacore Kanban Board
- **Version**: 1.0.0
- **Author**: Brian Ryall
- **Author URL**: https://github.com/polarmutex
- **Funding URL**: https://github.com/sponsors/polarmutex

### Dependencies & External Links

#### Required Dependencies

- **Datacore Plugin**: https://github.com/blacksmithgu/datacore
  - Version: v0.12.0+
  - Purpose: Provides powerful query engine for task retrieval
  - API Package: `@blacksmithgu/datacore@^0.1.24`

#### Recommended Dependencies

- **Tasks Plugin**: https://github.com/obsidian-tasks-group/obsidian-tasks
  - Purpose: Enhanced task management and formatting
  - Compatible with Tasks plugin syntax

#### Platform Requirements

- **Obsidian**: https://obsidian.md
  - Minimum Version: v0.15.0
  - Supports both desktop and mobile

### Development Resources

#### Package Manager

- **Node.js**: https://nodejs.org
  - Version: 20+
  - Used for: Development environment and build process

#### Build System

- **esbuild**: https://esbuild.github.io
  - Purpose: Fast TypeScript/JavaScript bundler
  - Configuration: `esbuild.config.mjs`

#### Development Environment

- **Nix Flakes**: https://nixos.wiki/wiki/Flakes
  - Purpose: Reproducible development environment
  - Configuration: `flake.nix`

### API Integration Points

#### Datacore API

- **Query Interface**: Uses `@blacksmithgu/datacore` package
- **Event System**: Listens to Datacore index updates
- **Query Language**: Supports Datacore query syntax (`@task`, custom queries)
- **Query Docs**: https://blacksmithgu.github.io/datacore/data/query
- **Fields Docs**: https://blacksmithgu.github.io/datacore/data/fields
- **Pages Docs**: https://blacksmithgu.github.io/datacore/data/pages
- **Sections Docs**: https://blacksmithgu.github.io/datacore/data/sections
- **Blocks Docs**: https://blacksmithgu.github.io/datacore/data/blocks
- **Javascript Views Docs**: https://blacksmithgu.github.io/datacore/code-views
- **Codeblock api Docs**: https://blacksmithgu.github.io/datacore/code-views/local-api
- **List Views Docs**: https://blacksmithgu.github.io/datacore/code-views/list
- **Data Arrays Docs**: https://blacksmithgu.github.io/datacore/code-views/data-array
- **Expressions Docs**: https://blacksmithgu.github.io/datacore/expressions
- **Functions Docs**: https://blacksmithgu.github.io/datacore/expressions/functions

#### Obsidian API

- **Plugin API**: Standard Obsidian plugin architecture
- **Workspace API**: View management and leaf handling
- **Vault API**: File system integration for task files

### Development & Contribution

#### Build Process

```bash
npm install    # Install dependencies
npm run build  # Production build
npm run dev    # Development mode
npm test       # Run test suite
```

#### Testing

- **Unit Tests**: Jest-based testing framework
- **Integration Tests**: Real Datacore API testing
- **Mock System**: Comprehensive mocking for isolated testing

This plugin demonstrates effective integration between Obsidian's plugin ecosystem and external data processing libraries, providing a seamless task management experience through web-based query languages and real-time updates.
