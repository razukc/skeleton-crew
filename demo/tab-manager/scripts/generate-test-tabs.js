/**
 * Test Tab Generator
 * 
 * This script helps generate multiple tabs for performance testing.
 * Run this in the browser console to create test tabs.
 * 
 * WARNING: Opening many tabs can slow down your browser!
 */

// Configuration
const TEST_SCENARIOS = {
  light: 10,
  normal: 100,
  heavy: 500
};

/**
 * Generate test tabs
 * @param {number} count - Number of tabs to create
 * @param {string} baseUrl - Base URL for tabs (default: example.com)
 */
function generateTestTabs(count, baseUrl = 'https://example.com') {
  console.log(`🚀 Generating ${count} test tabs...`);
  
  const startTime = Date.now();
  let created = 0;
  
  // Create tabs in batches to avoid overwhelming the browser
  const batchSize = 10;
  const batches = Math.ceil(count / batchSize);
  
  for (let batch = 0; batch < batches; batch++) {
    const batchCount = Math.min(batchSize, count - created);
    
    setTimeout(() => {
      for (let i = 0; i < batchCount; i++) {
        const tabNumber = created + i + 1;
        const url = `${baseUrl}?tab=${tabNumber}&batch=${batch + 1}`;
        window.open(url, '_blank');
      }
      
      created += batchCount;
      console.log(`✓ Created ${created}/${count} tabs`);
      
      if (created >= count) {
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`✅ Done! Created ${count} tabs in ${duration}s`);
      }
    }, batch * 1000); // 1 second delay between batches
  }
}

/**
 * Generate tabs with variety (different domains)
 * @param {number} count - Number of tabs to create
 */
function generateVariedTestTabs(count) {
  console.log(`🚀 Generating ${count} varied test tabs...`);
  
  const domains = [
    'https://example.com',
    'https://github.com',
    'https://stackoverflow.com',
    'https://developer.mozilla.org',
    'https://www.wikipedia.org',
    'https://www.reddit.com',
    'https://news.ycombinator.com',
    'https://www.youtube.com'
  ];
  
  const startTime = Date.now();
  let created = 0;
  
  const batchSize = 10;
  const batches = Math.ceil(count / batchSize);
  
  for (let batch = 0; batch < batches; batch++) {
    const batchCount = Math.min(batchSize, count - created);
    
    setTimeout(() => {
      for (let i = 0; i < batchCount; i++) {
        const tabNumber = created + i + 1;
        const domain = domains[tabNumber % domains.length];
        const url = `${domain}?test=tab${tabNumber}`;
        window.open(url, '_blank');
      }
      
      created += batchCount;
      console.log(`✓ Created ${created}/${count} tabs`);
      
      if (created >= count) {
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`✅ Done! Created ${count} varied tabs in ${duration}s`);
      }
    }, batch * 1000);
  }
}

/**
 * Generate duplicate tabs for testing duplicate detection
 * @param {number} uniqueUrls - Number of unique URLs
 * @param {number} duplicatesPerUrl - Duplicates per URL
 */
function generateDuplicateTabs(uniqueUrls = 5, duplicatesPerUrl = 3) {
  console.log(`🚀 Generating ${uniqueUrls * duplicatesPerUrl} tabs (${uniqueUrls} unique URLs, ${duplicatesPerUrl} duplicates each)...`);
  
  const urls = [];
  for (let i = 1; i <= uniqueUrls; i++) {
    urls.push(`https://example.com/page${i}`);
  }
  
  let created = 0;
  const total = uniqueUrls * duplicatesPerUrl;
  
  urls.forEach((url, urlIndex) => {
    for (let dup = 0; dup < duplicatesPerUrl; dup++) {
      setTimeout(() => {
        window.open(url, '_blank');
        created++;
        console.log(`✓ Created ${created}/${total} tabs`);
        
        if (created >= total) {
          console.log(`✅ Done! Created ${total} tabs with duplicates`);
        }
      }, (urlIndex * duplicatesPerUrl + dup) * 200);
    }
  });
}

/**
 * Close all tabs except the current one
 * WARNING: This will close ALL tabs!
 */
function closeAllTestTabs() {
  if (!confirm('⚠️ This will close ALL tabs except the current one. Continue?')) {
    return;
  }
  
  console.log('🗑️ Closing all tabs...');
  
  // This only works if you have the extension installed
  // Otherwise, you'll need to close tabs manually
  console.log('Note: You may need to use the extension to close all tabs');
  console.log('Or use: Ctrl+W (Cmd+W on Mac) repeatedly');
}

// Export functions for use
window.testTabGenerator = {
  // Quick scenarios
  light: () => generateTestTabs(TEST_SCENARIOS.light),
  normal: () => generateTestTabs(TEST_SCENARIOS.normal),
  heavy: () => generateTestTabs(TEST_SCENARIOS.heavy),
  
  // Custom
  generate: generateTestTabs,
  generateVaried: generateVariedTestTabs,
  generateDuplicates: generateDuplicateTabs,
  
  // Cleanup
  closeAll: closeAllTestTabs,
  
  // Help
  help: () => {
    console.log(`
📖 Test Tab Generator - Usage

Quick Scenarios:
  testTabGenerator.light()     - Generate 10 tabs
  testTabGenerator.normal()    - Generate 100 tabs
  testTabGenerator.heavy()     - Generate 500 tabs (⚠️ slow!)

Custom Generation:
  testTabGenerator.generate(50)                    - Generate 50 tabs
  testTabGenerator.generateVaried(100)             - Generate 100 varied tabs
  testTabGenerator.generateDuplicates(5, 3)        - Generate 5 URLs × 3 duplicates

Cleanup:
  testTabGenerator.closeAll()  - Close all tabs (⚠️ careful!)

Examples:
  testTabGenerator.light()                         // 10 tabs for quick testing
  testTabGenerator.generate(25, 'https://github.com') // 25 GitHub tabs
  testTabGenerator.generateDuplicates(10, 5)       // 50 tabs with duplicates
    `);
  }
};

// Show help on load
console.log('✅ Test Tab Generator loaded!');
console.log('Type: testTabGenerator.help() for usage');
