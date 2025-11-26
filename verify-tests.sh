#!/bin/bash

echo "=========================================="
echo "Verifying Test Setup"
echo "=========================================="
echo ""

echo "1. Testing root (core runtime)..."
npm test -- tests/unit/runtime.test.ts
ROOT_EXIT=$?

echo ""
echo "2. Testing documentation-engine demo..."
cd demo/documentation-engine
npm test -- tests/unit/theme.test.ts
DOCS_EXIT=$?
cd ../..

echo ""
echo "3. Testing tab-manager demo..."
cd demo/tab-manager
npm test -- tests/unit/setup.test.ts
TAB_EXIT=$?
cd ../..

echo ""
echo "=========================================="
echo "Results:"
echo "=========================================="
echo "Root tests: $([ $ROOT_EXIT -eq 0 ] && echo '✅ PASS' || echo '❌ FAIL')"
echo "Documentation engine: $([ $DOCS_EXIT -eq 0 ] && echo '✅ PASS' || echo '❌ FAIL')"
echo "Tab manager: $([ $TAB_EXIT -eq 0 ] && echo '✅ PASS' || echo '❌ FAIL')"
echo ""

if [ $ROOT_EXIT -eq 0 ] && [ $DOCS_EXIT -eq 0 ] && [ $TAB_EXIT -eq 0 ]; then
    echo "✅ All test suites configured correctly!"
    exit 0
else
    echo "❌ Some test suites need attention"
    exit 1
fi
