# Tab Manager Extension - Manual Testing Guide

This guide provides detailed instructions for manually testing the Tab Manager Extension across different browsers and scenarios.

## Prerequisites

Before starting manual testing, ensure:
- [ ] Extension has been built for target browsers
- [ ] You have Chrome, Firefox, and/or Edge installed
- [ ] You understand how to load unpacked/temporary extensions
- [ ] You have this testing guide open for reference

## Build Instructions

### Build for All Browsers

```bash
cd demo/tab-manager
npm run build:all
```

This creates:
- `dist-chrome/` - Chrome/Edge build
- `dist-firefox/` - Firefox build

### Build for Specific Browser

```bash
# Chrome/Edge only
npm run build:chrome

# Firefox only
npm run build:firefox
```

---

## Test 17.1: Chrome Testing

### Loading the Extension

1. Open Chrome
2. Navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top-right)
4. Click "Load unpacked"
5. Select the `demo/tab-manager/dist-chrome` directory
6. Verify extension appears in the list with no errors

### Feature Testing Checklist

#### Tab List Display (Requirements 1.1, 1.2, 1.3, 1.4)

- [ ] Click the extension icon to open popup
- [ ] Verify all open tabs are displayed
- [ ] Verify each tab shows:
  - [ ] Tab title
  - [ ] URL (or domain)
  - [ ] Favicon (if available)
- [ ] Verify active tab is visually indicated (highlighted/different color)
- [ ] If you have tab groups:
  - [ ] Verify tabs are organized by groups
  - [ ] Verify group names/colors are shown

**Expected Result**: All tabs visible with complete information, active tab clearly marked

#### Search Functionality (Requirements 2.1, 2.3, 2.5)

- [ ] Type in the search field
- [ ] Verify tabs are filtered as you type
- [ ] Test search by title: type part of a tab title
  - [ ] Verify only matching tabs appear
- [ ] Test search by URL: type part of a URL
  - [ ] Verify only matching tabs appear
- [ ] Clear the search field
  - [ ] Verify all tabs reappear
- [ ] Test with no matches
  - [ ] Verify "no results" message appears

**Expected Result**: Search filters correctly, clear restores full list

#### Tab Activation (Requirements 7.1, 7.2, 7.3)

- [ ] Click on a tab in the list
- [ ] Verify the clicked tab becomes active
- [ ] Verify the tab's window comes to front
- [ ] Verify the popup closes after activation
- [ ] Test with tabs in different windows
  - [ ] Verify correct window is brought to front

**Expected Result**: Clicking a tab activates it and brings its window forward

#### Tab Closing (Requirements 8.1, 8.2, 8.3)

- [ ] Hover over a tab in the list
- [ ] Verify close button appears
- [ ] Click the close button
- [ ] Verify the tab closes in the browser
- [ ] Verify the tab disappears from the list
- [ ] Close multiple tabs
  - [ ] Verify list updates correctly each time

**Expected Result**: Tabs close correctly and list updates immediately

#### Tab Grouping (Requirements 3.1, 3.2, 3.3, 3.4, 3.5)

**Note**: Tab Groups are only available in Chrome/Edge

- [ ] Select multiple tabs (if selection UI exists)
- [ ] Click "Create Group" button
- [ ] Enter a group name when prompted
- [ ] Select a color
- [ ] Verify group is created in browser
- [ ] Verify tabs are added to the group
- [ ] Verify group appears in the extension UI
- [ ] Verify grouped tabs are visually organized together

**Expected Result**: Groups are created and tabs are organized correctly

#### Session Save (Requirements 4.1, 4.2, 4.3, 4.4, 4.5)

- [ ] Open several tabs (at least 5-10)
- [ ] Click "Save Session" button
- [ ] Enter a session name when prompted
- [ ] Verify success message appears
- [ ] Verify session appears in session list
- [ ] Check session details:
  - [ ] Session name is correct
  - [ ] Creation date/time is shown
  - [ ] Tab count is accurate

