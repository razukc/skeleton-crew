# Tab Manager Extension - Testing Package

This directory contains everything you need to manually test the Tab Manager Extension.

## 📦 What's Included

### Built Extensions
- **`dist-chrome/`** - Chrome/Edge build (ready to load)
- **`dist-firefox/`** - Firefox build (ready to load)

### Testing Documentation
1. **`QUICK_START_TESTING.md`** - Get started in 5 minutes
2. **`MANUAL_TESTING_GUIDE.md`** - Comprehensive testing guide (40+ pages)
3. **`TESTING_CHECKLIST.md`** - Quick reference checklist (print-friendly)
4. **`TEST_RESULTS_TEMPLATE.md`** - Document your findings

### Testing Tools
- **`scripts/generate-test-tabs.js`** - Generate test tabs for performance testing

### Existing Documentation
- **`BROWSER_COMPATIBILITY.md`** - Cross-browser compatibility details
- **`FIREFOX_TESTING_GUIDE.md`** - Firefox-specific testing info
- **`VISUAL_GUIDE.md`** - UI/UX reference

---

## 🚀 Quick Start (5 minutes)

### 1. Load Extension

**Chrome:**
```
1. Open chrome://extensions/
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select: demo/tab-manager/dist-chrome
```

**Firefox:**
```
1. Open about:debugging#/runtime/this-firefox
2. Click "Load Temporary Add-on"
3. Select: demo/tab-manager/dist-firefox/manifest.json
```

**Edge:**
```
1. Open edge://extensions/
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select: demo/tab-manager/dist-chrome
```

### 2. Quick Test

1. Open 5-10 tabs
2. Click extension icon
3. Test search, activation, close
4. Save a session
5. Restore the session

✅ If these work, basic functionality is good!

### 3. Full Testing

Follow **`MANUAL_TESTING_GUIDE.md`** for comprehensive testing.

---

## 📋 Testing Workflow

```
1. Read QUICK_START_TESTING.md (5 min)
   ↓
2. Load extension in browser (2 min)
   ↓
3. Follow TESTING_CHECKLIST.md (40-100 min)
   ↓
4. Document results in TEST_RESULTS_TEMPLATE.md (10 min)
   ↓
5. Report bugs and recommendations
```

---

## 📊 Test Coverage

### Task 17.1: Chrome Testing
- ✅ All features
- ✅ Tab groups
- ✅ Performance testing
- ✅ Storage persistence

**Time**: ~40 minutes

### Task 17.2: Firefox Testing
- ✅ All features (except groups)
- ✅ Graceful degradation
- ✅ Browser compatibility
- ✅ Storage persistence

**Time**: ~30 minutes

### Task 17.3: Edge Testing
- ✅ Chrome build compatibility
- ✅ All features
- ✅ No Edge-specific issues

**Time**: ~10 minutes

### Task 17.4: Performance Testing
- ✅ 10 tabs (light usage)
- ✅ 100 tabs (normal usage)
- ✅ 500 tabs (stress test)
- ✅ Memory profiling

**Time**: ~20 minutes

**Total Testing Time**: ~100 minutes (1.5-2 hours)

---

## 🛠️ Testing Tools

### Generate Test Tabs

Open browser console and paste `scripts/generate-test-tabs.js`, then:

```javascript
// Quick scenarios
testTabGenerator.light()    // 10 tabs
testTabGenerator.normal()   // 100 tabs
testTabGenerator.heavy()    // 500 tabs

// Custom
testTabGenerator.generate(50)
testTabGenerator.generateVaried(100)
testTabGenerator.generateDuplicates(5, 3)

// Help
testTabGenerator.help()
```

### Measure Performance

1. Open DevTools (F12)
2. Go to Performance tab
3. Click Record
4. Open extension popup
5. Stop recording
6. Check timeline for load time

---

## 📝 Documentation Structure

```
QUICK_START_TESTING.md
├── Chrome Quick Start
├── Firefox Quick Start
├── Performance Quick Test
└── Common Issues

MANUAL_TESTING_GUIDE.md
├── Test 17.1: Chrome Testing
│   ├── Feature Testing (15 tests)
│   ├── Performance Testing (3 scenarios)
│   └── Summary
├── Test 17.2: Firefox Testing
│   ├── Feature Testing (8 tests)
│   ├── Browser Compatibility
│   └── Summary
├── Test 17.3: Edge Testing
│   ├── Quick Verification
│   └── Summary
└── Test 17.4: Performance Testing
    ├── Light Usage (10 tabs)
    ├── Normal Usage (100 tabs)
    ├── Heavy Usage (500 tabs)
    └── Memory Profiling

TESTING_CHECKLIST.md
├── Chrome Checklist (40 min)
├── Firefox Checklist (30 min)
├── Edge Checklist (10 min)
├── Performance Checklist (20 min)
└── Bug Documentation

TEST_RESULTS_TEMPLATE.md
├── Chrome Results
├── Firefox Results
├── Edge Results
├── Performance Results
├── Bug Reports
└── Final Assessment
```

