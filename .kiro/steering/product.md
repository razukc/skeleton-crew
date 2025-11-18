# Product Overview

Skeleton Crew Runtime is a minimal, plugin-based application runtime for building internal tools and modular applications.

## Core Concept

The runtime provides three core subsystems (Screen Registry, Action Engine, Plugin System) and one optional subsystem (UI Bridge) that work together to enable extensible, plugin-driven applications without imposing UI framework requirements.

## Key Principles

- **UI-Agnostic**: No built-in UI, no framework dependencies (React, Vue, etc.)
- **Plugin-Driven**: All functionality extends through plugins
- **Minimal Core**: Only essential primitives (screens, actions, plugins)
- **Environment-Neutral**: Works in browser, Node.js, or any JavaScript runtime

## What It Does

- Registers and manages screen definitions
- Executes actions with parameter routing
- Loads and coordinates plugins
- Optionally integrates UI renderers as plugins

## What It Doesn't Do

- No built-in navigation, routing, or state management
- No theming, styling, or layout systems
- No opinionated data layer
- No UI component library
