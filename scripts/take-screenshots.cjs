const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function takeScreenshots() {
  const screenshotsDir = '/opt/cursor/artifacts/screenshots';
  
  // Ensure directory exists
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu'
    ]
  });

  const page = await browser.newPage();
  
  // Set viewport to iPhone size with DPR 2
  await page.setViewport({
    width: 390,
    height: 844,
    deviceScaleFactor: 2
  });

  console.log('Navigating to app...');
  await page.goto('http://localhost:4567', { waitUntil: 'networkidle2' });
  
  // Wait a bit for everything to load
  await sleep(2000);

  // Screenshot 1: Click settings button to open voice picker
  console.log('Opening voice picker...');
  await page.click('button[aria-label="聲音設定"]');
  await sleep(1000);
  
  console.log('Taking voice picker screenshot...');
  await page.screenshot({
    path: path.join(screenshotsDir, 'voice-picker.png'),
    fullPage: false
  });
  console.log('✓ Saved voice-picker.png');

  // Close voice picker by clicking outside or finding close button
  const buttons = await page.$$('button');
  for (const button of buttons) {
    const text = await page.evaluate(el => el.textContent, button);
    if (text && text.includes('完成')) {
      await button.click();
      break;
    }
  }
  await sleep(500);

  // Screenshot 2: Take full page to capture header and footer
  console.log('Taking full page screenshot...');
  await page.screenshot({
    path: path.join(screenshotsDir, 'header-footer.png'),
    fullPage: true
  });
  console.log('✓ Saved header-footer.png');

  console.log('Closing browser...');
  await browser.close();
  
  console.log('\n✅ All screenshots taken successfully!');
  console.log(`Screenshots saved to: ${screenshotsDir}`);
}

takeScreenshots().catch(error => {
  console.error('Error taking screenshots:', error);
  process.exit(1);
});