---

## ✅ Requirements Coverage

This testing package covers all requirements from the specification:

### Functional Requirements
- ✅ Requirement 1: Tab list display (1.1-1.5)
- ✅ Requirement 2: Search functionality (2.1-2.5)
- ✅ Requirement 3: Tab grouping (3.1-3.5)
- ✅ Requirement 4: Session save (4.1-4.5)
- ✅ Requirement 5: Session restore (5.1-5.5)
- ✅ Requirement 6: Duplicate detection (6.1-6.5)
- ✅ Requirement 7: Tab activation (7.1-7.5)
- ✅ Requirement 8: Tab closing (8.1-8.5)
- ✅ Requirement 9: Plugin architecture (9.1-9.5)
- ✅ Requirement 10: UI separation (10.1-10.5)
- ✅ Requirement 11: Event bus (11.1-11.5)
- ✅ Requirement 12: Storage persistence (12.1-12.5)
- ✅ Requirement 13: UI/UX quality (13.1-13.5)

### Technical Requirements
- ✅ Requirement 14: Manifest V3 (14.1-14.5)
- ✅ Requirement 15: Testing (15.1-15.5)

### Cross-Browser Requirements
- ✅ Chrome support
- ✅ Firefox support (with graceful degradation)
- ✅ Edge support

### Performance Requirements
- ✅ Load time targets
- ✅ Search performance
- ✅ Action execution time
- ✅ Memory usage
- ✅ Scalability (10-500 tabs)

---

## 🐛 Bug Reporting

When you find bugs:

1. **Document immediately** using the bug template in TEST_RESULTS_TEMPLATE.md
2. **Include**:
   - Browser and version
   - Steps to reproduce
   - Expected vs actual behavior
   - Console errors
   - Screenshots
3. **Severity levels**:
   - **Critical**: Extension doesn't load or crashes
   - **High**: Core feature broken
   - **Medium**: Feature works but has issues
   - **Low**: Minor UI/UX issues

---

## 📈 Success Criteria

### Minimum Requirements (Must Pass)
- [ ] Extension loads in all browsers without errors
- [ ] All core features work (tab list, search, activation, close)
- [ ] Sessions save and restore correctly
- [ ] Storage persists across browser restarts
- [ ] No critical or high severity bugs
- [ ] Performance acceptable with 100 tabs

### Ideal Requirements (Should Pass)
- [ ] All features work perfectly
- [ ] Tab groups work in Chrome/Edge
- [ ] Firefox graceful degradation works
- [ ] Performance excellent with 100 tabs
- [ ] Performance acceptable with 500 tabs
- [ ] No medium severity bugs
- [ ] UI/UX is polished

---

## 🔄 Re-Testing After Fixes

If bugs are found and fixed:

1. Rebuild extension: `npm run build:all`
2. Reload extension in browser
3. Re-test affected features
4. Verify bug is fixed
5. Check for regressions
6. Update test results

---

## 📞 Support

### Documentation
- Design: `.kiro/specs/tab-manager-extension/design.md`
- Requirements: `.kiro/specs/tab-manager-extension/requirements.md`
- Tasks: `.kiro/specs/tab-manager-extension/tasks.md`

### Source Code
- Plugins: `src/plugins/`
- Components: `src/components/`
- Background: `src/background/`
- Tests: `tests/`

### Build
- Build config: `vite.config.ts`
- Manifests: `manifest.chrome.json`, `manifest.firefox.json`
- Package: `package.json`

---

## 🎯 Next Steps

After completing manual testing:

1. **Review results** - Analyze test results template
2. **Prioritize bugs** - Critical → High → Medium → Low
3. **Create issues** - Document bugs for development team
4. **Fix bugs** - Implement fixes for critical/high bugs
5. **Re-test** - Verify fixes work
6. **Release decision** - Determine if ready for release

---

## 📦 Deliverables

After testing, you should have:

- [ ] Completed TEST_RESULTS_TEMPLATE.md
- [ ] List of all bugs found
- [ ] Performance metrics documented
- [ ] Screenshots of issues (if any)
- [ ] Recommendations for improvements
- [ ] Go/No-Go decision for release

---

**Ready to start testing?** 

👉 Begin with **`QUICK_START_TESTING.md`**

**Questions?** 

👉 Check **`MANUAL_TESTING_GUIDE.md`** for detailed instructions

**Good luck!** 🚀
