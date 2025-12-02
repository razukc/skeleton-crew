# Firefox Testing Guide

This guide provides instructions for testing the Tab Manager extension in Firefox to verify cross-browser compatibility.

## Prerequisites

- Firefox Developer Edition (recommended) or Firefox 109+
- Node.js and npm installed
- Extension built for Firefox

## Building for Firefox

```bash
# Build Firefox version
npm run build:firefox

# Package for distribution (optional)
npm run package:firefox
```

This creates a `dist-firefox` directory with the Firefox-compatible build.

## Loading the Extension in Firefox

### Method 1: Temporary Installation (Development)

1. Open Firefox
2. Navigate to `about:debugging#/runtime/this-firefox`
3. Click "Load Temporary Add-on..."
4. Navigate to `demo/tab-manager/dist-firefox/`
5. Select `manifest.json`
6. The extension will be loaded temporarily (until Firefox restarts)

### Method 2: Permanent Installation (Testing)

1. Package the extension: `npm run package:firefox`
2. Navigate to `about:addons`
3. Click the gear icon → "Install Add-on From File..."
4. Select `tab-manager-firefox.zip`
5. Confirm installation

## Test Checklist

### ✅ 15.1 Browser Adapter Tests

#### API Detection
- [ ] Extension loads without errors
- [ ] Console shows no "Browser API not available" errors
- [ ] Background script initializes successfully

#### Promisified APIs
- [ ] Storage operations work (save/load sessions)
- [ ] Tab operations work (query/activate/close)
- [ ] No callback-related errors in console

#### Feature Detection
- [ ] `hasTabGroups()` returns `false` in Firefox
- [ ] `features.isFirefox` is `true`
- [ ] `features.tabGroups` is `false`

**How to verify:**
1. Open Firefox DevTools (F12)
2. Go to Console tab
3. Open the extension popup
4. Check for any errors related to browser APIs
5. Try saving a session - should work without errors
6. Try closing a tab - should work without errors

### ✅ 15.2 Firefox Manifest Verification

#### Manifest Structure
- [ ] `manifest_version` is 3
- [ ] `browser_specific_settings.gecko` is present
- [ ] `browser_action` is used (not `action`)
- [ ] `tabGroups` permission is NOT present
- [ ] `background.scripts` is used (not `service_worker`)

**How to verify:**
1. Check `dist-firefox/manifest.json`
2. Verify all fields match Firefox requirements
3. Extension should load without manifest errors

### ✅ 15.3 Graceful Degradation Tests

#### Groups Plugin Behavior
- [ ] Groups plugin does not register actions in Firefox
- [ ] No errors related to `chrome.tabGroups` in console
- [ ] Extension functions normally without groups

**How to verify:**
1. Open extension popup
2. Check that "Create Group" button is NOT visible
3. Try all other features - they should work normally

#### UI Adaptation
- [ ] ActionBar hides "Create Group" button
- [ ] No visual artifacts where button would be
- [ ] Other buttons display correctly
- [ ] Layout remains clean and functional

**How to verify:**
1. Open extension popup
2. Verify UI looks clean without group button
3. Compare with Chrome version (optional)

#### Core Features Work
- [ ] Tab list displays correctly
- [ ] Search functionality works
- [ ] Session save works
- [ ] Session restore works
- [ ] Duplicate detection works
- [ ] Tab activation works
- [ ] Tab closing works

**How to verify:**
1. Open 10+ tabs in Firefox
2. Open extension popup
3. Test each feature systematically:
   - Search for a tab by title
   - Save current session
   - Close some tabs
   - Restore the session
   - Find and close duplicates
   - Activate a tab from the list

### ✅ 15.4 Build Scripts Verification

#### Build Commands
- [ ] `npm run build:firefox` completes successfully
- [ ] `npm run build:chrome` completes successfully
- [ ] `npm run build:all` builds both versions
- [ ] `npm run package:firefox` creates zip file
- [ ] `npm run package:chrome` creates zip file

