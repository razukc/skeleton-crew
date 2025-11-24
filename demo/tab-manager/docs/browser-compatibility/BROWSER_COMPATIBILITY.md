# Browser Compatibility Quick Reference

## Supported Browsers

| Browser | Version | Support Level | Tab Groups |
|---------|---------|---------------|------------|
| Chrome | 88+ | Full | ✓ |
| Edge | 88+ | Full | ✓ |
| Firefox | 109+ | Full (no groups) | ✗ |
| Opera | 74+ | Full | ✓ |
| Brave | Latest | Full | ✓ |

## Building for Different Browsers

### Chrome/Edge/Opera/Brave
```bash
npm run build:chrome
# Output: dist-chrome/
```

### Firefox
```bash
npm run build:firefox
# Output: dist-firefox/
```

### Both
```bash
npm run build:all
# Output: dist-chrome/ and dist-firefox/
```

## Packaging for Distribution

### Chrome Web Store
```bash
npm run package:chrome
# Creates: tab-manager-chrome.zip
```

### Firefox Add-ons
```bash
npm run package:firefox
# Creates: tab-manager-firefox.zip
```

## Key Differences

### Manifest

| Feature | Chrome | Firefox |
|---------|--------|---------|
| Popup | `action` | `browser_action` |
| Background | `service_worker` | `scripts` |
| Permissions | `tabs`, `storage`, `tabGroups` | `tabs`, `storage` |
| Browser Settings | Not needed | `browser_specific_settings.gecko` |

### API Usage

```typescript
// Browser detection (automatic)
import { browserAPI, features } from './utils/browser-adapter.js';

// Check browser type
if (features.isChrome) { /* Chrome-specific */ }
if (features.isFirefox) { /* Firefox-specific */ }

// Check feature support
if (features.tabGroups) { /* Use tab groups */ }
```

### Feature Detection in Plugins

```typescript
export const myPlugin = {
  setup(context) {
    // Check if feature is available
    if (!hasTabGroups()) {
      return; // Skip registration
    }
    
    // Register actions only if supported
    context.actions.registerAction({ /* ... */ });
  }
};
```

### UI Conditional Rendering

```typescript
// Detect at runtime
const hasGroups = typeof chrome.tabGroups !== 'undefined';

// Conditionally render
{hasGroups && <GroupButton />}
```

## Testing

### Load in Chrome
1. Navigate to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select `dist-chrome/` directory

### Load in Firefox
1. Navigate to `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on..."
3. Select `dist-firefox/manifest.json`

### Load in Edge
1. Navigate to `edge://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select `dist-chrome/` directory (same as Chrome)

## Common Issues

### Issue: Extension doesn't load in Firefox
**Solution:** Check Firefox version (must be 109+), verify manifest syntax

### Issue: Tab groups not working in Firefox
**Expected:** Tab groups are not supported in Firefox. The feature is hidden.

### Issue: Build fails
**Solution:** 
```bash
# Clean and rebuild
rm -rf dist-chrome dist-firefox node_modules
npm install
npm run build:all
```

## Development Workflow

### 1. Make Changes
Edit source files in `src/`

### 2. Build
```bash
npm run build:chrome  # For Chrome testing
# or
npm run build:firefox # For Firefox testing
```

### 3. Reload Extension
- Chrome: Click reload button on `chrome://extensions/`
- Firefox: Click "Reload" on `about:debugging`

### 4. Test
Open extension popup and test functionality

## Browser-Specific Code

### Avoid
```typescript
// DON'T: Direct browser API access
chrome.tabs.query({}, (tabs) => { /* ... */ });
```

### Prefer
```typescript
// DO: Use browser adapter
import { tabs } from './utils/browser-adapter.js';
const allTabs = await tabs.query({});
```

## Feature Flags

The extension automatically detects browser capabilities:

```typescript
import { features } from './utils/browser-adapter.js';

console.log(features);
// {
//   tabGroups: true/false,
//   sessions: true/false,
//   alarms: true/false,
//   isChrome: true/false,
//   isFirefox: true/false,
//   isEdge: true/false
// }
```

## Distribution Checklist

### Before Publishing

- [ ] Test in target browser
- [ ] Verify all features work
- [ ] Check console for errors
- [ ] Test with 100+ tabs
- [ ] Verify icons display correctly
- [ ] Test session save/restore
- [ ] Test duplicate detection
- [ ] Review manifest permissions

### Chrome Web Store
- [ ] Build: `npm run package:chrome`
- [ ] Upload `tab-manager-chrome.zip`
- [ ] Fill store listing
- [ ] Submit for review

### Firefox Add-ons
- [ ] Build: `npm run package:firefox`
- [ ] Upload `tab-manager-firefox.zip`
- [ ] Fill add-on listing
- [ ] Submit for review

## Resources

- [Chrome Extension Docs](https://developer.chrome.com/docs/extensions/)
- [Firefox Extension Docs](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions)
- [Manifest V3 Migration](https://developer.chrome.com/docs/extensions/mv3/intro/)
- [Browser Compatibility](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Browser_support_for_JavaScript_APIs)

## Support

For detailed testing instructions, see:
- `FIREFOX_TESTING_GUIDE.md` - Firefox-specific testing
- `CROSS_BROWSER_SUMMARY.md` - Implementation details
- `README.md` - General documentation
