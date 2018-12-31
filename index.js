'use strict';

const puppeteer = require('puppeteer-core');
const cheerio = require('cheerio');
const fs = require('fs');

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

  for (let p = 0; p < provinces.length; p++) {
    let province = provinces[p];
    console.log('province: ', JSON.stringify(province));

    page.select('select[name=wilayah_id]', province.id).then(result => {
      // console.log('result: ', result);
    }).catch(err => {
      console.log('err: ', err);
    });
    await page.waitFor('div#infoboks');
    await page.waitFor(3*1000);

    html = await page.content();
    // console.log('HTML: ', html);
    $ = cheerio.load(html);

    const tablesArray = [];
    const tablesLength = $('#daftartps table').each((i, table) => {
      let titleFound = false, headersProcessed = false, headerLength = 0, rowLength = 0;

      let tableObj = null;
      const $table = $(table);
      let rowTitleFound = null;
      $table.find('tbody tr').each((j, tr) => {
        const $tr = $(tr);
        // console.log('tr: ', $tr.text());
        const tds = $tr.find('td');
        const tdsLength = tds.length;
        if (titleFound && rowLength === 0 && tdsLength > 0) {
          rowLength = tdsLength;
          titleFound = false;
          // console.log(`${i+1}.${j+1} rowLength: ${rowLength} headerLength: ${headerLength}`);
        } else {
          // console.log(`${i+1}.${j+1} tdsLength: ${tdsLength} headerLength: ${headerLength}`);

          if (tdsLength > 1 && tdsLength >= headerLength) {
            const row = tds.map((k, td) => {
              const $td = $(td);
              return $td.text().trim();
            }).get();
            // console.log('row: ', row);
            let rowTitle = null;
            let rowSubtitle = null;
            let r = 0;
            if (tdsLength > headerLength) {
              r++;
              rowTitleFound = rowTitle = row[r];
              r++;
              rowSubtitle = row[r];
            } else if (rowLength > headerLength) {
              r++;
              rowSubtitle = row[r];
            } else {
              r++;
              rowTitleFound = rowTitle = row[r];
            }
            const finalRowTitle = rowSubtitle ? `${rowTitleFound} (${rowSubtitle})` : rowTitleFound;
            // console.log(`finalRowTitle: ${finalRowTitle} rowTitleFound: ${rowTitleFound} rowTitle: ${rowTitle} rowSubtitle: ${rowSubtitle} rowLength: ${rowLength} headerLength: ${headerLength}`);
            const data = row.slice(r + 1);
            // console.log('data: ' + data.length, data);
            tableObj.data.push([ finalRowTitle, ...data.map(d => parseInt(d))]);
          }
        }

        let thsLength = 0;
        if (tds.length === 0) {
          const ths = $tr.find('th');
          thsLength = ths.length;
          // console.log(`${i+1}.${j+1}   thsLength: ${thsLength}`);
          const headers = [];
          ths.each((k, th) => {
            const $th = $(th);
            const text = $th.text();
            const trimmedText = text.trim();
            const processedText = trimmedText.toLowerCase();
            if (processedText === TABLE_TITLE ||
              processedText === 'Rincian'.toLowerCase()) {

              // console.log(`${i+1}.${j+1}.${k+1} TABLE_TITLE: ${trimmedText}`);
              titleFound = true;
              headersProcessed = false;
              headerLength = 0;
              rowLength = 0;

              tableObj = { title: '', data: [] };
            } else if (titleFound && !headersProcessed && thsLength >= 2) {
              if (k <= 0 && trimmedText.length <= 4) {
              } else if (k === 1) {
                // console.log(`${i+1}.${j+1}.${k+1} headerTitle: ${trimmedText}`);
                tableObj.title = trimmedText;

                // console.log('table with title: ', tableObj);
                tablesArray.push(tableObj);
                headers.push(province.name);
              } else {
                // console.log(`${i+1}.${j+1}.${k+1} header: ${trimmedText}`);
                headers.push(trimmedText);
              }
            }
          });

          if (titleFound && !headersProcessed && headers.length >= 2) {
            // headerLength = headers.length;
            headerLength = thsLength;

            if (headers.length && headers[headers.length - 1].toLowerCase() !== 'Jumlah Akhir'.toLowerCase()) {
              headers.push('Jumlah Akhir');
              headerLength += 1;
            }
            // console.log('headers: ', headers);

            if (i == 0) { tableObj.data.push(headers); }
          }
        }

        if (titleFound && headersProcessed) {
          headersProcessed = false;
        }
      });

    }).length;

    // console.log('tables: ', JSON.stringify(tablesArray));

    province.tables = tablesArray;
    // console.log('provinces: ', JSON.stringify(provinces));

    const tablesCsv = tablesArray.map(table => {
      return table.data.map(d => {
        return d.join(',');
      }).join('\n');
    }).join('\n');

    const csvData = new Uint8Array(Buffer.from(tablesCsv));
    const csvFilename = `${p + 1}. ${province.name}.csv`;
    fs.writeFile('csv/' + csvFilename, csvData, (err) => {
      if (err) { throw err; }
      console.log(csvFilename + ' saved');
    });

    await page.screenshot({ path: 'png/' + `${p + 1}. ${province.name}.png`, fullPage: true });
    await page.pdf({ path: 'pdf/' + `${p + 1}. ${province.name}.pdf`, format: 'A4' });
  }
  await browser.close();
})();
