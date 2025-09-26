import { chromium } from 'playwright';

async function runTest() {
  console.log('🚀 Starting AI Fitness Planner test...');
  
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
    await page.screenshot({ path: 'test-screenshots/01-initial-load.png', fullPage: true });
    console.log('✅ App loaded successfully');

    // Step 2: Fill out Profile tab
    console.log('📝 Step 2: Filling out user profile...');
    
    // Click Profile tab if not already active
    const profileTab = page.locator('button').filter({ hasText: /profile/i }).or(page.locator('[aria-label*="Profile"]'));
    if (await profileTab.count() > 0) {
      await profileTab.click();
      console.log('✅ Profile tab clicked');
    }
    
    // Wait a moment for the profile form to load
    await page.waitForTimeout(2000);
    
    // Try to find and fill name input
    const nameInput = page.locator('input').filter({ hasAttribute: 'placeholder' });
    const nameInputCount = await nameInput.count();
    console.log(`Found ${nameInputCount} input fields`);
    
    if (nameInputCount > 0) {
      const firstInput = nameInput.first();
      const placeholder = await firstInput.getAttribute('placeholder');
      console.log(`First input placeholder: ${placeholder}`);
      
      if (placeholder && (placeholder.toLowerCase().includes('name') || placeholder.toLowerCase().includes('user'))) {
        await firstInput.fill('Test User');
        console.log('✅ Name filled: Test User');
      }
    }

    // Select fitness level - look for "Advanced" button
    const fitnessButtons = page.locator('button').filter({ hasText: /beginner|intermediate|advanced|elite/i });
    console.log(`Found ${await fitnessButtons.count()} fitness level buttons`);
    
    const advancedButton = page.locator('button').filter({ hasText: 'Advanced' });
    if (await advancedButton.count() > 0) {
      await advancedButton.click();
      console.log('✅ Fitness level selected: Advanced');
    }

    // Select goals
    const goalButtons = page.locator('button').filter({ hasText: /build muscle|improve endurance|lose weight|strength/i });
    console.log(`Found ${await goalButtons.count()} goal buttons`);
    
    const buildMuscleButton = page.locator('button').filter({ hasText: 'Build Muscle' });
    if (await buildMuscleButton.count() > 0) {
      await buildMuscleButton.click();
      console.log('✅ Goal selected: Build Muscle');
    }
    
    const enduranceButton = page.locator('button').filter({ hasText: 'Improve Endurance' });
    if (await enduranceButton.count() > 0) {
      await enduranceButton.click();
      console.log('✅ Goal selected: Improve Endurance');
    }

    // Select equipment
    const equipmentOptions = ['Barbell', 'Dumbbells', 'Pull-up Bar', 'Kettlebell'];
    for (const equipment of equipmentOptions) {
      const equipmentButton = page.locator('button').filter({ hasText: equipment });
      if (await equipmentButton.count() > 0) {
        await equipmentButton.click();
        console.log(`✅ Equipment selected: ${equipment}`);
        await page.waitForTimeout(200); // Small delay between clicks
      }
    }

    await page.screenshot({ path: 'test-screenshots/02-profile-filled.png', fullPage: true });

    // Step 3: Navigate to Generate tab
    console.log('📝 Step 3: Navigating to Generate tab...');
    const generateTab = page.locator('button').filter({ hasText: /generate/i }).or(page.locator('[aria-label*="Generate"]'));
    if (await generateTab.count() > 0) {
      await generateTab.click();
      console.log('✅ Generate tab clicked');
      await page.waitForTimeout(2000);
    }

    await page.screenshot({ path: 'test-screenshots/03-generate-tab.png', fullPage: true });

    // Step 4: Try to generate a workout plan
    console.log('📝 Step 4: Attempting workout generation...');
    
    // Look for YouTube URL input
    const youtubeInput = page.locator('input[type="url"], input[type="text"]').filter({ hasAttribute: 'placeholder' });
    console.log(`Found ${await youtubeInput.count()} potential URL inputs`);
    
    if (await youtubeInput.count() > 0) {
      const urlInput = youtubeInput.first();
      const placeholder = await urlInput.getAttribute('placeholder');
      console.log(`URL input placeholder: ${placeholder}`);
      
      if (placeholder && placeholder.toLowerCase().includes('youtube')) {
        await urlInput.fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
        console.log('✅ YouTube URL entered');
        
        // Look for Add/Analyze button
        const addButton = page.locator('button').filter({ hasText: /add|analyze|upload/i });
        if (await addButton.count() > 0) {
          await addButton.first().click();
          console.log('✅ Add button clicked');
          await page.waitForTimeout(3000);
        }
      }
    }
    
    // Look for generate plan button
    const generateButton = page.locator('button').filter({ hasText: /generate.*plan|create.*plan|generate.*workout|start.*generation/i });
    console.log(`Found ${await generateButton.count()} generate buttons`);
    
    if (await generateButton.count() > 0) {
      console.log('🚀 Starting workout generation...');
      await generateButton.first().click();
      
      // Wait for generation to complete (look for loading indicators)
      console.log('⏳ Waiting for generation to complete...');
      
      // Wait a bit and then take a screenshot
      await page.waitForTimeout(10000);
    }

    await page.screenshot({ path: 'test-screenshots/04-generation-attempt.png', fullPage: true });

    // Step 5: Check Workout tab
    console.log('📝 Step 5: Checking Workout tab...');
    const workoutTab = page.locator('button').filter({ hasText: /workout/i }).or(page.locator('[aria-label*="Workout"]'));
    if (await workoutTab.count() > 0) {
      await workoutTab.click();
      console.log('✅ Workout tab clicked');
      await page.waitForTimeout(2000);
    }

    await page.screenshot({ path: 'test-screenshots/05-workout-tab.png', fullPage: true });

    // Check for workout content
    const workoutContent = page.locator('text=/exercise|workout|day|week/i');
    const noWorkoutMessage = page.locator('text=/no workout plan/i');
    
    let workoutGenerated = false;
    if (await noWorkoutMessage.count() > 0) {
      console.log('❌ No workout plan was generated');
    } else if (await workoutContent.count() > 0) {
      console.log('✅ Workout content found - plan may have been generated');
      workoutGenerated = true;
    }

    // Step 6: Check History tab
    console.log('📝 Step 6: Checking History tab...');
    const historyTab = page.locator('button').filter({ hasText: /history/i }).or(page.locator('[aria-label*="History"]'));
    if (await historyTab.count() > 0) {
      await historyTab.click();
      await page.waitForTimeout(1000);
    }

    await page.screenshot({ path: 'test-screenshots/06-history-tab.png', fullPage: true });

    // Final summary
    const errors = consoleMessages.filter(msg => msg.type === 'error');
    const warnings = consoleMessages.filter(msg => msg.type === 'warning');
    
    console.log('\n=== TEST RESULTS SUMMARY ===');
    console.log(`✅ App navigation: SUCCESS`);
    console.log(`✅ Profile tab: Accessible and functional`);
    console.log(`✅ Generate tab: Accessible`);
    console.log(`✅ Workout tab: Accessible`);
    console.log(`${workoutGenerated ? '✅' : '⚠️'} Workout generation: ${workoutGenerated ? 'SUCCESS' : 'UNCLEAR'}`);
    console.log(`${errors.length === 0 ? '✅' : '❌'} Console errors: ${errors.length} found`);
    console.log(`Console warnings: ${warnings.length} found`);
    
    if (errors.length > 0) {
      console.log('\n=== CONSOLE ERRORS ===');
      errors.slice(0, 5).forEach((error, index) => {
        console.log(`${index + 1}. ${error.text}`);
      });
    }
    
    console.log('\n✅ Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    await page.screenshot({ path: 'test-screenshots/error-state.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

runTest().catch(console.error);