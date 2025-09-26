import { chromium } from 'playwright';

async function finalValidationTest() {
  console.log('🚀 Starting final validation test with working YouTube URL...');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  const consoleMessages = [];
  page.on('console', (msg) => {
    const message = { type: msg.type(), text: msg.text(), timestamp: new Date().toISOString() };
    consoleMessages.push(message);
    console.log(`[${message.timestamp.split('T')[1].split('.')[0]}] ${msg.type().toUpperCase()}: ${msg.text()}`);
  });
  
  try {
    // Login
    console.log('🔐 Quick login...');
    await page.goto('http://localhost:3002', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    const emailInput = page.locator('input[type="email"]');
    if (await emailInput.count() > 0) {
      await emailInput.fill('jethan@bizai.co.za');
      await page.locator('input[type="password"]').fill('admin123');
      await page.locator('button').filter({ hasText: /sign.*in/i }).click();
      await page.waitForTimeout(3000);
    }
    
    // Test without adding any content (using existing knowledge)
    console.log('📝 Testing workout generation without new content...');
    const generateTab = page.locator('button').filter({ hasText: /generate/i });
    await generateTab.click();
    await page.waitForTimeout(1000);
    
    // Skip adding content and go directly to generation
    const generateButton = page.locator('button').filter({ hasText: /generate.*plan|generate.*workout/i }).first();
    if (await generateButton.count() > 0) {
      console.log('🚀 Starting generation with existing knowledge...');
      await generateButton.click();
      
      // Wait for generation
      let waitTime = 0;
      const maxWait = 30000; // 30 seconds
      
      while (waitTime < maxWait) {
        await page.waitForTimeout(2000);
        waitTime += 2000;
        
        const loading = page.locator('text=/generating|analyzing|consolidating|building/i');
        if (await loading.count() === 0) {
          console.log(`✅ Generation completed after ${waitTime/1000} seconds`);
          break;
        }
        console.log(`⏳ [${waitTime/1000}s] Generation in progress...`);
      }
      
      await page.screenshot({ path: 'test-screenshots/final-generation-complete.png', fullPage: true });
      
      // Check workout tab
      const workoutTab = page.locator('button').filter({ hasText: /workout/i });
      await workoutTab.click();
      await page.waitForTimeout(2000);
      
      await page.screenshot({ path: 'test-screenshots/final-workout-results.png', fullPage: true });
      
      // Get workout content
      const workoutText = await page.textContent('body');
      const workoutLines = workoutText.split('\\n').filter(line => 
        line.trim().length > 0 && 
        (line.toLowerCase().includes('day') || 
         line.toLowerCase().includes('exercise') || 
         line.toLowerCase().includes('workout') ||
         line.toLowerCase().includes('rep') ||
         line.toLowerCase().includes('set'))
      ).slice(0, 10);
      
      console.log('\\n📋 WORKOUT PLAN CONTENT (sample):');
      workoutLines.forEach((line, index) => {
        console.log(`   ${index + 1}. ${line.trim().substring(0, 80)}`);
      });
      
      // Test History tab
      const historyTab = page.locator('button').filter({ hasText: /history/i });
      await historyTab.click();
      await page.waitForTimeout(1000);
      
      await page.screenshot({ path: 'test-screenshots/final-history-check.png', fullPage: true });
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

finalValidationTest().catch(console.error);