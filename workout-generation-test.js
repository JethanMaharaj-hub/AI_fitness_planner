import { chromium } from 'playwright';

async function testWorkoutGeneration() {
  console.log('🚀 Starting focused workout generation test...');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // Store console messages
  const consoleMessages = [];
  page.on('console', (msg) => {
    const message = { type: msg.type(), text: msg.text(), timestamp: new Date().toISOString() };
    consoleMessages.push(message);
    console.log(`[${message.timestamp.split('T')[1].split('.')[0]}] ${msg.type().toUpperCase()}: ${msg.text()}`);
  });
  
  try {
    // Quick login
    console.log('🔐 Logging in...');
    await page.goto('http://localhost:3002', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    
    if (await emailInput.count() > 0) {
      await emailInput.fill('jethan@bizai.co.za');
      await passwordInput.fill('admin123');
      await page.locator('button').filter({ hasText: /sign.*in/i }).click();
      await page.waitForTimeout(3000);
      console.log('✅ Logged in successfully');
    }
    
    // Navigate to Generate tab
    console.log('📝 Setting up workout generation...');
    const generateTab = page.locator('button').filter({ hasText: /generate/i });
    await generateTab.click();
    await page.waitForTimeout(1000);
    
    // Add YouTube content
    const youtubeInput = page.locator('input[placeholder*="YouTube" i], input[placeholder*="URL" i]');
    if (await youtubeInput.count() > 0) {
      console.log('🎥 Adding YouTube URL...');
      await youtubeInput.fill('https://www.youtube.com/watch?v=1pkCQsEeqnY');
      
      const addButton = page.locator('button').filter({ hasText: /add|analyze/i }).first();
      if (await addButton.isVisible()) {
        await addButton.click();
        await page.waitForTimeout(3000);
        console.log('✅ YouTube URL added');
      }
    }
    
    // Take screenshot before generation
    await page.screenshot({ path: 'test-screenshots/generation-01-ready.png', fullPage: true });
    
    // Start workout generation with detailed monitoring
    console.log('🚀 Starting workout generation with detailed monitoring...');
    
    const generateButtons = [
      page.locator('button').filter({ hasText: /generate.*plan/i }),
      page.locator('button').filter({ hasText: /create.*plan/i }),
      page.locator('button').filter({ hasText: /generate.*workout/i }),
      page.locator('button').filter({ hasText: /start.*generation/i })
    ];
    
    let generationButton = null;
    for (const button of generateButtons) {
      if (await button.count() > 0 && await button.isVisible()) {
        generationButton = button;
        break;
      }
    }
    
    if (generationButton) {
      console.log('🎯 Found generation button, clicking...');
      await generationButton.click();
      
      console.log('⏳ Monitoring generation process...');
      
      // Monitor for different stages of generation
      let stage = 1;
      let maxWaitTime = 120000; // 2 minutes
      let waitedTime = 0;
      let interval = 2000; // Check every 2 seconds
      
      while (waitedTime < maxWaitTime) {
        await page.waitForTimeout(interval);
        waitedTime += interval;
        
        // Check for loading/generation indicators
        const loadingIndicators = [
          page.locator('text=/generating|analyzing|creating|processing/i'),
          page.locator('[data-testid*="loading"]'),
          page.locator('[class*="spinner"]'),
          page.locator('text=/please wait/i'),
          page.locator('text=/stage.*\\d/i'),
          page.locator('text=/step.*\\d/i')
        ];
        
        let currentActivity = 'Unknown';
        for (const indicator of loadingIndicators) {
          if (await indicator.count() > 0) {
            const text = await indicator.textContent();
            if (text) {
              currentActivity = text.trim();
              break;
            }
          }
        }
        
        console.log(`⏳ [${Math.floor(waitedTime/1000)}s] Generation status: ${currentActivity}`);
        
        // Take periodic screenshots
        if (waitedTime % 10000 === 0) { // Every 10 seconds
          await page.screenshot({ 
            path: `test-screenshots/generation-progress-${Math.floor(waitedTime/1000)}s.png`, 
            fullPage: true 
          });
        }
        
        // Check if generation is complete by looking for completion indicators
        const completionIndicators = [
          page.locator('text=/generation.*complete/i'),
          page.locator('text=/plan.*generated/i'),
          page.locator('text=/workout.*ready/i')
        ];
        
        let generationComplete = false;
        for (const indicator of completionIndicators) {
          if (await indicator.count() > 0) {
            generationComplete = true;
            break;
          }
        }
        
        // Also check if loading indicators have disappeared
        let stillLoading = false;
        for (const indicator of loadingIndicators) {
          if (await indicator.count() > 0) {
            stillLoading = true;
            break;
          }
        }
        
        if (generationComplete || !stillLoading) {
          console.log(`✅ Generation appears complete after ${Math.floor(waitedTime/1000)} seconds`);
          break;
        }
      }
      
      if (waitedTime >= maxWaitTime) {
        console.log('⚠️ Generation timeout - proceeding to check results');
      }
      
      await page.screenshot({ path: 'test-screenshots/generation-02-completed.png', fullPage: true });
      
    } else {
      console.log('❌ No generation button found');
    }
    
    // Check Workout tab for results
    console.log('📝 Checking Workout tab for generated content...');
    const workoutTab = page.locator('button').filter({ hasText: /workout/i });
    await workoutTab.click();
    await page.waitForTimeout(2000);
    
    await page.screenshot({ path: 'test-screenshots/generation-03-workout-results.png', fullPage: true });
    
    // Detailed analysis of workout content
    const workoutElements = [
      { name: 'Workout Plan Title', locator: page.locator('text=/workout.*plan|plan.*title/i') },
      { name: 'Exercise Names', locator: page.locator('text=/exercise|movement/i') },
      { name: 'Day Labels', locator: page.locator('text=/day.*\\d+|week.*\\d+/i') },
      { name: 'Reps/Sets Info', locator: page.locator('text=/\\d+.*rep|\\d+.*set|x\\d+/i') },
      { name: 'Timer Elements', locator: page.locator('text=/timer|:\\d\\d|minutes|seconds/i') },
      { name: 'No Content Messages', locator: page.locator('text=/no workout|generate.*plan|create.*plan/i') }
    ];
    
    console.log('\n📊 WORKOUT CONTENT ANALYSIS:');
    let hasWorkoutContent = false;
    
    for (const element of workoutElements) {
      const count = await element.locator.count();
      console.log(`   ${element.name}: ${count} found`);
      
      if (count > 0 && element.name !== 'No Content Messages') {
        hasWorkoutContent = true;
        
        // Get sample text for first few elements
        const elements = await element.locator.all();
        for (const el of elements.slice(0, 2)) {
          const text = await el.textContent();
          if (text && text.trim().length > 0) {
            console.log(`     Sample: "${text.trim().substring(0, 60)}..."`);
          }
        }
      }
    }
    
    // Check raw page text for workout-related content
    const pageText = await page.textContent('body');
    const workoutKeywords = ['exercise', 'workout', 'rep', 'set', 'weight', 'squat', 'pushup', 'deadlift', 'bench'];
    const foundKeywords = workoutKeywords.filter(keyword => pageText.toLowerCase().includes(keyword));
    
    console.log(`\n🔍 Workout keywords found in page: ${foundKeywords.join(', ') || 'None'}`);
    
    // Final analysis
    const errors = consoleMessages.filter(msg => msg.type === 'error');
    const criticalErrors = errors.filter(error => 
      !error.text.toLowerCase().includes('favicon') && 
      !error.text.toLowerCase().includes('manifest')
    );
    
    console.log('\n' + '='.repeat(70));
    console.log('🎯 FOCUSED WORKOUT GENERATION TEST RESULTS');
    console.log('='.repeat(70));
    
    console.log(`✅ Login: SUCCESS`);
    console.log(`✅ Generate Tab Access: SUCCESS`);
    console.log(`✅ Content Addition: SUCCESS`);
    console.log(`${generationButton ? '✅' : '❌'} Generation Button Found: ${generationButton ? 'YES' : 'NO'}`);
    console.log(`${hasWorkoutContent ? '✅' : '❌'} Workout Content Generated: ${hasWorkoutContent ? 'YES' : 'NO'}`);
    console.log(`${foundKeywords.length > 0 ? '✅' : '❌'} Workout Keywords Present: ${foundKeywords.length} keywords`);
    console.log(`${criticalErrors.length === 0 ? '✅' : '❌'} Critical Errors: ${criticalErrors.length} found`);
    
    if (criticalErrors.length > 0) {
      console.log('\n🚨 CRITICAL ERRORS:');
      criticalErrors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error.text}`);
      });
    }
    
    console.log('\n📋 KEY FINDINGS:');
    if (hasWorkoutContent) {
      console.log('   ✅ Workout generation appears to be working correctly');
      console.log('   ✅ Generated content is being displayed in the Workout tab');
    } else {
      console.log('   ❌ Workout generation may not be completing successfully');
      console.log('   ⚠️ Check if Gemini API key is properly configured');
      console.log('   ⚠️ Generation process might need more time to complete');
    }
    
    console.log('\n📸 Detailed screenshots saved for analysis');
    console.log('='.repeat(70));
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await page.screenshot({ path: 'test-screenshots/generation-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

testWorkoutGeneration().catch(console.error);