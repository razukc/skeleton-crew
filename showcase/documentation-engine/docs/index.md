---
title: Home
description: Welcome to the Documentation Engine - A powerful plugin-driven documentation system
path: /
order: 1
---

# Welcome to Documentation Engine

> **Latest Version (v2.0)** - You are viewing the latest documentation. [View v1.0 docs](/v1.0) for the previous version.

Documentation Engine is a modern, plugin-driven documentation system built on Skeleton Crew Runtime. Transform your markdown files into beautiful, interactive documentation websites with powerful features out of the box.

## Why Documentation Engine?

<Callout type="info" title="Built on Skeleton Crew Runtime">
Documentation Engine showcases the power of Skeleton Crew's plugin architecture, demonstrating how complex applications can be built using simple, composable plugins.
</Callout>

### Key Features

- **📝 Markdown & MDX Support** - Write content in markdown with embedded React components
- **🔍 Full-Text Search** - Fast, client-side search powered by MiniSearch
- **🎨 Syntax Highlighting** - Beautiful code blocks with Prism
- **🌓 Theme Support** - Built-in dark and light themes
- **🎮 Interactive Playgrounds** - Live code editors with real-time preview
- **📱 Responsive Design** - Works perfectly on mobile, tablet, and desktop
- **🚀 Static Site Generation** - Export to static HTML for fast hosting
- **⚡ Build-Time Optimization** - Pre-parse markdown for lightning-fast loads
- **🔌 Plugin Architecture** - Extend with custom plugins

## Quick Start

Get started in minutes:

```bash
# Install dependencies
npm install skeleton-crew-runtime unified remark react react-dom

# Create your first markdown file
echo "# Hello World" > docs/index.md

# Initialize the runtime
npm run dev
```

Check out the [Getting Started Guide](/getting-started) for detailed instructions.

## Example: Hello World

Here's a simple markdown file with frontmatter:

````markdown
---
title: My Page
description: A simple documentation page
path: /my-page
order: 1
---

# My Page

Welcome to my documentation!

## Code Example

```javascript
console.log('Hello, Documentation Engine!');
```
````

## Interactive Components

Documentation Engine supports MDX components for rich, interactive content:

<Callout type="warning" title="Try It Out">
This is a live callout component! You can use these to highlight important information in your documentation.
</Callout>

### Live Code Playground

Try editing this code:

<Playground initialCode={`// Edit this code and see the output!
const greeting = "Hello, Documentation Engine!";
console.log(greeting);

const add = (a, b) => a + b;
console.log("2 + 3 =", add(2, 3));

return "✨ Code executed successfully!";
`} />

## Architecture

Documentation Engine is built on a plugin architecture:

```
┌─────────────────────────────────────┐
│     Skeleton Crew Runtime           │
├─────────────────────────────────────┤
│  Plugins:                           │
│  • Router       • Markdown Parser   │
│  • Search       • Syntax Highlight  │
│  • Theme        • Playground        │
│  • Versioning   • Cache             │
│  • Static Export                    │
└─────────────────────────────────────┘
```

Each plugin is independent and composable, making it easy to customize or extend functionality.

## Documentation Structure

Explore the documentation:

- **[Getting Started](/getting-started)** - Installation and setup guide
- **[Build System](/build-system)** - Understanding hot reload and build process
- **[Plugin Development](/guides/plugins)** - Learn to create custom plugins
- **[API Reference](/api/runtime)** - Complete API documentation
- **[Playground Examples](/playground-example)** - Interactive code examples
- **[Callout Examples](/callout-example)** - Component showcase

## Code Examples

Documentation Engine supports syntax highlighting for many languages:

### JavaScript

```javascript
// Async/await example
async function fetchUser(id) {
  const response = await fetch(`/api/users/${id}`);
  return response.json();
}

fetchUser(123).then(user => console.log(user));
```

### TypeScript

```typescript
interface User {
  id: number;
  name: string;
  email: string;
}

function greetUser(user: User): string {
  return `Hello, ${user.name}!`;
}
```

### Python

```python
# List comprehension example
squares = [x**2 for x in range(10)]
print(squares)

# Function with type hints
def fibonacci(n: int) -> int:
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)
```

### Rust

```rust
// Pattern matching example
fn describe_number(n: i32) -> &'static str {
    match n {
        0 => "zero",
        1..=10 => "small",
        11..=100 => "medium",
        _ => "large",
    }
}
```

## Next Steps

Ready to dive deeper?

1. **[Get Started](/getting-started)** - Set up your first documentation site
2. **[Learn Plugins](/guides/plugins)** - Understand the plugin system
3. **[Explore API](/api/runtime)** - Dive into the technical details

<Callout type="info" title="Open Source">
Documentation Engine is built with open source technologies and demonstrates best practices for plugin-driven architecture.
</Callout>

---

**Built with ❤️ using Skeleton Crew Runtime**
