// Simple screenshot using puppeteer-core with system Chrome
const puppeteer = require('puppeteer-core');
const { execSync } = require('child_process');

async function takeScreenshots() {
  let browser;
  try {
    // Try to find Chrome executable
    let chromePath;
    try {
      chromePath = execSync('which google-chrome-stable || which chromium || which google-chrome || which chrome', { encoding: 'utf-8' }).trim();
    } catch {
      chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    }

    console.log('Using Chrome at:', chromePath);
    console.log('Launching browser...');
    
    browser = await puppeteer.launch({
      executablePath: chromePath,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    console.log('Navigating to http://localhost:3000/...');
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle2', timeout: 10000 });
    
    await page.waitForTimeout(1000);

    const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
    console.log(`Page height: ${bodyHeight}px`);

    console.log('Taking screenshots...');
    await page.screenshot({ path: 'dashboard-full.png', fullPage: true });
    console.log('✓ Saved: dashboard-full.png');

    await page.screenshot({ path: 'dashboard-viewport.png', fullPage: false });
    console.log('✓ Saved: dashboard-viewport.png');

    console.log('\n✅ Screenshots captured!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\nTrying alternative method with curl...');
    
    // Fallback: Just verify the page loads
    const { execSync } = require('child_process');
    const html = execSync('curl -s http://localhost:3000/').toString();
    console.log('Page HTML length:', html.length, 'bytes');
    console.log('Page title:', html.match(/<title>(.*?)<\/title>/)?.[1] || 'Not found');
    
  } finally {
    if (browser) await browser.close();
  }
}

takeScreenshots().catch(console.error);
