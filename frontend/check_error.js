import { chromium } from '@playwright/test';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const logs = [];
  page.on('console', msg => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      console.log(`[${msg.type()}] ${msg.text()}`);
    }
  });
  page.on('pageerror', error => {
    console.log(`[pageerror] ${error.message}`);
  });
  
  await page.goto('http://localhost:8081');
  // Wait a bit
  await new Promise(r => setTimeout(r, 4000));
  
  await browser.close();
  process.exit(0);
})();
