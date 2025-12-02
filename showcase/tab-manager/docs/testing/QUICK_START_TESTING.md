# Quick Start - Manual Testing

This guide gets you started with manual testing in under 5 minutes.

## Prerequisites

✅ Extension has been built (both `dist-chrome/` and `dist-firefox/` directories exist)

If not built yet, run:
```bash
cd demo/tab-manager
npm run build:all
```

---

## Chrome/Edge - Quick Start

### 1. Load Extension (30 seconds)

**Chrome:**
1. Open Chrome
2. Go to `chrome://extensions/`
3. Toggle "Developer mode" ON (top-right)
4. Click "Load unpacked"
5. Select: `demo/tab-manager/dist-chrome`
6. ✅ Extension loaded!

**Edge:**
1. Open Edge
2. Go to `edge://extensions/`
3. Toggle "Developer mode" ON (left sidebar)
4. Click "Load unpacked"
5. Select: `demo/tab-manager/dist-chrome`
6. ✅ Extension loaded!

### 2. Quick Smoke Test (2 minutes)

1. **Open some tabs** (5-10 tabs)
2. **Click extension icon** (puzzle piece icon in toolbar)
3. **Verify tab list appears** with all your tabs
4. **Test search**: Type in search box, verify filtering works
5. **Test activation**: Click a tab in the list, verify it activates
6. **Test close**: Hover over a tab, click X, verify it closes
7. **Test session save**: Click "Save Session", enter name, verify it saves
8. **Test session restore**: Close some tabs, click "Restore", verify tabs reopen

✅ If all these work, basic functionality is good!

### 3. Full Testing

For comprehensive testing, follow: **[MANUAL_TESTING_GUIDE.md](./MANUAL_TESTING_GUIDE.md)**

---

## Firefox - Quick Start

### 1. Load Extension (30 seconds)

1. Open Firefox
2. Go to `about:debugging#/runtime/this-firefox`
3. Click "Load Temporary Add-on..."
4. Navigate to `demo/tab-manager/dist-firefox`
5. Select `manifest.json`
6. ✅ Extension loaded!

**Note**: Firefox extensions are temporary and removed when Firefox closes.

### 2. Quick Smoke Test (2 minutes)

Same as Chrome test above, except:
- ⚠️ **Skip tab grouping** (not supported in Firefox)
- ✅ Verify "Create Group" button is hidden/disabled
- ✅ Verify no errors in console

### 3. Full Testing

For comprehensive testing, follow: **[MANUAL_TESTING_GUIDE.md](./MANUAL_TESTING_GUIDE.md)**

---

## Performance Quick Test

### Test with 100 Tabs

Want to quickly test with many tabs? Use this script in browser console:

```javascript
// Open 100 tabs (be careful!)
for (let i = 0; i < 100; i++) {
  window.open(`https://example.com?tab=${i}`, '_blank');
}
```

Then:
1. Open extension popup
2. Verify it loads quickly (< 200ms)
3. Test search - should still be fast
4. Save session with all 100 tabs
5. Close all tabs
6. Restore session - verify all tabs reopen

---

## Common Issues

### Extension Not Appearing

**Chrome/Edge:**
- Check "Developer mode" is ON
- Look for errors in `chrome://extensions/`
- Try reloading the extension

**Firefox:**
- Check `about:debugging` for errors
- Verify you selected `manifest.json` file
- Try loading again

### Popup Not Opening

- Check extension icon is pinned to toolbar
- Right-click extension icon → "Inspect popup" to see errors
- Check browser console for errors

### Features Not Working

1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for error messages
4. Check Network tab for failed requests
5. Document errors in test results

---

## Test Results

Document your findings in: **[TEST_RESULTS_TEMPLATE.md](./TEST_RESULTS_TEMPLATE.md)**

---

## Need Help?

- **Full testing guide**: [MANUAL_TESTING_GUIDE.md](./MANUAL_TESTING_GUIDE.md)
- **Browser compatibility**: [BROWSER_COMPATIBILITY.md](./BROWSER_COMPATIBILITY.md)
- **Firefox specific**: [FIREFOX_TESTING_GUIDE.md](./FIREFOX_TESTING_GUIDE.md)
- **Design document**: [.kiro/specs/tab-manager-extension/design.md](../../.kiro/specs/tab-manager-extension/design.md)

---

## After Testing

1. Fill out [TEST_RESULTS_TEMPLATE.md](./TEST_RESULTS_TEMPLATE.md)
2. Document any bugs found
3. Report results to development team
4. If bugs found, create issues for fixes
5. Re-test after fixes are applied

---

**Happy Testing!** 🚀
