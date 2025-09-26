import { chromium } from 'playwright';

async function runAuthTest() {
  console.log('🚀 Starting AI Fitness Planner test with authentication...');
  
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
    await page.screenshot({ path: 'test-screenshots/auth-01-initial-load.png', fullPage: true });

    // Check if we see a sign-in form
    const signInForm = page.locator('text="Welcome Back"').or(page.locator('text="Sign in to continue"'));
    const signUpLink = page.locator('text=/Sign Up|Don\'t have an account/i');
    
    if (await signInForm.count() > 0) {
      console.log('🔐 Authentication form detected');
      
      // Try to sign up for a new account
      if (await signUpLink.count() > 0) {
        console.log('📝 Step 2: Creating new account...');
        await signUpLink.click();
        await page.waitForTimeout(1000);
        
        await page.screenshot({ path: 'test-screenshots/auth-02-signup-form.png', fullPage: true });
        
        // Fill sign up form
        const emailInput = page.locator('input[type="email"], input[placeholder*="email" i]');
        const passwordInput = page.locator('input[type="password"], input[placeholder*="password" i]');
        const signUpButton = page.locator('button').filter({ hasText: /sign up|create|register/i });
        
        if (await emailInput.count() > 0 && await passwordInput.count() > 0) {
          const testEmail = `test${Date.now()}@example.com`;
          const testPassword = 'testpassword123';
          
          await emailInput.fill(testEmail);
          await passwordInput.fill(testPassword);
          console.log(`✅ Credentials entered: ${testEmail}`);
          
          if (await signUpButton.count() > 0) {
            await signUpButton.click();
            console.log('✅ Sign up button clicked');
            
            // Wait for potential redirect or loading
            await page.waitForTimeout(5000);
            
            await page.screenshot({ path: 'test-screenshots/auth-03-after-signup.png', fullPage: true });
          }
        }
      } else {
        // Try to sign in with default credentials or skip auth
        console.log('📝 Step 2: Attempting to sign in...');
        const emailInput = page.locator('input[type="email"], input[placeholder*="email" i]');
        const passwordInput = page.locator('input[type="password"], input[placeholder*="password" i]');
        const signInButton = page.locator('button').filter({ hasText: /sign in|login/i });
        
        if (await emailInput.count() > 0 && await passwordInput.count() > 0 && await signInButton.count() > 0) {
          await emailInput.fill('jethan@bizai.co.za');
          await passwordInput.fill('admin123');
          await signInButton.click();
          console.log('✅ Sign in attempted with provided credentials');
          
          await page.waitForTimeout(3000);
          await page.screenshot({ path: 'test-screenshots/auth-03-after-signin.png', fullPage: true });
        }
      }
    }
    
    // Step 3: Check if we now have access to the main app
    console.log('📝 Step 3: Checking for main app interface...');
    await page.waitForTimeout(2000);
    
    // Look for main app navigation tabs
    const profileTab = page.locator('button').filter({ hasText: /profile/i });
    const generateTab = page.locator('button').filter({ hasText: /generate/i });
    const workoutTab = page.locator('button').filter({ hasText: /workout/i });
    const historyTab = page.locator('button').filter({ hasText: /history/i });
    
    const mainAppVisible = (await profileTab.count() > 0) || 
                          (await generateTab.count() > 0) || 
                          (await workoutTab.count() > 0) || 
                          (await historyTab.count() > 0);
    
    if (mainAppVisible) {
      console.log('✅ Main app interface is now accessible');
      
      // Continue with profile testing
      console.log('📝 Step 4: Testing Profile functionality...');
      
      if (await profileTab.count() > 0) {
        await profileTab.click();
        await page.waitForTimeout(1000);
        console.log('✅ Profile tab clicked');
      }
      
      await page.screenshot({ path: 'test-screenshots/auth-04-profile-screen.png', fullPage: true });
      
      // Look for profile form elements
      const fitnessLevelButtons = page.locator('button').filter({ hasText: /beginner|intermediate|advanced|elite/i });
      const goalButtons = page.locator('button').filter({ hasText: /muscle|strength|endurance|weight/i });
      const equipmentButtons = page.locator('button').filter({ hasText: /barbell|dumbbell|kettlebell/i });
      
      console.log(`Found ${await fitnessLevelButtons.count()} fitness level options`);
      console.log(`Found ${await goalButtons.count()} goal options`);
      console.log(`Found ${await equipmentButtons.count()} equipment options`);
      
      // Select some options
      if (await fitnessLevelButtons.count() > 0) {
        const advancedButton = fitnessLevelButtons.filter({ hasText: 'Advanced' });
        if (await advancedButton.count() > 0) {
          await advancedButton.click();
          console.log('✅ Advanced fitness level selected');
        }
      }
      
      if (await goalButtons.count() > 0) {
        const muscleButton = goalButtons.filter({ hasText: /muscle/i }).first();
        if (await muscleButton.count() > 0) {
          await muscleButton.click();
          console.log('✅ Muscle building goal selected');
        }
      }
      
      if (await equipmentButtons.count() > 0) {
        const barbellButton = equipmentButtons.filter({ hasText: /barbell/i }).first();
        if (await barbellButton.count() > 0) {
          await barbellButton.click();
          console.log('✅ Barbell equipment selected');
        }
      }
      
      await page.screenshot({ path: 'test-screenshots/auth-05-profile-configured.png', fullPage: true });
      
      // Test Generate tab
      console.log('📝 Step 5: Testing Generate functionality...');
      if (await generateTab.count() > 0) {
        await generateTab.click();
        await page.waitForTimeout(1000);
        console.log('✅ Generate tab clicked');
      }
      
      await page.screenshot({ path: 'test-screenshots/auth-06-generate-screen.png', fullPage: true });
      
      // Look for content input options
      const fileInput = page.locator('input[type="file"]');
      const urlInput = page.locator('input[type="url"], input[type="text"]').filter({ hasAttribute: 'placeholder' });
      const textareaInput = page.locator('textarea');
      
      console.log(`Found ${await fileInput.count()} file inputs`);
      console.log(`Found ${await urlInput.count()} URL inputs`);
      console.log(`Found ${await textareaInput.count()} text areas`);
      
      // Try to add some content
      if (await urlInput.count() > 0) {
        const firstUrlInput = urlInput.first();
        const placeholder = await firstUrlInput.getAttribute('placeholder');
        console.log(`URL input placeholder: ${placeholder || 'none'}`);
        
        if (placeholder && placeholder.toLowerCase().includes('youtube')) {
          await firstUrlInput.fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
          console.log('✅ YouTube URL entered');
          
          // Look for add/analyze button
          const addButtons = page.locator('button').filter({ hasText: /add|analyze|upload/i });
          if (await addButtons.count() > 0) {
            await addButtons.first().click();
            console.log('✅ Add content button clicked');
            await page.waitForTimeout(3000);
          }
        }
      }
      
      // Look for generate buttons
      const generateButtons = page.locator('button').filter({ hasText: /generate|create.*plan|start.*generation/i });
      console.log(`Found ${await generateButtons.count()} generate buttons`);
      
      if (await generateButtons.count() > 0) {
        console.log('🚀 Attempting workout generation...');
        await generateButtons.first().click();
        
        // Wait for generation process
        await page.waitForTimeout(10000);
        console.log('⏳ Waited for generation process');
      }
      
      await page.screenshot({ path: 'test-screenshots/auth-07-after-generation.png', fullPage: true });
      
      // Check Workout tab
      console.log('📝 Step 6: Checking Workout results...');
      if (await workoutTab.count() > 0) {
        await workoutTab.click();
        await page.waitForTimeout(2000);
        console.log('✅ Workout tab clicked');
      }
      
      await page.screenshot({ path: 'test-screenshots/auth-08-workout-results.png', fullPage: true });
      
      // Look for workout content
      const workoutContent = page.locator('text=/exercise|workout|day|week|set|rep/i');
      const noWorkoutMsg = page.locator('text=/no workout|generate/i');
      
      if (await noWorkoutMsg.count() > 0) {
        console.log('❌ No workout plan generated yet');
      } else if (await workoutContent.count() > 0) {
        console.log('✅ Workout content found - generation may have succeeded');
      } else {
        console.log('⚠️ Unclear workout generation status');
      }
      
    } else {
      console.log('❌ Still unable to access main app - authentication may have failed');
      await page.screenshot({ path: 'test-screenshots/auth-04-auth-failed.png', fullPage: true });
    }
    
    // Final results
    const errors = consoleMessages.filter(msg => msg.type === 'error');
    const warnings = consoleMessages.filter(msg => msg.type === 'warning');
    
    console.log('\n=== AUTHENTICATION TEST RESULTS ===');
    console.log(`${mainAppVisible ? '✅' : '❌'} Main app access: ${mainAppVisible ? 'SUCCESS' : 'FAILED'}`);
    console.log(`✅ Authentication flow: Tested`);
    console.log(`${errors.length === 0 ? '✅' : '❌'} Console errors: ${errors.length} found`);
    console.log(`Console warnings: ${warnings.length} found`);
    
    if (errors.length > 0) {
      console.log('\n=== CONSOLE ERRORS ===');
      errors.slice(0, 3).forEach((error, index) => {
        console.log(`${index + 1}. ${error.text}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    await page.screenshot({ path: 'test-screenshots/auth-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

runAuthTest().catch(console.error);