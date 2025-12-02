---
title: Callout Example
description: This page demonstrates the Callout component with different types.
path: /callout-example
order: 4
---
# Callout Component Example



## Info Callout

<Callout type="info" title="Information">
This is an informational callout. Use it to provide helpful tips or additional context.
</Callout>

## Warning Callout

<Callout type="warning" title="Warning">
This is a warning callout. Use it to alert users about potential issues or important considerations.
</Callout>

## Error Callout

<Callout type="error" title="Error">
This is an error callout. Use it to highlight critical issues or errors that need immediate attention.
</Callout>

## Callout Without Title

<Callout type="info">
You can also use callouts without a title. The icon will still be displayed based on the type.
</Callout>

## Usage in MDX

To use the Callout component in your markdown files, simply use the following syntax:

```mdx
<Callout type="info" title="Optional Title">
Your content here
</Callout>
```

Available types:
- `info` - Blue styling with info icon (ℹ️)
- `warning` - Yellow styling with warning icon (⚠️)
- `error` - Red styling with error icon (❌)
