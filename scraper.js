const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 }
  });
  await context.addInitScript(() => Object.defineProperty(navigator, 'webdriver', { get: () => false }));
  const page = await context.newPage();

  const USERNAME = 'dearthtm';
  const PASSWORD = process.env.PASSWORD || 'YOUR_REAL_PASSWORD_HERE'; // use env var in Render for security

  console.log('Logging in...');
  await page.goto('https://flynn-preview.tireweb.com/Logon/Login');
  await page.waitForLoadState('networkidle');
  await page.fill('input[placeholder="Username"]', USERNAME);
  await page.fill('input[placeholder="Password"]', PASSWORD);
  await page.click('text=Sign in');
  await page.waitForTimeout(10000);

  await page.goto('https://flynn-preview.tireweb.com/Search/ByTireSize');
  await page.waitForTimeout(10000);
  await page.click('text=Select Tire Size');
  await page.waitForTimeout(5000);

  const allSizeCodes = await page.$$eval('#SizeList option[value]', opts =>
    opts.map(o => o.value).filter(v => v && v.length > 5)
  );

  console.log(`Found ${allSizeCodes.length} sizes — pulling EVERY tire!`);

  const tires = [];

  for (let i = 0; i < allSizeCodes.length; i++) {
    const sizeCode = allSizeCodes[i];
    const cleanSize = sizeCode.replace(/(\d{3})(\d{2})(\d{1,2})/, '$
