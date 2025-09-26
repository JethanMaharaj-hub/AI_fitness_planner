import { chromium } from 'playwright';

async function runLoginTest() {
  console.log('🚀 Starting AI Fitness Planner test with existing credentials...');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // Store console messages
  const consoleMessages = [];
  page.on('console', (msg) => {
    consoleMessages.push({ type: msg.type(), text: msg.text() });
    console.log(`${msg.type().toUpperCase()}: ${msg.text()}`);
  });
  
  try {
    // Step 1: Navigate to the app
    console.log('📝 Step 1: Navigating to http://localhost:3002...');
    await page.goto('http://localhost:3002', { waitUntil: 'networkidle', timeout: 30000 });
    await page.screenshot({ path: 'test-screenshots/login-01-initial-load.png', fullPage: true });

    // Wait a moment for the page to fully load
    await page.waitForTimeout(2000);

    // Step 2: Look for authentication form and try to log in
    console.log('📝 Step 2: Looking for login form...');
    
    const emailInput = page.locator('input[type="email"], input[placeholder*="email" i]');
    const passwordInput = page.locator('input[type="password"], input[placeholder*="password" i]');
    
    if (await emailInput.count() > 0 && await passwordInput.count() > 0) {
      console.log('🔐 Login form found - attempting to sign in with provided credentials...');
      
      // Fill in the credentials you provided
      await emailInput.fill('jethan@bizai.co.za');
      await passwordInput.fill('admin123');
      console.log('✅ Credentials entered: jethan@bizai.co.za');
      
      await page.screenshot({ path: 'test-screenshots/login-02-credentials-entered.png', fullPage: true });
      
      // Look for sign in button - try various text patterns
      const signInButtons = [
        page.locator('button').filter({ hasText: /sign.*in/i }),
        page.locator('button').filter({ hasText: /log.*in/i }),
        page.locator('button').filter({ hasText: /login/i }),
        page.locator('button[type="submit"]')
      ];
      
      let loginButtonClicked = false;
      for (const button of signInButtons) {
        if (await button.count() > 0 && await button.isVisible()) {
          await button.click();
          console.log('✅ Login button clicked');
          loginButtonClicked = true;
          break;
        }
      }
      
      if (!loginButtonClicked) {
        console.log('⚠️ No login button found, trying Enter key...');
        await passwordInput.press('Enter');
      }
      
      // Wait for authentication to complete
      await page.waitForTimeout(5000);
      
      await page.screenshot({ path: 'test-screenshots/login-03-after-login-attempt.png', fullPage: true });
      
      // Check for authentication errors
      const errorMessages = page.locator('text=/error|invalid|incorrect|failed|wrong/i');
      if (await errorMessages.count() > 0) {
        console.log('❌ Authentication error messages found:');
        const errors = await errorMessages.all();
        for (const error of errors.slice(0, 3)) {
          const text = await error.textContent();
          console.log(`   - ${text}`);
        }
      }
      
    } else {
      console.log('⚠️ No authentication form found - checking if app is accessible without auth');
    }
    
    // Step 3: Check if we have access to the main app
    console.log('📝 Step 3: Checking for main app interface...');
    await page.waitForTimeout(2000);
    
    // Look for main app navigation tabs
    const mainAppTabs = [
      { name: 'Profile', locator: page.locator('button').filter({ hasText: /profile/i }) },
      { name: 'Generate', locator: page.locator('button').filter({ hasText: /generate/i }) },
      { name: 'Workout', locator: page.locator('button').filter({ hasText: /workout/i }) },
      { name: 'History', locator: page.locator('button').filter({ hasText: /history/i }) }
    ];
    
    let accessibleTabs = [];
    for (const tab of mainAppTabs) {
      const count = await tab.locator.count();
      if (count > 0) {
        accessibleTabs.push(tab.name);
      }
    }
    
    const mainAppAccessible = accessibleTabs.length > 0;
    
    if (mainAppAccessible) {
      console.log(`✅ Main app is accessible! Found tabs: ${accessibleTabs.join(', ')}`);
      
      // Step 4: Test Profile tab
      console.log('📝 Step 4: Testing Profile tab...');
      const profileTab = mainAppTabs.find(t => t.name === 'Profile')?.locator;
      if (profileTab && await profileTab.count() > 0) {
        await profileTab.click();
        await page.waitForTimeout(1000);
        console.log('✅ Profile tab clicked');
        
        await page.screenshot({ path: 'test-screenshots/login-04-profile-tab.png', fullPage: true });
        
        // Quick profile setup
        const fitnessLevelButtons = page.locator('button').filter({ hasText: /advanced|intermediate|beginner/i });
        if (await fitnessLevelButtons.count() > 0) {
          await fitnessLevelButtons.first().click();
          console.log('✅ Fitness level selected');
        }
        
        const goalButtons = page.locator('button').filter({ hasText: /muscle|strength|endurance/i });
        if (await goalButtons.count() > 0) {
          await goalButtons.first().click();
          console.log('✅ Fitness goal selected');
        }
        
        const equipmentButtons = page.locator('button').filter({ hasText: /barbell|dumbbell|kettlebell/i });
        if (await equipmentButtons.count() > 0) {
          await equipmentButtons.first().click();
          console.log('✅ Equipment selected');
        }
        
        await page.screenshot({ path: 'test-screenshots/login-05-profile-configured.png', fullPage: true });
      }
      
      // Step 5: Test Generate tab
      console.log('📝 Step 5: Testing Generate tab...');
      const generateTab = mainAppTabs.find(t => t.name === 'Generate')?.locator;
      if (generateTab && await generateTab.count() > 0) {
        await generateTab.click();
        await page.waitForTimeout(1000);
        console.log('✅ Generate tab clicked');
        
        await page.screenshot({ path: 'test-screenshots/login-06-generate-tab.png', fullPage: true });
        
        // Look for input methods
        const youtubeInput = page.locator('input[placeholder*="YouTube" i], input[placeholder*="URL" i]');
        const fileInput = page.locator('input[type="file"]');
        
        console.log(`Found ${await youtubeInput.count()} YouTube URL inputs`);
        console.log(`Found ${await fileInput.count()} file inputs`);
        
        // Try adding a YouTube URL if input is available
        if (await youtubeInput.count() > 0) {
          console.log('🎥 Adding YouTube URL for workout generation...');
          await youtubeInput.fill('https://www.youtube.com/watch?v=1pkCQsEeqnY'); // Fitness video
          
          // Look for add/analyze button
          const addButtons = page.locator('button').filter({ hasText: /add|analyze|upload/i });
          if (await addButtons.count() > 0 && await addButtons.first().isVisible()) {
            await addButtons.first().click();
            console.log('✅ YouTube URL added');
            await page.waitForTimeout(3000);
          }
        }
        
        await page.screenshot({ path: 'test-screenshots/login-07-content-added.png', fullPage: true });
        
        // Look for generate workout button
        const generateButtons = [
          page.locator('button').filter({ hasText: /generate.*plan/i }),
          page.locator('button').filter({ hasText: /create.*plan/i }),
          page.locator('button').filter({ hasText: /generate.*workout/i }),
          page.locator('button').filter({ hasText: /start.*generation/i }),
          page.locator('button').filter({ hasText: /^generate$/i })
        ];
        
        let generationStarted = false;
        for (const button of generateButtons) {
          if (await button.count() > 0 && await button.isVisible()) {
            console.log('🚀 Starting workout generation...');
            await button.click();
            generationStarted = true;
            
            // Wait for generation to start
            await page.waitForTimeout(2000);
            
            // Look for loading indicators
            const loadingIndicators = [
              page.locator('text=/generating|analyzing|creating|processing/i'),
              page.locator('[data-testid*="loading"]'),
              page.locator('[class*="spinner"]')
            ];
            
            let loadingFound = false;
            for (const indicator of loadingIndicators) {
              if (await indicator.count() > 0) {
                console.log('⏳ Generation in progress...');
                loadingFound = true;
                try {
                  await indicator.waitFor({ state: 'hidden', timeout: 60000 });
                  console.log('✅ Generation completed');
                } catch (e) {
                  console.log('⚠️ Generation may still be in progress (timeout)');
                }
                break;
              }
            }
            
            if (!loadingFound) {
              // Wait a reasonable time anyway
              await page.waitForTimeout(15000);
              console.log('⏳ Waited for generation process');
            }
            break;
          }
        }
        
        if (!generationStarted) {
          console.log('⚠️ Could not find or click generate button');
        }
        
        await page.screenshot({ path: 'test-screenshots/login-08-after-generation.png', fullPage: true });
      }
      
      // Step 6: Check Workout tab for results
      console.log('📝 Step 6: Checking Workout tab for generated plan...');
      const workoutTab = mainAppTabs.find(t => t.name === 'Workout')?.locator;
      if (workoutTab && await workoutTab.count() > 0) {
        await workoutTab.click();
        await page.waitForTimeout(2000);
        console.log('✅ Workout tab clicked');
        
        await page.screenshot({ path: 'test-screenshots/login-09-workout-tab.png', fullPage: true });
        
        // Check for workout content
        const workoutContent = page.locator('text=/workout.*plan|exercise|day.*1|movement|rep|set/i');
        const noWorkoutMsg = page.locator('text=/no workout|generate.*plan|create.*plan/i');
        
        const hasWorkout = await workoutContent.count() > 0;
        const hasNoWorkoutMsg = await noWorkoutMsg.count() > 0;
        
        if (hasWorkout && !hasNoWorkoutMsg) {
          console.log('✅ Workout plan found in Workout tab');
          
          // Get some sample content
          const workoutElements = await workoutContent.all();
          console.log('📋 Sample workout content:');
          for (const element of workoutElements.slice(0, 3)) {
            const text = await element.textContent();
            if (text && text.trim().length > 0) {
              console.log(`   - ${text.trim().substring(0, 100)}...`);
            }
          }
        } else if (hasNoWorkoutMsg) {
          console.log('❌ No workout plan generated yet');
        } else {
          console.log('⚠️ Unclear workout generation status');
        }
      }
      
      // Step 7: Check History tab
      console.log('📝 Step 7: Checking History tab...');
      const historyTab = mainAppTabs.find(t => t.name === 'History')?.locator;
      if (historyTab && await historyTab.count() > 0) {
        await historyTab.click();
        await page.waitForTimeout(1000);
        console.log('✅ History tab clicked');
        await page.screenshot({ path: 'test-screenshots/login-10-history-tab.png', fullPage: true });
      }
      
    } else {
      console.log('❌ Main app interface not accessible - authentication likely failed');
    }
    
    // Final analysis
    const errors = consoleMessages.filter(msg => msg.type === 'error');
    const warnings = consoleMessages.filter(msg => msg.type === 'warning');
    
    // Filter out non-critical errors
    const criticalErrors = errors.filter(error => {
      const text = error.text.toLowerCase();
      return !text.includes('favicon') && 
             !text.includes('manifest') && 
             !text.includes('service-worker') &&
             !text.includes('sw.js');
    });
    
    await page.screenshot({ path: 'test-screenshots/login-11-final-state.png', fullPage: true });
    
    console.log('\n' + '='.repeat(60));
    console.log('🏁 COMPREHENSIVE LOGIN & FUNCTIONALITY TEST RESULTS');
    console.log('='.repeat(60));
    
    console.log(`✅ App Loading: SUCCESS`);
    console.log(`${mainAppAccessible ? '✅' : '❌'} Main App Access: ${mainAppAccessible ? 'SUCCESS' : 'FAILED'}`);
    console.log(`✅ Available Tabs: ${accessibleTabs.join(', ') || 'None'}`);
    console.log(`${criticalErrors.length === 0 ? '✅' : '❌'} Critical Console Errors: ${criticalErrors.length} found`);
    console.log(`${warnings.length < 10 ? '✅' : '⚠️'} Console Warnings: ${warnings.length} found`);
    
    if (criticalErrors.length > 0) {
      console.log('\n🚨 CRITICAL CONSOLE ERRORS:');
      criticalErrors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error.text}`);
      });
    }
    
    if (warnings.length > 0 && warnings.length <= 10) {
      console.log('\n⚠️ CONSOLE WARNINGS:');
      warnings.forEach((warning, index) => {
        console.log(`   ${index + 1}. ${warning.text}`);
      });
    } else if (warnings.length > 10) {
      console.log(`\n⚠️ ${warnings.length} CONSOLE WARNINGS (showing first 3):`);
      warnings.slice(0, 3).forEach((warning, index) => {
        console.log(`   ${index + 1}. ${warning.text}`);
      });
    }
    
    console.log('\n📸 All screenshots saved in test-screenshots/ directory');
    console.log('🎯 Test completed successfully!');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    await page.screenshot({ path: 'test-screenshots/login-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

runLoginTest().catch(console.error);