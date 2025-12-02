# Documentation Engine - Project Structure

## Overview

This directory contains the Documentation Engine demo application built on Skeleton Crew Runtime. The project demonstrates how to build a full-featured, plugin-driven documentation website using the runtime's core capabilities.

## Directory Structure

```
demo/documentation-engine/
├── src/                          # Source code
│   ├── plugins/                  # Documentation engine plugins
│   │   ├── router/              # URL routing and navigation
│   │   ├── markdown/            # Markdown/MDX parsing
│   │   ├── component-registry/  # MDX component management
│   │   ├── react-ui/            # React UI provider
│   │   ├── sidebar/             # Navigation tree
│   │   ├── search/              # Full-text search
│   │   ├── code-block/          # Syntax highlighting
│   │   ├── theme/               # Light/dark mode
│   │   ├── playground/          # Live code examples
│   │   ├── versioning/          # Multi-version support
│   │   ├── cache/               # Performance optimization
│   │   └── static-export/       # HTML generation
│   ├── components/              # React UI components
│   │   ├── Layout.tsx           # Main layout
│   │   ├── Sidebar.tsx          # Navigation sidebar
│   │   ├── SearchBar.tsx        # Search interface
│   │   ├── ThemeToggle.tsx      # Theme switcher
│   │   ├── MarkdownPage.tsx     # Markdown renderer
│   │   ├── CodeBlock.tsx        # Code block component
│   │   ├── Callout.tsx          # Callout boxes
│   │   └── Playground.tsx       # Live playground
│   ├── ui/                      # UI provider implementations
│   └── index.tsx                # Main entry point
├── docs/                        # Markdown documentation files
│   ├── index.md                 # Homepage
│   ├── getting-started.md       # Getting started guide
│   ├── guides/                  # User guides
│   ├── api/                     # API reference
│   └── examples/                # Example code
├── tests/                       # Test files
│   ├── unit/                    # Unit tests
│   ├── property/                # Property-based tests
│   └── integration/             # Integration tests
├── public/                      # Static assets
├── dist/                        # Build output
├── index.html                   # HTML entry point
├── package.json                 # Dependencies and scripts
├── tsconfig.json                # TypeScript configuration
├── vite.config.ts               # Vite build configuration
└── README.MD                    # Project documentation
```

## Key Files

### Configuration Files

- **package.json** - Project dependencies and npm scripts
- **tsconfig.json** - TypeScript compiler configuration
- **vite.config.ts** - Vite bundler and test configuration
- **.gitignore** - Git ignore patterns

### Source Files

- **src/index.tsx** - Main application entry point
- **src/plugins/** - Plugin implementations
- **src/components/** - React UI components
- **tests/setup.ts** - Test environment setup

## Dependencies

### Core Dependencies

- **unified** - Markdown processing pipeline
- **remark-parse** - Markdown parser
- **remark-frontmatter** - Frontmatter support
- **remark-mdx** - MDX support
- **remark-gfm** - GitHub Flavored Markdown
- **react** - UI framework
- **react-dom** - React DOM renderer
- **minisearch** - Client-side search
- **prismjs** - Syntax highlighting

### Development Dependencies

- **typescript** - TypeScript compiler
- **vite** - Build tool and dev server
- **vitest** - Test framework
- **fast-check** - Property-based testing
- **@testing-library/react** - React testing utilities
- **@vitejs/plugin-react** - Vite React plugin

## Available Scripts

```bash
# Development
npm run dev              # Start dev server at http://localhost:3000

# Building
npm run build            # Build for production
npm run preview          # Preview production build

# Testing
npm test                 # Run all tests once
npm run test:watch       # Run tests in watch mode
npm run test:ci          # Run tests with coverage

# Export
npm run export           # Generate static HTML files
```

## Next Steps

1. Implement core plugins (Router, Markdown, Component Registry, React UI)
2. Implement feature plugins (Sidebar, Search, Code Block, Theme, etc.)
3. Create sample documentation content
4. Write tests for each plugin
5. Build and deploy

## Architecture

The Documentation Engine follows a plugin-driven architecture:

1. **Runtime** - Skeleton Crew Runtime orchestrates all plugins
2. **Core Plugins** - Essential functionality (Router, Markdown, UI)
3. **Feature Plugins** - Enhanced capabilities (Search, Theme, etc.)
4. **Content Layer** - Markdown/MDX files become documentation pages

See the [Design Document](../../.kiro/specs/documentation-engine/design.md) for detailed architecture information.