**Expected Result**: Session is saved with all tab information

#### Session Restore (Requirements 5.1, 5.2, 5.3, 5.4, 5.5)

- [ ] Close some or all tabs
- [ ] Open the extension popup
- [ ] View the list of saved sessions
- [ ] Click "Restore" on a saved session
- [ ] Verify all tabs from the session are opened
- [ ] Verify tab titles and URLs match the saved session
- [ ] If session had groups:
  - [ ] Verify groups are recreated
  - [ ] Verify tabs are in correct groups
- [ ] Test restoring with some tabs already open
  - [ ] Verify no duplicates are created (or expected behavior)

**Expected Result**: All tabs from session are restored correctly

#### Session Management

- [ ] Save multiple sessions (at least 3)
- [ ] Verify all sessions appear in the list
- [ ] Verify each session shows:
  - [ ] Name
  - [ ] Date/time
  - [ ] Tab count (if shown)
- [ ] Delete a session
  - [ ] Verify confirmation prompt (if any)
  - [ ] Verify session is removed from list
  - [ ] Verify session cannot be restored after deletion

**Expected Result**: Multiple sessions can be managed independently

#### Duplicate Detection (Requirements 6.1, 6.2)

- [ ] Open several duplicate tabs (same URL)
- [ ] Click "Find Duplicates" button
- [ ] Verify duplicate count is shown
- [ ] Verify list of duplicate URLs is displayed
- [ ] Verify count matches actual duplicates

**Expected Result**: All duplicates are detected and counted correctly

#### Duplicate Removal (Requirements 6.3, 6.4, 6.5)

- [ ] With duplicates present, click "Close Duplicates"
- [ ] Verify confirmation prompt (if any)
- [ ] Verify duplicate tabs are closed
- [ ] Verify one tab per URL remains open
- [ ] Check which tab was kept:
  - [ ] Should be the most recently accessed
- [ ] Verify tab list updates correctly

**Expected Result**: Duplicates removed, most recent tab kept

#### Automatic Updates (Requirements 1.5, 11.1, 11.2)

- [ ] With popup open, create a new tab in browser
  - [ ] Verify new tab appears in extension list
- [ ] With popup open, close a tab in browser
  - [ ] Verify tab disappears from extension list
- [ ] With popup open, update a tab (navigate to new URL)
  - [ ] Verify tab information updates in extension
- [ ] With popup open, create a tab group in browser
  - [ ] Verify group appears in extension

**Expected Result**: Extension UI updates automatically when tabs change

#### Storage Persistence (Requirements 12.1, 12.2, 12.3, 12.4)

- [ ] Save a session
- [ ] Close the browser completely
- [ ] Reopen the browser
- [ ] Open the extension
- [ ] Verify saved session is still present
- [ ] Restore the session
  - [ ] Verify all tabs are restored correctly

**Expected Result**: Sessions persist across browser restarts

#### UI/UX Quality (Requirements 13.1, 13.2, 13.3, 13.4, 13.5)

- [ ] Verify popup has clear layout
- [ ] Verify consistent spacing and styling
- [ ] Verify buttons have clear labels/icons
- [ ] Verify loading indicators appear during operations
- [ ] Trigger an error (e.g., invalid session)
  - [ ] Verify user-friendly error message appears
- [ ] Test responsive layout
  - [ ] Resize popup (if possible)
  - [ ] Verify layout adapts appropriately

**Expected Result**: Clean, intuitive UI with good feedback

### Performance Testing with Chrome

#### Test with 10 Tabs

- [ ] Open exactly 10 tabs
- [ ] Open extension popup
- [ ] Measure load time (should be < 100ms)
- [ ] Verify all tabs render correctly
- [ ] Test search performance
- [ ] Test tab activation speed

**Expected Result**: Fast and responsive with 10 tabs

#### Test with 100 Tabs

- [ ] Open 100 tabs (use a script or manually)
- [ ] Open extension popup
- [ ] Measure load time (should be < 200ms)
- [ ] Verify all tabs render (may need scrolling)
- [ ] Test search performance
- [ ] Test tab activation speed
- [ ] Save session with 100 tabs
  - [ ] Measure save time (should be < 500ms)
