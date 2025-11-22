---
title: Playground Example
description: Interactive code playground demonstration
path: /playground-example
order: 3
---

# Playground Example

This page demonstrates the interactive code playground feature.

## Basic Example

Try editing the code below and see the output update in real-time:

<Playground initialCode={`
// Try editing this code!
const greeting = "Hello, World!";
console.log(greeting);

const sum = (a, b) => a + b;
console.log("2 + 3 =", sum(2, 3));

return "Code executed successfully!";
`} />

## Example with Presets

This playground includes preset examples you can switch between:

<Playground 
  initialCode={`console.log("Select an example from the dropdown!");`}
  presets={[
    {
      name: "Variables",
      code: `const name = "Alice";
const age = 30;
console.log(\`\${name} is \${age} years old\`);`
    },
    {
      name: "Functions",
      code: `function factorial(n) {
  if (n <= 1) return 1;
  return n * factorial(n - 1);
}

console.log("5! =", factorial(5));`
    },
    {
      name: "Arrays",
      code: `const numbers = [1, 2, 3, 4, 5];
const doubled = numbers.map(n => n * 2);
console.log("Original:", numbers);
console.log("Doubled:", doubled);`
    }
  ]}
/>

## Error Handling

The playground handles errors gracefully without crashing the page:

<Playground initialCode={`
// This will throw an error
throw new Error("This is a test error!");
`} />

## Features

- **Real-time preview**: Code changes are debounced and executed automatically
- **Error handling**: Errors are caught and displayed without crashing
- **State preservation**: Your code is saved in session storage
- **Preset examples**: Switch between predefined code examples
- **Console output**: See console.log output in the preview pane
