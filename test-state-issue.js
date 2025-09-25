import { chromium } from 'playwright';

async function testStateIssue() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // Navigate to app
  await page.goto('http://localhost:3002');
  await page.waitForLoadState('networkidle');
  
  // Sign in with the provided credentials
  try {
    await page.fill('#email', 'jethan@bizai.co.za');
    await page.fill('#password', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    console.log('✅ Signed in successfully');
  } catch (e) {
    console.log('⚠️  Auth failed or already logged in');
  }
  
  // Navigate to Generate tab
  await page.click('button[aria-label="Generate"]');
  await page.waitForTimeout(1000);
  
  // Monitor console for state changes
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('handleSetKnowledgeSources') || text.includes('Analysis')) {
      console.log(`🔍 ${text}`);
    }
  });
  
  // Upload a test image
  const testImage = Buffer.from([
    137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82,0,0,0,1,0,0,0,1,8,6,0,0,0,31,21,196,137,0,0,0,9,112,72,89,115,0,0,11,19,0,0,11,19,1,0,154,156,24,0,0,0,13,73,68,65,84,8,215,99,248,15,0,0,1,0,1,0,24,221,141,219,0,0,0,0,73,69,78,68,174,66,96,130
  ]);
  
  await page.setInputFiles('input[type="file"]', {
    name: 'test.png',
    mimeType: 'image/png',
    buffer: testImage,
  });
  
  console.log('📁 Image uploaded, monitoring state...');
  
  // Monitor sources count in UI
  let lastSourcesCount = 0;
  const interval = setInterval(async () => {
    try {
      const sourcesText = await page.textContent('h3');
      if (sourcesText && sourcesText.includes('Sources')) {
        const match = sourcesText.match(/Sources \\((\\d+)\\)/);
        if (match) {
          const count = parseInt(match[1]);
          if (count !== lastSourcesCount) {
            console.log(`📊 Sources count changed: ${lastSourcesCount} → ${count}`);
            lastSourcesCount = count;
            
            if (count === 0 && lastSourcesCount > 0) {
              console.log('🚨 ISSUE DETECTED: Sources count dropped to 0!');
            }
          }
        }
      }
    } catch (e) {
      // Ignore errors during monitoring
    }
  }, 500);
  
  // Wait for analysis to complete or timeout
  try {
    await page.waitForSelector('.bg-green-500', { timeout: 15000 });
    console.log('✅ Analysis completed');
  } catch (e) {
    console.log('⏰ Analysis timeout or failed');
  }
  
  clearInterval(interval);
  
  // Final check
  const finalSourcesText = await page.textContent('h3');
  console.log(`📋 Final sources state: ${finalSourcesText}`);
  
  await browser.close();
}

testStateIssue().catch(console.error);