- [ ] Restore session
  - [ ] Measure restore time

**Expected Result**: Acceptable performance with 100 tabs

#### Test with 500 Tabs (Stress Test)

**Warning**: This may slow down your browser

- [ ] Open 500 tabs (use a script)
- [ ] Open extension popup
- [ ] Measure load time
- [ ] Verify extension remains responsive
- [ ] Test search (should still be fast)
- [ ] Test scrolling performance
- [ ] Save session
  - [ ] Measure save time
- [ ] Close all tabs
- [ ] Restore session
  - [ ] Measure restore time
  - [ ] Verify all tabs restored

**Expected Result**: Extension remains functional, performance may degrade but should not crash

### Chrome Testing Summary

After completing all tests, document:
- [ ] All features working: YES / NO
- [ ] Performance acceptable: YES / NO
- [ ] Any bugs found: (list)
- [ ] Any UI issues: (list)
- [ ] Overall assessment: PASS / FAIL

---

## Test 17.2: Firefox Testing

### Loading the Extension

1. Open Firefox
2. Navigate to `about:debugging#/runtime/this-firefox`
3. Click "Load Temporary Add-on"
4. Navigate to `demo/tab-manager/dist-firefox`
5. Select the `manifest.json` file
6. Verify extension appears in the list with no errors

**Note**: Firefox extensions are temporary and will be removed when Firefox closes

### Feature Testing Checklist

#### Tab List Display

- [ ] Click the extension icon to open popup
- [ ] Verify all open tabs are displayed
- [ ] Verify each tab shows:
  - [ ] Tab title
  - [ ] URL (or domain)
  - [ ] Favicon (if available)
- [ ] Verify active tab is visually indicated

**Expected Result**: All tabs visible with complete information

#### Search Functionality

- [ ] Test search by title
- [ ] Test search by URL
- [ ] Test clear search
- [ ] Test no results message

**Expected Result**: Search works identically to Chrome

#### Tab Activation

- [ ] Click on tabs to activate them
- [ ] Verify tabs activate correctly
- [ ] Verify popup closes after activation

**Expected Result**: Tab activation works correctly

#### Tab Closing

- [ ] Hover over tabs
- [ ] Click close buttons
- [ ] Verify tabs close correctly

**Expected Result**: Tab closing works correctly

#### Tab Grouping - Graceful Degradation

**Important**: Tab Groups API is NOT available in Firefox

- [ ] Verify "Create Group" button is hidden or disabled
- [ ] Verify no group-related UI elements appear
- [ ] Verify extension works normally without groups
- [ ] Verify no errors in console related to groups

**Expected Result**: Extension works without tab groups, no errors

#### Session Save

- [ ] Save a session with multiple tabs
- [ ] Verify session is saved
- [ ] Verify session appears in list

**Expected Result**: Sessions save correctly

#### Session Restore

- [ ] Restore a saved session
- [ ] Verify all tabs are restored
- [ ] Note: Groups will not be restored (expected)

**Expected Result**: Tabs restore correctly, no group information

#### Duplicate Detection and Removal

- [ ] Test duplicate detection
- [ ] Test duplicate removal
- [ ] Verify functionality works identically to Chrome

**Expected Result**: Duplicate features work correctly

#### Storage Persistence

- [ ] Save a session
- [ ] Close Firefox completely
- [ ] Reopen Firefox
- [ ] Reload the temporary extension
- [ ] Verify saved session is still present

**Expected Result**: Sessions persist (Firefox storage works)

### Firefox-Specific Tests

#### Browser API Compatibility

- [ ] Verify `browser.*` API is used (not `chrome.*`)
- [ ] Check browser console for any API errors
- [ ] Verify all promises resolve correctly

**Expected Result**: No API compatibility errors

#### Manifest Compatibility

