'use strict';

const puppeteer = require('puppeteer-core');
const cheerio = require('cheerio');

const TABLE_TITLE = 'Rincian Perolehan Suara'.toLowerCase();

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
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));

  await page.setRequestInterception(true);
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

  await page.goto('https://pilpres2014.kpu.go.id/dc1.php', {
    waitUntil: 'networkidle2'
  });

  await page.evaluate(() => console.log(`url is ${location.href}`));

  let html = await page.content();
  // console.log('HTML: ', html);
  let $ = cheerio.load(html);

  const provinces = $('select[name=wilayah_id] option').map((i, el) => {
    const $el = $(el);
    const id = $el.attr('value').trim(), name = $el.text().trim();
    // console.log(`value: ${id} text: ${name}`);

    if (!id) { return null; }

    return { id, name };
  }).get();
  console.log('provinces: ', provinces);

  let province = provinces[0];
  page.select('select[name=wilayah_id]', province.id).then(result => {
    console.log('result: ', result);
  }).catch(err => {
    console.log('err: ', err);
  });
  await page.waitFor('div#infoboks');

  html = await page.content();
  // console.log('HTML: ', html);
  $ = cheerio.load(html);

  const tablesArray = [];
  const tablesLength = $('#daftartps table').each((i, table) => {
    let titleFound = false, headersProcessed = false, headerLength = 0, rowLength = 0;

    let tableObj = null;
    const $table = $(table);
    $table.find('tbody tr').each((j, tr) => {
      const $tr = $(tr);
      // console.log('tr: ', $tr.text());
      const tds = $tr.find('td');
      const tdsLength = tds.length;
      if (titleFound && rowLength === 0 && tdsLength > 0) {
        rowLength = tdsLength;
        titleFound = false;
        console.log(`${i+1}.${j+1} rowLength: ${rowLength} headerLength: ${headerLength}`);
      } else {
        console.log(`${i+1}.${j+1} tdsLength: ${tdsLength} headerLength: ${headerLength}`);

        if (tdsLength > 1 && tdsLength >= headerLength) {
          const row = tds.map((k, td) => {
            const $td = $(td);
            return $td.text().trim();
          }).get();
          // console.log('row: ', row);
          let rowTitle = '<EMPTY>';
          let rowSubtitle = '<EMPTY>';
          if (tdsLength > headerLength) {
            rowTitle = row[1];
            rowSubtitle = row[2];
          } else if (rowLength > headerLength) {
            rowSubtitle = row[1];
          } else {
            rowTitle = row[1];
          }
          console.log(`rowTitle: ${rowTitle} rowSubtitle: ${rowSubtitle} rowLength: ${rowLength} headerLength: ${headerLength}`);
        }
      }

      let thsLength = 0;
      if (tds.length === 0) {
        const ths = $tr.find('th');
        thsLength = ths.length;
        console.log(`${i+1}.${j+1}   thsLength: ${thsLength}`);
        const headers = [];
        ths.each((k, th) => {
          const $th = $(th);
          const text = $th.text();
          const processedText = text.trim().toLowerCase();
          if (processedText === TABLE_TITLE ||
            processedText === 'Rincian'.toLowerCase()) {

            console.log(`${i+1}.${j+1}.${k+1} TABLE_TITLE: ${text}`);
            titleFound = true;
            headersProcessed = false;
            headerLength = 0;
            rowLength = 0;

            tableObj = {};
          } else if (titleFound && !headersProcessed) {
            if (k <= 0 && text.trim().length <= 4) {
            } else if (k === 1) {
              console.log(`${i+1}.${j+1}.${k+1} headerTitle: ${text}`);
              tableObj['title'] = text.trim();

              console.log('table: ', tableObj);
              tablesArray.push(tableObj);
            } else {
              console.log(`${i+1}.${j+1}.${k+1} header: ${text}`);
            }
            headers.push(text.trim());
          }
        });

        if (titleFound && !headersProcessed) {
          // headerLength = headers.length;
          headerLength = thsLength;

          console.log('headers: ', headers);
          if (headers.length && headers[headers.length - 1].toLowerCase() !== 'Jumlah Akhir'.toLowerCase()) {
            headerLength += 1;
          }
        }
      }

      if (titleFound && headersProcessed) {
        headersProcessed = false;
      }
    });

  }).length;

  console.log('tables: ', tablesArray);

  province.tables = tablesArray;
  console.log('provinces: ', JSON.stringify(provinces));

  await page.screenshot({ path: 'pilu.png', fullPage: true });
  await page.pdf({ path: 'pilu.pdf', format: 'A4' });

  await browser.close();
})();