**How to verify:**
```bash
# Clean previous builds
rm -rf dist-chrome dist-firefox

# Test Firefox build
npm run build:firefox
ls dist-firefox/  # Should contain manifest.json, background.js, popup.html, etc.

# Test Chrome build
npm run build:chrome
ls dist-chrome/  # Should contain manifest.json, background.js, popup.html, etc.

# Test combined build
npm run build:all
ls dist-firefox/ dist-chrome/  # Both should exist

# Test packaging
npm run package:firefox
ls tab-manager-firefox.zip  # Should exist

npm run package:chrome
ls tab-manager-chrome.zip  # Should exist
```

## Common Issues and Solutions

### Issue: Extension doesn't load
**Solution:** Check Firefox version (must be 109+), verify manifest.json syntax

### Issue: Storage errors
**Solution:** Check browser console for specific error, verify storage permissions in manifest

### Issue: Tabs not loading
**Solution:** Verify tabs permission in manifest, check for API errors in console

### Issue: "Create Group" button still visible
**Solution:** Clear browser cache, rebuild extension, reload temporary add-on

### Issue: Background script errors
**Solution:** Check that background.scripts is used (not service_worker), verify module type

## Performance Testing

### Test with Various Tab Counts

1. **10 tabs**: Basic functionality test
   - [ ] Extension loads quickly (< 100ms)
   - [ ] All features work smoothly

2. **50 tabs**: Medium load test
   - [ ] Tab list renders in < 200ms
   - [ ] Search is responsive
   - [ ] Session save/restore works

3. **100+ tabs**: Stress test
   - [ ] Extension remains responsive
   - [ ] No memory leaks
   - [ ] All operations complete successfully

## Browser Compatibility Matrix

| Feature | Chrome | Firefox | Edge | Status |
|---------|--------|---------|------|--------|
| Tab listing | ✓ | ✓ | ✓ | Working |
| Search | ✓ | ✓ | ✓ | Working |
| Tab groups | ✓ | ✗ | ✓ | Graceful degradation |
| Sessions | ✓ | ✓ | ✓ | Working |
| Duplicates | ✓ | ✓ | ✓ | Working |
| Storage | ✓ | ✓ | ✓ | Working |

## Debugging Tips

### Enable Verbose Logging

Add to background script for debugging:
```javascript
console.log('[TabManager] Browser:', features.isFirefox ? 'Firefox' : 'Chrome');
console.log('[TabManager] Tab Groups:', features.tabGroups);
```

### Check Feature Flags

In browser console:
```javascript
// Check if running in Firefox
typeof browser !== 'undefined'

// Check tab groups support
typeof chrome.tabGroups !== 'undefined'
```

### Monitor Events

Add event listeners to track plugin behavior:
```javascript
context.events.on('*', (event, data) => {
  console.log('[Event]', event, data);
});
```

## Automated Testing

While manual testing is required for browser-specific behavior, you can run unit tests:

```bash
# Run all tests
npm test

# Run specific test file
npm test browser-adapter.test.ts
```

## Reporting Issues

When reporting Firefox-specific issues, include:
1. Firefox version
2. Extension version
3. Console errors (if any)
4. Steps to reproduce
5. Expected vs actual behavior
6. Screenshots (if UI-related)

## Success Criteria

All tests pass when:
- ✅ Extension loads in Firefox without errors
- ✅ Browser adapter correctly detects Firefox
- ✅ Promisified APIs work correctly
- ✅ Feature detection works (tabGroups = false)
- ✅ Groups plugin skips registration
- ✅ UI hides group button
- ✅ All other features work normally
- ✅ Build scripts produce correct outputs
- ✅ No console errors during normal operation
- ✅ Performance is acceptable with 100+ tabs

## Next Steps

After completing Firefox testing:
1. Test in Edge (should work like Chrome)
2. Test in Opera (should work like Chrome)
3. Test in Brave (should work like Chrome)
4. Document any browser-specific quirks
5. Update README with browser compatibility info
