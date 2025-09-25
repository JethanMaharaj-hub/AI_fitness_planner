import { chromium } from 'playwright';
import fs from 'fs';

async function debugStateIssue() {
  const browser = await chromium.launch({ 
    headless: false,
    devtools: true,
    slowMo: 100
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Navigate to the app
  await page.goto('http://localhost:3002');
  
  // Wait for the app to load
  await page.waitForLoadState('networkidle');
  
  console.log('✅ Connected to fitness app');
  
  // Navigate to Generate tab
  await page.click('button[aria-label="Generate"]');
  await page.waitForTimeout(1000);
  
  console.log('✅ Navigated to Generate tab');
  
  // Set up console logging to track state changes
  page.on('console', msg => {
    if (msg.text().includes('handleSetKnowledgeSources') || 
        msg.text().includes('sources') || 
        msg.text().includes('Analysis') ||
        msg.text().includes('knowledge')) {
      console.log(`🔍 Console: ${msg.text()}`);
    }
  });
  
  // Add some debugging JavaScript to the page
  await page.addInitScript(() => {
    // Override React state setter to log calls
    const originalSetState = React.useState;
    window.stateChanges = [];
    
    // Monitor knowledge sources state changes
    window.monitorStateChanges = true;
    
    // Log when sources array changes
    window.logSourcesChange = (sources, context) => {
      console.log(`🔄 Sources changed in ${context}: ${sources.length} sources`, 
        sources.map(s => ({ id: s.id, status: s.status })));
      window.stateChanges.push({
        timestamp: Date.now(),
        context,
        sourcesLength: sources.length,
        sources: sources.map(s => ({ id: s.id, status: s.status }))
      });
    };
  });
  
  // Get initial state
  const initialState = await page.evaluate(() => {
    // Try to access React state through the global React DevTools hook
    const reactFiberNode = document.querySelector('#root')._reactInternalFiber ||
                          document.querySelector('#root')._reactInternals;
    
    if (reactFiberNode) {
      console.log('Found React fiber node');
      return { found: true };
    }
    return { found: false };
  });
  
  console.log('Initial React state access:', initialState);
  
  // Upload a test image to trigger the state issue
  console.log('📁 Uploading test image...');
  
  // Create a simple test image file
  const testImagePath = '/tmp/test-image.png';
  fs.writeFileSync(testImagePath, Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
    0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
    0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,
    0x54, 0x08, 0x1D, 0x01, 0x01, 0x00, 0x00, 0xFF,
    0xFF, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01, 0x73,
    0x75, 0x01, 0x18, 0x00, 0x00, 0x00, 0x00, 0x49,
    0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
  ]));
  
  // Upload the test image
  await page.setInputFiles('input[type="file"]', testImagePath);
  
  // Wait for analysis to start
  await page.waitForTimeout(2000);
  
  console.log('⏳ Waiting for analysis to complete...');
  
  // Monitor state changes over time
  const monitoringInterval = setInterval(async () => {
    const currentSources = await page.evaluate(() => {
      // Try to get current sources count from the UI
      const sourcesElement = document.querySelector('h3');
      if (sourcesElement && sourcesElement.textContent.includes('Sources')) {
        return sourcesElement.textContent;
      }
      return 'Sources count not found';
    });
    
    console.log(`📊 Current UI state: ${currentSources}`);
  }, 1000);
  
  // Wait for analysis to complete (or timeout after 30 seconds)
  try {
    await page.waitForSelector('.bg-green-500', { timeout: 30000 });
    console.log('✅ Analysis completed - green status found');
  } catch (error) {
    console.log('⚠️  Timeout waiting for completion or error occurred');
  }
  
  clearInterval(monitoringInterval);
  
  // Check final state
  const finalState = await page.evaluate(() => {
    const sourcesHeading = document.querySelector('h3');
    const sourcesCount = sourcesHeading ? sourcesHeading.textContent : 'Not found';
    
    const sourceCards = document.querySelectorAll('.bg-gray-800');
    const sourceDetails = Array.from(sourceCards).map(card => {
      const statusElement = card.querySelector('.text-xs.font-bold');
      const status = statusElement ? statusElement.textContent : 'No status';
      return { status };
    });
    
    return {
      sourcesHeading: sourcesCount,
      sourceCards: sourceDetails,
      stateChanges: window.stateChanges || []
    };
  });
  
  console.log('\n📋 Final State Analysis:');
  console.log('- Sources heading:', finalState.sourcesHeading);
  console.log('- Source cards found:', finalState.sourceCards.length);
  console.log('- Source cards details:', finalState.sourceCards);
  console.log('- State changes tracked:', finalState.stateChanges.length);
  
  if (finalState.stateChanges.length > 0) {
    console.log('\n🔄 State Change History:');
    finalState.stateChanges.forEach((change, i) => {
      console.log(`  ${i + 1}. [${change.context}] ${change.sourcesLength} sources`);
      change.sources.forEach(s => {
        console.log(`     - ${s.id}: ${s.status}`);
      });
    });
  }
  
  // Check for the specific issue: sources becoming empty
  const hasEmptySourcesIssue = finalState.stateChanges.some(change => 
    change.sourcesLength === 0 && change.context !== 'initial'
  );
  
  if (hasEmptySourcesIssue) {
    console.log('\n🚨 ISSUE CONFIRMED: Sources array became empty during analysis!');
  } else {
    console.log('\n✅ No empty sources issue detected in this run');
  }
  
  // Keep the browser open for manual inspection
  console.log('\n🔍 Browser kept open for manual inspection...');
  console.log('Press Ctrl+C to close');
  
  // Wait indefinitely
  await new Promise(() => {});
}

// Handle cleanup
process.on('SIGINT', () => {
  console.log('\n👋 Closing browser...');
  process.exit(0);
});

debugStateIssue().catch(console.error);