- [ ] Verify extension loads without manifest errors
- [ ] Check for any permission warnings
- [ ] Verify all declared permissions work

**Expected Result**: Manifest is valid for Firefox

### Firefox Testing Summary

After completing all tests, document:
- [ ] All features working (except groups): YES / NO
- [ ] Graceful degradation working: YES / NO
- [ ] Storage persistence working: YES / NO
- [ ] Any bugs found: (list)
- [ ] Any compatibility issues: (list)
- [ ] Overall assessment: PASS / FAIL

---

## Test 17.3: Edge Testing

### Loading the Extension

1. Open Microsoft Edge
2. Navigate to `edge://extensions/`
3. Enable "Developer mode" (toggle in left sidebar)
4. Click "Load unpacked"
5. Select the `demo/tab-manager/dist-chrome` directory
6. Verify extension appears in the list with no errors

**Note**: Edge uses the same Chromium base as Chrome, so the Chrome build should work

### Feature Testing Checklist

#### Quick Verification

Since Edge uses Chromium, focus on:

- [ ] Extension loads without errors
- [ ] All features from Chrome test work
- [ ] Tab groups work (Edge supports them)
- [ ] No Edge-specific issues

#### Specific Tests

- [ ] Tab list display works
- [ ] Search works
- [ ] Tab activation works
- [ ] Tab closing works
- [ ] Tab grouping works
- [ ] Session save/restore works
- [ ] Duplicate detection works
- [ ] Storage persistence works

**Expected Result**: All features work identically to Chrome

### Edge-Specific Tests

#### Edge Collections Integration (if applicable)

- [ ] Verify extension doesn't conflict with Edge Collections
- [ ] Test with Collections open
- [ ] Verify both features work independently

**Expected Result**: No conflicts with Edge features

### Edge Testing Summary

After completing all tests, document:
- [ ] All features working: YES / NO
- [ ] Chrome build compatible: YES / NO
- [ ] Any Edge-specific issues: (list)
- [ ] Overall assessment: PASS / FAIL

---

## Test 17.4: Performance Testing

### Performance Metrics to Measure

Use browser DevTools Performance tab or manual timing:

#### Extension Load Time

- [ ] Measure time from clicking icon to popup fully rendered
- [ ] Target: < 100ms for 10 tabs
- [ ] Target: < 200ms for 100 tabs

#### Search Performance

- [ ] Measure time from typing to results displayed
- [ ] Target: < 50ms for any tab count
- [ ] Should feel instant

#### Action Execution Time

- [ ] Tab activation: < 50ms
- [ ] Tab closing: < 50ms
- [ ] Session save: < 200ms for 50 tabs
- [ ] Session restore: < 500ms for 50 tabs

### Performance Test Scenarios

#### Scenario 1: Light Usage (10 tabs)

```
Setup: 10 tabs open
Tests:
- [ ] Open popup: ___ms (target: < 100ms)
- [ ] Search: ___ms (target: < 50ms)
- [ ] Activate tab: ___ms (target: < 50ms)
- [ ] Close tab: ___ms (target: < 50ms)
- [ ] Save session: ___ms (target: < 200ms)
- [ ] Restore session: ___ms (target: < 500ms)

Result: PASS / FAIL
```

#### Scenario 2: Normal Usage (100 tabs)

```
Setup: 100 tabs open
Tests:
- [ ] Open popup: ___ms (target: < 200ms)
- [ ] Search: ___ms (target: < 100ms)
- [ ] Scroll through list: smooth / laggy
- [ ] Activate tab: ___ms (target: < 100ms)
- [ ] Close tab: ___ms (target: < 100ms)
- [ ] Save session: ___ms (target: < 500ms)
- [ ] Restore session: ___ms (target: < 1000ms)

Result: PASS / FAIL
```

#### Scenario 3: Heavy Usage (500 tabs)

