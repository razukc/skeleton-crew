# Tab Manager Extension - Visual Guide

This guide describes the visual appearance of the Tab Manager extension after styling implementation.

## Overall Layout

```
┌─────────────────────────────────────────┐
│  Tab Manager                    [Header]│ ← Purple gradient
├─────────────────────────────────────────┤
│  🔍 Search tabs...              [×]     │ ← Search bar
├─────────────────────────────────────────┤
│  [📁 Create Group] [🔍 Find Duplicates] │ ← Action buttons
│  [💾 Save Session]                      │
├─────────────────────────────────────────┤
│  Tabs (15)                              │
│  ┌───────────────────────────────────┐ │
│  │ 🌐 Google                    [×]  │ │ ← Tab items
│  │    https://google.com            │ │
│  ├───────────────────────────────────┤ │
│  │ 🌐 GitHub                    [×]  │ │
│  │    https://github.com            │ │
│  └───────────────────────────────────┘ │
├─────────────────────────────────────────┤
│  Saved Sessions          [+ Save Session]│
│  ┌───────────────────────────────────┐ │
│  │ Work Session                      │ │ ← Session items
│  │ 2h ago • 12 tabs                  │ │
│  │              [Restore] [Delete]   │ │
│  └───────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

## Component Details

### Header
- **Background**: Purple gradient (#667eea → #764ba2)
- **Text**: White, 18px, bold
- **Padding**: 16px
- **Shadow**: Subtle drop shadow

### Search Bar
- **Border**: 2px solid gray (#e0e0e0)
- **Focus**: Blue border (#667eea) with glow
- **Clear Button**: Appears when text is entered
- **Placeholder**: "Search tabs..."
- **Transitions**: Smooth border and shadow changes

### Action Buttons
- **Style**: Purple gradient background
- **Layout**: Icon + label
- **States**:
  - Normal: Gradient with shadow
  - Hover: Lifts up (-1px) with larger shadow
  - Active: Returns to normal position
  - Disabled: 50% opacity
- **Icons**: Emoji icons (📁, 🔍, 💾)
- **Badge**: Red circle for selected count

### Tab List
- **Container**: White background, rounded corners
- **Items**:
  - Background: Light gray (#f9f9f9)
  - Border: 1px solid #e0e0e0
  - Padding: 10px 12px
  - Hover: Darker gray with shadow
  - Active: Blue tint (#e8eeff)
- **Favicon**: 16x16px, left side
- **Title**: Bold, 13px, truncated with ellipsis
- **URL**: Gray, 11px, truncated with ellipsis
- **Close Button**: 
  - Hidden by default
  - Appears on hover
  - Red on hover
- **Scrollbar**: Custom styled, 6px wide

### Tab Groups
- **Header**: 
  - Light gray background
  - Colored left border (3px)
  - Group name + count
- **Items**: Indented 12px from left

### Session Manager
- **Header**: Title + Save button
- **Save Dialog**:
  - Input field with border
  - Save/Cancel buttons
  - Appears when clicking "+ Save Session"
- **Session Items**:
  - Name: Bold, 13px
  - Metadata: Date + tab count, 11px gray
  - Actions: Restore (blue) and Delete (gray→red on hover)
- **Empty State**: Centered message

### Error Banner
- **Background**: Light red (#fee)
- **Border**: 4px red left border
- **Icon**: Warning emoji (⚠️)
- **Close**: × button on right

### Loading States
- **Spinner**: Rotating hourglass emoji (⏳)
- **Text**: "Loading Tab Manager..."

## Color Usage

### Primary Colors
- **Purple Gradient**: Buttons, header
- **Blue**: Active states, focus rings
- **Red**: Errors, delete actions
- **Gray Scale**: Backgrounds, borders, text

### Semantic Colors
- **Success**: Green (future use)
- **Warning**: Orange (future use)
- **Error**: Red (#d32f2f)
- **Info**: Blue (#667eea)

## Typography Scale

```
18px - Header title
14px - Section titles, body text
13px - Tab titles, button labels
12px - Session save button
11px - Tab URLs, session metadata
```

## Spacing System

```
4px  - Minimal gap
6px  - Small gap
8px  - Medium gap
10px - Standard padding
12px - Section padding
16px - Large padding
20px - Extra large padding
```

## Interactive States

### Buttons
1. **Normal**: Gradient, shadow
2. **Hover**: Lift (-1px), larger shadow
3. **Active**: Return to normal
4. **Disabled**: 50% opacity, no pointer

### Inputs
1. **Normal**: Gray border
2. **Focus**: Blue border + glow
3. **Error**: Red border

### List Items
1. **Normal**: Light gray background
2. **Hover**: Darker gray + shadow
3. **Active**: Blue tint
4. **Selected**: (future) Checkbox + highlight

## Responsive Behavior

### 400x600 (Standard)
- All features visible
- Optimal spacing
- Tab list: 300px max height
- Session list: 200px max height

### < 400px (Narrow)
- Buttons stack vertically
- Smaller fonts
- Reduced padding
- Tab list: 250px max height

### > 700px (Tall)
- More tabs visible
- Tab list: 400px max height
- Session list: 250px max height

### < 300px (Minimum)
- Minimal layout
- Smallest fonts
- Essential features only

## Animations

### Transitions (0.2s)
- Background colors
- Border colors
- Box shadows
- Transform (position)
- Opacity

### Keyframe Animations
- Spinner rotation (1s linear infinite)

## Accessibility Features

- Focus visible on all interactive elements
- ARIA labels on buttons
- Proper heading hierarchy
- Sufficient color contrast
- Keyboard navigation support
- Screen reader friendly structure

## Browser Compatibility

- Chrome/Edge: Full support
- Firefox: Full support (no tab groups)
- Opera: Full support
- Brave: Full support

## Performance Considerations

- CSS-only animations (no JavaScript)
- Hardware-accelerated transforms
- Minimal repaints
- Efficient selectors
- No large images
- Optimized scrolling

## Testing Checklist

Visual testing should verify:

- [ ] Header displays correctly
- [ ] Search bar is functional and styled
- [ ] Action buttons have proper hover states
- [ ] Tab list scrolls smoothly
- [ ] Tab items show/hide close button on hover
- [ ] Active tab is highlighted
- [ ] Session list displays correctly
- [ ] Session save dialog works
- [ ] Error banner appears and dismisses
- [ ] Loading spinner animates
- [ ] Responsive layout works at all sizes
- [ ] Icons display in browser toolbar
- [ ] All colors match design
- [ ] Typography is consistent
- [ ] Spacing is uniform

## Known Limitations

1. Icons are placeholders (1x1 PNG)
2. No dark mode support yet
3. No custom theme support
4. Limited animation variety
5. No drag-and-drop support

## Future Visual Enhancements

1. **Dark Mode**: Complete dark theme
2. **Themes**: Multiple color schemes
3. **Animations**: More sophisticated transitions
4. **Icons**: Custom SVG icon set
5. **Illustrations**: Empty state illustrations
6. **Gradients**: More gradient variations
7. **Shadows**: Depth system with multiple levels
8. **Micro-interactions**: Subtle feedback animations
9. **Loading**: Skeleton screens
10. **Tooltips**: Helpful hover tooltips

---

The visual design prioritizes clarity, consistency, and usability while maintaining a modern, polished appearance.
