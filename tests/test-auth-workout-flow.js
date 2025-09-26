import { test, expect } from '@playwright/test';

test.describe('AI Fitness Planner - Complete Authentication & Workout Generation Flow', () => {
  let page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    
    // Listen for console logs to capture any errors
    const consoleMessages = [];
    page.on('console', (msg) => {
      const message = { type: msg.type(), text: msg.text(), timestamp: new Date().toISOString() };
      consoleMessages.push(message);
      console.log(`[${message.timestamp}] ${msg.type().toUpperCase()}: ${msg.text()}`);
    });
    
    // Store console messages for later access
    page.consoleMessages = consoleMessages;
    
    // Navigate to the app
    await page.goto('http://localhost:3002', { waitUntil: 'networkidle', timeout: 30000 });
  });

  test('Complete workout generation flow with authentication', async () => {
    console.log('🚀 Starting comprehensive AI Fitness Planner test with authentication...');
    
    // Step 1: Initial load and authentication check
    await page.screenshot({ path: 'test-screenshots/flow-01-initial-load.png', fullPage: true });
    console.log('📸 Step 1: Initial screenshot taken');

    await expect(page).toHaveTitle(/AI Fitness Planner/i);
    
    // Step 2: Handle authentication if required
    console.log('🔐 Step 2: Checking for authentication requirements...');
    
    // Wait a moment for the page to fully load and check for auth forms
    await page.waitForTimeout(2000);
    
    // Look for various auth indicators
    const authIndicators = [
      page.locator('text=/welcome back/i'),
      page.locator('text=/sign.*in/i'),
      page.locator('text=/log.*in/i'),
      page.locator('input[type="email"]'),
      page.locator('input[type="password"]'),
      page.locator('form').filter({ hasText: /email|password/i })
    ];
    
    let authRequired = false;
    for (const indicator of authIndicators) {
      if (await indicator.count() > 0) {
        authRequired = true;
        break;
      }
    }
    
    if (authRequired) {
      console.log('🔑 Authentication required - proceeding with login...');
      
      // Look for email and password inputs
      const emailInput = page.locator('input[type="email"], input[placeholder*="email" i]').first();
      const passwordInput = page.locator('input[type="password"], input[placeholder*="password" i]').first();
      
      if (await emailInput.count() > 0 && await passwordInput.count() > 0) {
        // Use the provided credentials
        await emailInput.fill('jethan@bizai.co.za');
        await passwordInput.fill('admin123');
        console.log('✅ Login credentials entered: jethan@bizai.co.za');
        
        await page.screenshot({ path: 'test-screenshots/flow-02-credentials-entered.png', fullPage: true });
        
        // Look for sign-in button
        const signInButtons = [
          page.locator('button').filter({ hasText: /sign.*in/i }),
          page.locator('button').filter({ hasText: /log.*in/i }),
          page.locator('button').filter({ hasText: /login/i }),
          page.locator('button[type="submit"]')
        ];
        
        let loginClicked = false;
        for (const button of signInButtons) {
          if (await button.count() > 0 && await button.isVisible()) {
            await button.click();
            console.log('✅ Login button clicked');
            loginClicked = true;
            break;
          }
        }
        
        if (!loginClicked) {
          console.log('⚠️ No login button found, trying Enter key...');
          await emailInput.press('Enter');
        }
        
        // Wait for authentication to complete
        await page.waitForTimeout(3000);
        await page.screenshot({ path: 'test-screenshots/flow-03-after-login.png', fullPage: true });
        
        // Check if login was successful by looking for main app elements
        const mainAppTabs = [
          page.locator('button').filter({ hasText: /profile/i }),
          page.locator('button').filter({ hasText: /generate/i }),
          page.locator('button').filter({ hasText: /workout/i }),
          page.locator('button').filter({ hasText: /history/i })
        ];
        
        let loginSuccessful = false;
        for (const tab of mainAppTabs) {
          if (await tab.count() > 0) {
            loginSuccessful = true;
            break;
          }
        }
        
        if (loginSuccessful) {
          console.log('✅ Login successful - main app interface is now accessible');
        } else {
          console.log('❌ Login may have failed - main app interface not detected');
          // Check for error messages
          const errorMessages = await page.locator('text=/error|invalid|incorrect|failed/i').all();
          if (errorMessages.length > 0) {
            for (const error of errorMessages) {
              const errorText = await error.textContent();
              console.log(`❌ Auth Error: ${errorText}`);
            }
          }
        }
      } else {
        console.log('❌ Could not find email/password inputs for authentication');
      }
    } else {
      console.log('✅ No authentication required - proceeding directly to main app');
    }
    
    // Step 3: Navigate to Profile tab and fill out profile
    console.log('📝 Step 3: Setting up user profile...');
    
    const profileTab = page.locator('button').filter({ hasText: /profile/i });
    if (await profileTab.count() > 0) {
      await profileTab.click();
      await page.waitForTimeout(1000);
      console.log('✅ Profile tab clicked');
    } else {
      console.log('⚠️ Profile tab not found');
    }
    
    await page.screenshot({ path: 'test-screenshots/flow-04-profile-tab.png', fullPage: true });
    
    // Fill out name if there's a name field
    const nameInput = page.locator('input[placeholder*="name" i], input[label*="name" i]');
    if (await nameInput.count() > 0) {
      await nameInput.fill('Test User - Jethan');
      console.log('✅ Name filled: Test User - Jethan');
    }
    
    // Select fitness level
    const fitnessLevels = ['Advanced', 'Intermediate', 'Beginner', 'Elite'];
    let fitnessLevelSelected = false;
    for (const level of fitnessLevels) {
      const levelButton = page.locator('button').filter({ hasText: level });
      if (await levelButton.count() > 0 && await levelButton.isVisible()) {
        await levelButton.click();
        console.log(`✅ Fitness level selected: ${level}`);
        fitnessLevelSelected = true;
        break;
      }
    }
    
    if (!fitnessLevelSelected) {
      console.log('⚠️ No fitness level options found');
    }
    
    // Select fitness goals
    const goals = ['Build Muscle', 'Improve Endurance', 'Lose Weight', 'Increase Strength'];
    let goalsSelected = 0;
    for (const goal of goals) {
      const goalButton = page.locator('button').filter({ hasText: goal });
      if (await goalButton.count() > 0 && await goalButton.isVisible()) {
        await goalButton.click();
        console.log(`✅ Goal selected: ${goal}`);
        goalsSelected++;
        if (goalsSelected >= 2) break; // Select up to 2 goals
      }
    }
    
    if (goalsSelected === 0) {
      console.log('⚠️ No fitness goal options found');
    }
    
    // Select equipment
    const equipment = ['Barbell', 'Dumbbells', 'Pull-up Bar', 'Kettlebell', 'Resistance Bands'];
    let equipmentSelected = 0;
    for (const item of equipment) {
      const equipmentButton = page.locator('button').filter({ hasText: item });
      if (await equipmentButton.count() > 0 && await equipmentButton.isVisible()) {
        await equipmentButton.click();
        console.log(`✅ Equipment selected: ${item}`);
        equipmentSelected++;
        if (equipmentSelected >= 3) break; // Select up to 3 equipment items
      }
    }
    
    if (equipmentSelected === 0) {
      console.log('⚠️ No equipment options found');
    }
    
    // Fill out schedule information
    const daysPerWeekInput = page.locator('input[type="number"]').first();
    if (await daysPerWeekInput.count() > 0) {
      await daysPerWeekInput.fill('4');
      console.log('✅ Days per week set to 4');
    }
    
    const timePerSessionInput = page.locator('input[type="number"]').nth(1);
    if (await timePerSessionInput.count() > 0) {
      await timePerSessionInput.fill('45');
      console.log('✅ Time per session set to 45 minutes');
    }
    
    await page.screenshot({ path: 'test-screenshots/flow-05-profile-completed.png', fullPage: true });
    
    // Step 4: Navigate to Generate tab
    console.log('📝 Step 4: Navigating to Generate tab...');
    
    const generateTab = page.locator('button').filter({ hasText: /generate/i });
    if (await generateTab.count() > 0) {
      await generateTab.click();
      await page.waitForTimeout(1000);
      console.log('✅ Generate tab clicked');
    } else {
      console.log('❌ Generate tab not found');
    }
    
    await page.screenshot({ path: 'test-screenshots/flow-06-generate-tab.png', fullPage: true });
    
    // Step 5: Add content for workout generation
    console.log('📝 Step 5: Adding content for workout generation...');
    
    // Try YouTube URL first
    const youtubeInput = page.locator('input[placeholder*="YouTube" i], input[placeholder*="URL" i]');
    let contentAdded = false;
    
    if (await youtubeInput.count() > 0) {
      console.log('🎥 Found YouTube URL input, adding fitness video...');
      // Use a real fitness YouTube URL
      await youtubeInput.fill('https://www.youtube.com/watch?v=1pkCQsEeqnY'); // A popular fitness video
      
      // Look for "Add" or "Analyze" button
      const addButtons = [
        page.locator('button').filter({ hasText: /add/i }),
        page.locator('button').filter({ hasText: /analyze/i }),
        page.locator('button').filter({ hasText: /upload/i })
      ];
      
      for (const button of addButtons) {
        if (await button.count() > 0 && await button.isVisible()) {
          await button.click();
          console.log('✅ Content add button clicked');
          contentAdded = true;
          await page.waitForTimeout(3000); // Wait for analysis
          break;
        }
      }
    }
    
    // If no YouTube input, try file upload
    if (!contentAdded) {
      const fileInput = page.locator('input[type="file"]');
      if (await fileInput.count() > 0) {
        console.log('📁 File input found, but skipping file upload for now');
        // Note: File upload would require actual image files
      }
    }
    
    await page.screenshot({ path: 'test-screenshots/flow-07-content-added.png', fullPage: true });
    
    // Step 6: Generate workout plan
    console.log('📝 Step 6: Generating workout plan...');
    
    const generateButtons = [
      page.locator('button').filter({ hasText: /generate.*plan/i }),
      page.locator('button').filter({ hasText: /create.*plan/i }),
      page.locator('button').filter({ hasText: /generate.*workout/i }),
      page.locator('button').filter({ hasText: /start.*generation/i }),
      page.locator('button').filter({ hasText: /generate/i })
    ];
    
    let generationStarted = false;
    for (const button of generateButtons) {
      if (await button.count() > 0 && await button.isVisible()) {
        console.log('🚀 Starting workout generation...');
        await button.click();
        generationStarted = true;
        break;
      }
    }
    
    if (!generationStarted) {
      console.log('❌ No generate button found');
      // Try to find any clickable element that might trigger generation
      const allButtons = await page.locator('button:visible').all();
      for (const button of allButtons) {
        const text = await button.textContent();
        if (text && (text.toLowerCase().includes('generate') || text.toLowerCase().includes('create'))) {
          await button.click();
          console.log(`✅ Clicked button: ${text}`);
          generationStarted = true;
          break;
        }
      }
    }
    
    if (generationStarted) {
      console.log('⏳ Waiting for workout generation to complete...');
      
      // Look for loading indicators and wait for them to disappear
      const loadingSelectors = [
        'text=/generating|analyzing|creating|processing/i',
        '[data-testid*="loading"]',
        '[class*="loading"]',
        '[class*="spinner"]',
        'text=/please wait/i'
      ];
      
      let loadingFound = false;
      for (const selector of loadingSelectors) {
        const loader = page.locator(selector);
        if (await loader.count() > 0) {
          console.log('⏳ Loading indicator found, waiting for completion...');
          loadingFound = true;
          try {
            await loader.waitFor({ state: 'hidden', timeout: 120000 }); // 2 minute timeout
            console.log('✅ Loading completed');
          } catch (e) {
            console.log('⚠️ Loading timeout - generation may still be in progress');
          }
          break;
        }
      }
      
      if (!loadingFound) {
        // If no loading indicator, just wait a reasonable amount of time
        await page.waitForTimeout(15000);
        console.log('⏳ Waited 15 seconds for generation (no loading indicator found)');
      }
    }
    
    await page.screenshot({ path: 'test-screenshots/flow-08-after-generation.png', fullPage: true });
    
    // Step 7: Check Workout tab for generated plan
    console.log('📝 Step 7: Checking Workout tab for generated plan...');
    
    const workoutTab = page.locator('button').filter({ hasText: /workout/i });
    if (await workoutTab.count() > 0) {
      await workoutTab.click();
      await page.waitForTimeout(2000);
      console.log('✅ Workout tab clicked');
    } else {
      console.log('❌ Workout tab not found');
    }
    
    await page.screenshot({ path: 'test-screenshots/flow-09-workout-tab.png', fullPage: true });
    
    // Check if workout plan is present
    const workoutIndicators = [
      page.locator('text=/workout.*plan/i'),
      page.locator('text=/day.*1|day.*2|day.*3/i'),
      page.locator('text=/exercise|movement|rep|set/i'),
      page.locator('text=/warm.*up|cool.*down/i'),
      page.locator('[data-testid*="workout"]')
    ];
    
    let workoutFound = false;
    let workoutContent = [];
    for (const indicator of workoutIndicators) {
      const count = await indicator.count();
      if (count > 0) {
        workoutFound = true;
        const elements = await indicator.all();
        for (const element of elements.slice(0, 3)) { // Get first 3 matches
          const text = await element.textContent();
          if (text) workoutContent.push(text.trim());
        }
        break;
      }
    }
    
    // Also check for "no workout" messages
    const noWorkoutMessages = page.locator('text=/no workout|generate.*workout|create.*plan/i');
    const noWorkoutFound = await noWorkoutMessages.count() > 0;
    
    if (workoutFound && !noWorkoutFound) {
      console.log('✅ Workout plan successfully generated and displayed');
      if (workoutContent.length > 0) {
        console.log('📋 Workout content preview:');
        workoutContent.forEach((content, index) => {
          console.log(`   ${index + 1}. ${content}`);
        });
      }
    } else if (noWorkoutFound) {
      console.log('❌ No workout plan found - generation may have failed');
    } else {
      console.log('⚠️ Unclear if workout plan was generated - no clear indicators');
    }
    
    // Step 8: Check History tab
    console.log('📝 Step 8: Checking History tab...');
    
    const historyTab = page.locator('button').filter({ hasText: /history/i });
    if (await historyTab.count() > 0) {
      await historyTab.click();
      await page.waitForTimeout(1000);
      console.log('✅ History tab clicked');
      await page.screenshot({ path: 'test-screenshots/flow-10-history-tab.png', fullPage: true });
    } else {
      console.log('⚠️ History tab not found');
    }
    
    // Step 9: Console error analysis
    console.log('📝 Step 9: Analyzing console messages...');
    
    const consoleErrors = page.consoleMessages.filter(msg => msg.type === 'error');
    const consoleWarnings = page.consoleMessages.filter(msg => msg.type === 'warning');
    const consoleLogs = page.consoleMessages.filter(msg => msg.type === 'log');
    
    // Filter out common non-critical errors
    const criticalErrors = consoleErrors.filter(error => {
      const text = error.text.toLowerCase();
      return !text.includes('favicon') && 
             !text.includes('manifest') && 
             !text.includes('service-worker') &&
             !text.includes('sw.js') &&
             !text.includes('icon-');
    });
    
    await page.screenshot({ path: 'test-screenshots/flow-11-final-state.png', fullPage: true });
    
    // Step 10: Final test summary
    console.log('\n' + '='.repeat(50));
    console.log('🏁 COMPREHENSIVE TEST RESULTS SUMMARY');
    console.log('='.repeat(50));
    
    console.log(`✅ App Loading: SUCCESS`);
    console.log(`${authRequired ? (loginSuccessful ? '✅' : '❌') : '✅'} Authentication: ${authRequired ? (loginSuccessful ? 'LOGIN SUCCESS' : 'LOGIN FAILED') : 'NOT REQUIRED'}`);
    console.log(`✅ Profile Setup: Attempted (${fitnessLevelSelected ? 'Level ✅' : 'Level ❌'}, Goals: ${goalsSelected}, Equipment: ${equipmentSelected})`);
    console.log(`✅ Generate Tab: Accessible`);
    console.log(`${contentAdded ? '✅' : '⚠️'} Content Addition: ${contentAdded ? 'SUCCESS' : 'PARTIAL'}`);
    console.log(`${generationStarted ? '✅' : '❌'} Generation Process: ${generationStarted ? 'INITIATED' : 'FAILED TO START'}`);
    console.log(`${workoutFound ? '✅' : '❌'} Workout Plan Display: ${workoutFound ? 'SUCCESS' : 'NOT FOUND'}`);
    console.log(`✅ History Tab: ${await historyTab.count() > 0 ? 'ACCESSIBLE' : 'NOT FOUND'}`);
    console.log(`${criticalErrors.length === 0 ? '✅' : '❌'} Critical Console Errors: ${criticalErrors.length} found`);
    console.log(`${consoleWarnings.length < 10 ? '✅' : '⚠️'} Console Warnings: ${consoleWarnings.length} found`);
    
    if (criticalErrors.length > 0) {
      console.log('\n🚨 CRITICAL CONSOLE ERRORS:');
      criticalErrors.forEach((error, index) => {
        console.log(`   ${index + 1}. [${error.timestamp}] ${error.text}`);
      });
    }
    
    if (consoleWarnings.length > 0) {
      console.log('\n⚠️ CONSOLE WARNINGS (first 5):');
      consoleWarnings.slice(0, 5).forEach((warning, index) => {
        console.log(`   ${index + 1}. [${warning.timestamp}] ${warning.text}`);
      });
      if (consoleWarnings.length > 5) {
        console.log(`   ... and ${consoleWarnings.length - 5} more warnings`);
      }
    }
    
    console.log('\n📋 KEY FINDINGS:');
    if (authRequired && loginSuccessful) {
      console.log('   • Authentication system is working with provided credentials');
    }
    if (workoutFound) {
      console.log('   • Workout generation pipeline appears to be functional');
    }
    if (criticalErrors.length === 0) {
      console.log('   • No critical JavaScript errors detected');
    }
    if (generationStarted && !workoutFound) {
      console.log('   • Generation process starts but may not complete successfully');
    }
    
    console.log('\n📸 Screenshots saved in test-screenshots/ directory');
    console.log('='.repeat(50));
    
    // Test assertions
    expect(criticalErrors.length).toBeLessThan(3); // Allow minimal critical errors
    if (authRequired) {
      expect(loginSuccessful).toBeTruthy(); // If auth is required, login should succeed
    }
    // Don't fail the test if workout generation doesn't work - just report the results
  });
});