```
Setup: 500 tabs open
Tests:
- [ ] Open popup: ___ms (acceptable if < 1000ms)
- [ ] Search: ___ms (should still be < 200ms)
- [ ] Scroll through list: smooth / laggy / unusable
- [ ] Activate tab: ___ms
- [ ] Close tab: ___ms
- [ ] Save session: ___ms
- [ ] Restore session: ___ms
- [ ] Memory usage: ___MB (check Task Manager)

Result: PASS / FAIL / ACCEPTABLE
```

### Memory Usage Testing

#### Memory Profiling

- [ ] Open browser Task Manager (Shift+Esc in Chrome)
- [ ] Find extension process
- [ ] Record memory usage:
  - [ ] With 10 tabs: ___MB
  - [ ] With 100 tabs: ___MB
  - [ ] With 500 tabs: ___MB
- [ ] Verify no memory leaks:
  - [ ] Open/close popup 10 times
  - [ ] Check if memory increases each time
  - [ ] Memory should stabilize

**Expected Result**: Reasonable memory usage, no leaks

### Performance Testing Summary

Document overall performance:
- [ ] Light usage (10 tabs): EXCELLENT / GOOD / ACCEPTABLE / POOR
- [ ] Normal usage (100 tabs): EXCELLENT / GOOD / ACCEPTABLE / POOR
- [ ] Heavy usage (500 tabs): EXCELLENT / GOOD / ACCEPTABLE / POOR
- [ ] Memory usage: EXCELLENT / GOOD / ACCEPTABLE / POOR
- [ ] Overall performance: PASS / FAIL

---

## Bug Report Template

If you find bugs during testing, document them using this template:

```markdown
### Bug #X: [Short Description]

**Browser**: Chrome / Firefox / Edge
**Severity**: Critical / High / Medium / Low

**Steps to Reproduce**:
1. 
2. 
3. 

**Expected Behavior**:


**Actual Behavior**:


**Screenshots** (if applicable):


**Console Errors** (if any):


**Additional Context**:

```

---

## Test Results Summary

### Overall Test Results

| Test | Chrome | Firefox | Edge | Status |
|------|--------|---------|------|--------|
| Tab List Display | ☐ | ☐ | ☐ | |
| Search | ☐ | ☐ | ☐ | |
| Tab Activation | ☐ | ☐ | ☐ | |
| Tab Closing | ☐ | ☐ | ☐ | |
| Tab Grouping | ☐ | N/A | ☐ | |
| Session Save | ☐ | ☐ | ☐ | |
| Session Restore | ☐ | ☐ | ☐ | |
| Duplicate Detection | ☐ | ☐ | ☐ | |
| Storage Persistence | ☐ | ☐ | ☐ | |
| Performance (10 tabs) | ☐ | ☐ | ☐ | |
| Performance (100 tabs) | ☐ | ☐ | ☐ | |
| Performance (500 tabs) | ☐ | ☐ | ☐ | |

### Final Assessment

- **Chrome**: PASS / FAIL
- **Firefox**: PASS / FAIL
- **Edge**: PASS / FAIL
- **Performance**: PASS / FAIL

**Overall Status**: READY FOR RELEASE / NEEDS FIXES

### Bugs Found

Total bugs: ___
- Critical: ___
- High: ___
- Medium: ___
- Low: ___

### Recommendations

(List any recommendations for improvements, fixes, or future enhancements)

---

## Tips for Effective Testing

1. **Test systematically**: Follow the checklist in order
2. **Document everything**: Note even small issues
3. **Use fresh browser profiles**: Avoid interference from other extensions
4. **Test edge cases**: Try unusual scenarios
5. **Check console**: Always have DevTools open to catch errors
6. **Take screenshots**: Visual evidence helps with bug reports
7. **Test incrementally**: Don't try to test everything at once
8. **Verify fixes**: Re-test after any code changes

## Getting Help

If you encounter issues during testing:
1. Check the browser console for errors
2. Review the implementation in `demo/tab-manager/src/`
3. Check existing documentation in `demo/tab-manager/*.md`
4. Refer to the design document at `.kiro/specs/tab-manager-extension/design.md`

---

**Happy Testing!** 🧪
