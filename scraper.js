const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();

  const USERNAME = 'dearthtm';
  const PASSWORD = 'YOUR_REAL_PASSWORD_HERE';   // ← change only this

  console.log('Logging in...');
  await page.goto('https://flynn-preview.tireweb.com/Logon/Login');
  await page.type('input[placeholder="Username"]', USERNAME);
  await page.type('input[placeholder="Password"]', PASSWORD);
  await page.click('text=Sign in');
  await page.waitForNavigation({ waitUntil: 'networkidle0' });
  console.log('Logged in');

  await page.goto('https://flynn-preview.tireweb.com/Search/ByTireSize');
  await page.waitForTimeout(10000);
  await page.click('text=Select Tire Size');
  await page.waitForTimeout(5000);

  const allSizeCodes = await page.$$eval('#SizeList option[value]', opts =>
    opts.map(o => o.value).filter(v => v && v.length > 5)
  );

  console.log(`Found ${allSizeCodes.length} sizes — pulling EVERY tire with Puppeteer!`);

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

      const next = await page.$('a:has-text("Next"):not(.disabled)');
      if (!next) break;
      await next.click();
      await page.waitForTimeout(6000);
    }
  }

  const dataJS = `const tires = [\n  ${tires.map(r => `["${r.join('","')}"]`).join(',\n  ')}\n];`;

  fs.writeFileSync('data.js', dataJS);
  console.log(`EVERY TIRE FROM FLYNN ADDED! ${tires.length} tires with $40 markup`);
  console.log(`Updated data.js — your site now has the full mirror!`);

  await browser.close();
})();
