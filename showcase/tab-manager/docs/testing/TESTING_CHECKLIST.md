# Tab Manager Extension - Testing Checklist

Quick reference checklist for manual testing. Print this or keep it open while testing.

---

## Pre-Testing Setup

- [ ] Extension built for all browsers (`npm run build:all`)
- [ ] `dist-chrome/` directory exists
- [ ] `dist-firefox/` directory exists
- [ ] Test results template ready
- [ ] Browser DevTools open (F12)
- [ ] Console tab visible for errors

---

## Chrome Testing Checklist

### Setup
- [ ] Extension loaded at `chrome://extensions/`
- [ ] Developer mode enabled
- [ ] No load errors
- [ ] Extension icon visible in toolbar

### Core Features (15 min)
- [ ] **Tab List**: All tabs displayed with title/URL/favicon
- [ ] **Active Tab**: Active tab visually indicated
- [ ] **Search**: Filter by title works
- [ ] **Search**: Filter by URL works
- [ ] **Search**: Clear restores full list
- [ ] **Activate**: Click tab activates it
- [ ] **Close**: Hover shows close button
- [ ] **Close**: Click X closes tab
- [ ] **Groups**: Create group works (Chrome only)
- [ ] **Groups**: Tabs added to group
- [ ] **Auto-update**: New tabs appear automatically
- [ ] **Auto-update**: Closed tabs disappear automatically

### Sessions (10 min)
- [ ] **Save**: Save session with name
- [ ] **Save**: Session appears in list
- [ ] **List**: All sessions shown with details
- [ ] **Restore**: All tabs restored correctly
- [ ] **Restore**: Groups restored (if applicable)
- [ ] **Delete**: Session deleted successfully
- [ ] **Persist**: Sessions survive browser restart

### Duplicates (5 min)
- [ ] **Detect**: Find duplicates correctly
- [ ] **Count**: Duplicate count accurate
- [ ] **Remove**: Close duplicates keeps one
- [ ] **Remove**: Most recent tab kept

### Performance (10 min)
- [ ] **10 tabs**: Load < 100ms
- [ ] **100 tabs**: Load < 200ms
- [ ] **100 tabs**: Search still fast
- [ ] **100 tabs**: Scrolling smooth
- [ ] **500 tabs**: Extension doesn't crash

### Total Time: ~40 minutes

---

## Firefox Testing Checklist

### Setup
- [ ] Extension loaded at `about:debugging`
- [ ] Loaded as temporary add-on
- [ ] No load errors
- [ ] Extension icon visible

### Core Features (10 min)
- [ ] **Tab List**: All tabs displayed
- [ ] **Search**: Works correctly
- [ ] **Activate**: Click tab activates it
- [ ] **Close**: Close button works
- [ ] **Groups**: Button hidden/disabled (expected)
- [ ] **Groups**: No console errors about groups
- [ ] **Auto-update**: Updates work

### Sessions (10 min)
- [ ] **Save**: Save session works
- [ ] **Restore**: Restore works (no groups)
- [ ] **Persist**: Sessions survive restart

### Duplicates (5 min)
- [ ] **Detect**: Works correctly
- [ ] **Remove**: Works correctly

### Browser Compatibility (5 min)
- [ ] **API**: No browser API errors
- [ ] **Manifest**: Loads without errors
- [ ] **Promises**: All async operations work

### Total Time: ~30 minutes

---

## Edge Testing Checklist

### Setup
- [ ] Extension loaded at `edge://extensions/`
- [ ] Developer mode enabled
- [ ] Chrome build works
- [ ] No load errors

### Quick Verification (10 min)
- [ ] All Chrome features work
- [ ] Tab groups work
- [ ] No Edge-specific issues
- [ ] No conflicts with Edge Collections

### Total Time: ~10 minutes

---

## Performance Testing Checklist

### Light Usage (10 tabs)
- [ ] Popup load: ___ms (< 100ms)
- [ ] Search: ___ms (< 50ms)
- [ ] Tab activation: ___ms (< 50ms)
- [ ] Session save: ___ms (< 200ms)
- [ ] Session restore: ___ms (< 500ms)

### Normal Usage (100 tabs)
- [ ] Popup load: ___ms (< 200ms)
- [ ] Search: ___ms (< 100ms)
- [ ] Scrolling: Smooth / Laggy
- [ ] Session save: ___ms (< 500ms)
- [ ] Session restore: ___ms (< 1000ms)

### Heavy Usage (500 tabs)
- [ ] Popup load: ___ms
- [ ] Search: ___ms
- [ ] Scrolling: Smooth / Laggy / Unusable
- [ ] Memory: ___MB
- [ ] No crashes

### Total Time: ~20 minutes

---

## Bug Documentation

When you find a bug:

1. **Stop testing that feature**
2. **Document immediately**:
   - Browser
   - Steps to reproduce
   - Expected vs actual behavior
   - Console errors
   - Screenshots
3. **Continue with other features**
4. **Report all bugs at end**

---

## Quick Bug Template

```
Bug: [Short description]
Browser: Chrome/Firefox/Edge
Severity: Critical/High/Medium/Low

Steps:
1. 
2. 
3. 

Expected: 
Actual: 
Console: 
```

---

## Testing Tips

✅ **DO:**
- Test systematically (follow checklist order)
- Keep DevTools open
- Document everything
- Take screenshots of bugs
- Test edge cases
- Verify fixes after changes

❌ **DON'T:**
- Skip steps
- Test multiple features at once
- Ignore console errors
- Forget to document bugs
- Test without DevTools open

---

## Time Estimates

| Test | Time |
|------|------|
| Chrome Full Test | 40 min |
| Firefox Full Test | 30 min |
| Edge Quick Test | 10 min |
| Performance Test | 20 min |
| **Total** | **~100 min** |

---

## After Testing

- [ ] Fill out TEST_RESULTS_TEMPLATE.md
- [ ] Document all bugs found
- [ ] Calculate pass/fail rates
- [ ] Make recommendations
- [ ] Report to team
- [ ] Create issues for bugs
- [ ] Schedule re-testing

---

## Quick Reference

**Load Extension:**
- Chrome: `chrome://extensions/` → Load unpacked → `dist-chrome/`
- Firefox: `about:debugging` → Load Temporary → `dist-firefox/manifest.json`
- Edge: `edge://extensions/` → Load unpacked → `dist-chrome/`

**Generate Test Tabs:**
```javascript
// In browser console, paste scripts/generate-test-tabs.js
testTabGenerator.light()    // 10 tabs
testTabGenerator.normal()   // 100 tabs
testTabGenerator.heavy()    // 500 tabs
```

**Check Console:**
- F12 → Console tab
- Look for red errors
- Document any errors found

**Measure Performance:**
- F12 → Performance tab
- Record → Open popup → Stop
- Check timing in timeline

---

**Print this checklist and check off items as you test!** ✓
