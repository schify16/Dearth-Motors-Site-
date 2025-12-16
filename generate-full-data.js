const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 }
  });
  await context.addInitScript(() => Object.defineProperty(navigator, 'webdriver', { get: () => false }));
  const page = await context.newPage();

  const USERNAME = 'dearthtm';
  const PASSWORD = 'YOUR_REAL_PASSWORD_HERE';   // ← change only this

  console.log('Logging in...');
  await page.goto('https://flynn-preview.tireweb.com/Logon/Login');
  await page.waitForLoadState('networkidle');
  await page.fill('input[placeholder="Username"]', USERNAME);
  await page.fill('input[placeholder="Password"]', PASSWORD);
  await page.click('text=Sign in');
  await page.waitForTimeout(10000);
    // Go to search page and open the size dropdown to load all sizes
  await page.goto('https://flynn-preview.tireweb.com/Search/ByTireSize');
  await page.waitForTimeout(10000);
  await page.click('text=Select Tire Size');
  await page.waitForTimeout(5000);

  // Get every size code from the dropdown
  const allSizeCodes = await page.$$eval('#SizeList option[value]', opts =>
    opts.map(o => o.value).filter(v => v && v.length > 5)
  );

  console.log(`Found ${allSizeCodes.length} sizes — pulling EVERY tire from Flynn!`);

  const tires = [];
    for (let i = 0; i < allSizeCodes.length; i++) {
    const sizeCode = allSizeCodes[i];
    const cleanSize = sizeCode.replace(/(\d{3})(\d{2})(\d{1,2})/, '$1/$2R$3');
    const url = `https://flynn-preview.tireweb.com/Search/ByTireSize/${sizeCode}?snowTiresOnly=False`;
    console.log(`\n[${i+1}/${allSizeCodes.length}] ${cleanSize}`);
    await page.goto(url);
    await page.waitForTimeout(8000);

    while (true) {
      await page.waitForSelector('table tbody tr', { timeout: 10000 }).catch(() => {});

      const rows = await page.$$eval('table tbody tr', rows => rows.map(tr => {
        const c = tr.querySelectorAll('td');
        return {
          full: c[3]?.innerText.trim() || '',
          price: c[c.length - 3]?.innerText.trim() || '',
          w1: c[6]?.innerText.trim() || '0',
          w2: c[7]?.innerText.trim() || '0',
          w3: c[8]?.innerText.trim() || '0'
        };
      }));
            for (const r of rows) {
        if (!r.full) continue;

        const cleanName = r.full.replace(/\d{3}\/\d{2}R?\d{1,2}.*/, '').trim();
        const parts = cleanName.split(' ');
        const brand = parts[0] || '';
        const model = parts.slice(1).join(' ') || '';

        const wholesale = r.price === 'Call' ? 'Call' : parseFloat(r.price.replace(/[^0-9.]/g, ''));
        const otd = wholesale === 'Call' ? 'Call' : (wholesale + 40).toFixed(2);

        tires.push([cleanSize, brand, model, `$${otd}`, r.w1, r.w2, r.w3]);
      }

      if (!await page.$('a:has-text("Next"):not(.disabled)')) break;
      await page.click('a:has-text("Next"):not(.disabled)');
      await page.waitForTimeout(6000);
    }
  }
    const header = 'Size,Brand,Model,"Dearth Motors OTD Price","Warehouse 1","Warehouse 2","Warehouse 3"\n';
  const csv = header + tires.map(r => r.map(cell => `"${cell}"`).join(',')).join('\n');

  fs.writeFileSync('C:\\Users\\schif\\Desktop\\DEARTH_MOTORS_FULL_FLYNN.csv', csv);
  console.log(`\nFULL FLYNN CATALOG DONE! ${tires.length} tires 🔥`);
  console.log(`File → Desktop: DEARTH_MOTORS_FULL_FLYNN.csv`);

  await browser.close();
})();
