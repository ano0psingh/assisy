const playwright = require('playwright');
const fs = require('fs');
const path = require('path');

async function takeScreenshots() {
  console.log('Launching browser...');
  const browser = await playwright.chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  try {
    console.log('Navigating to http://localhost:3000/...');
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle', timeout: 10000 });
    
    // Wait a bit for any animations
    await page.waitForTimeout(1000);

    // Get page height
    const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
    console.log(`Page height: ${bodyHeight}px`);

    // Take full page screenshot
    console.log('Taking full page screenshot...');
    await page.screenshot({ 
      path: 'dashboard-full.png', 
      fullPage: true 
    });
    console.log('✓ Saved: dashboard-full.png');

    // Take viewport screenshot (above the fold)
    console.log('Taking above-the-fold screenshot...');
    await page.screenshot({ 
      path: 'dashboard-viewport.png', 
      fullPage: false 
    });
    console.log('✓ Saved: dashboard-viewport.png');

    // If page is tall, take middle section
    if (bodyHeight > 2000) {
      await page.evaluate(() => window.scrollTo(0, 1000));
      await page.waitForTimeout(300);
      await page.screenshot({ 
        path: 'dashboard-middle.png', 
        fullPage: false 
      });
      console.log('✓ Saved: dashboard-middle.png');
    }

    // Take bottom section
    if (bodyHeight > 1500) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(300);
      await page.screenshot({ 
        path: 'dashboard-bottom.png', 
        fullPage: false 
      });
      console.log('✓ Saved: dashboard-bottom.png');
    }

    console.log('\n✅ All screenshots captured successfully!');
    console.log(`Total page height: ${bodyHeight}px`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await browser.close();
  }
}

takeScreenshots().catch(console.error);
