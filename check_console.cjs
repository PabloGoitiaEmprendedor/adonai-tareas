const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));
  
  try {
    await page.goto('http://localhost:8080/');
    await page.waitForTimeout(5000);
  } catch (e) {
    console.log('FAILED TO GOTO PAGE:', e.message);
  }
  await browser.close();
})();
