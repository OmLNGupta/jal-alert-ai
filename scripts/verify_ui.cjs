const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

async function run() {
  const chromePath = fs.existsSync('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe')
    ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
    : 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

  console.log(`[UI Test] Launching browser executable at: ${chromePath}`);

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  console.log('[UI Test] Navigating to http://localhost:5173 ...');
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle0', timeout: 15000 });

  console.log('[UI Test] Page loaded successfully. Title:', await page.title());

  // Fill in incident report form
  console.log('[UI Test] Clicking quick preset button for Cyber City...');
  const presetButtons = await page.$$('button[type="button"]');
  for (const btn of presetButtons) {
    const text = await page.evaluate(el => el.innerText, btn);
    if (text.includes('Cyber City') || text.includes('Minto Bridge')) {
      await btn.click();
      console.log(`[UI Test] Clicked preset: ${text}`);
      break;
    }
  }

  // Set notes
  await page.type('textarea', ' Live field telemetry: Drainage sump overflow, emergency bypass active.');

  // Submit form
  console.log('[UI Test] Submitting incident report...');
  await page.click('button[type="submit"]');

  // Wait for submission update
  await new Promise(r => setTimeout(r, 2000));

  const artifactDir = path.resolve('C:\\Users\\hp\\.gemini\\antigravity-ide\\brain\\7d07a3bd-9553-44f9-a6e2-c90ebddb5980');
  const targetPath = path.join(artifactDir, 'jal_alert_walkthrough.png');
  const localPath = path.resolve('jal_alert_walkthrough.png');

  console.log(`[UI Test] Capturing screenshot to ${targetPath} and ${localPath}...`);
  await page.screenshot({ path: targetPath, fullPage: true });
  await page.screenshot({ path: localPath, fullPage: true });

  console.log('[UI Test] Screenshot saved successfully!');
  await browser.close();
}

run().catch(err => {
  console.error('[UI Test] Error:', err);
  process.exit(1);
});
