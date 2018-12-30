'use strict';

const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    defaultViewport: {
      width: 1024,
      height: 768
    },
    // headless: false,
    // slowMo: 250 // slow down by 250ms
  });
  const page = await browser.newPage();
  await page.goto('https://pilpres2014.kpu.go.id/dc1.php', {
    waitUntil: 'networkidle2'
  });

  page.on('request', request => {
    if (request.resourceType() === 'image' ||
      request.url().endsWith('.png') ||
      request.url().endsWith('.jpg'))

      request.abort();
    else
      request.continue();
  });

  // Get the 'viewport' of the page, as reported by the page.
  const dimensions = await page.evaluate(() => {
    return {
      width: document.documentElement.clientWidth,
      height: document.documentElement.clientHeight,
      deviceScaleFactor: window.devicePixelRatio
    };
  });

  console.log('Dimensions: ', dimensions);

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));

  await page.evaluate(() => console.log(`url is ${location.href}`));

  await page.select('select[name=wilayah_id]', '1');
  await page.waitFor('div#infoboks');

  await page.screenshot({ path: 'pilu.png', fullPage: true });
  await page.pdf({ path: 'pilu.pdf', format: 'A4' });

  await browser.close();
})();
