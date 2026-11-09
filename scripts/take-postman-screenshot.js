import puppeteer from 'puppeteer';
import path from 'path';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const reportPath = `file:///${path.join(process.cwd(), 'postman-report.html').replace(/\\/g, '/')}`;
  
  console.log(`Opening ${reportPath}`);
  await page.goto(reportPath, { waitUntil: 'networkidle0', timeout: 30000 });
  await delay(2000);

  // Take screenshot of the main dashboard
  await page.screenshot({ path: path.join(process.cwd(), 'screenshots/postman_1_dashboard.png'), fullPage: false });

  // Click on "Total Requests" tab to show the requests
  await page.evaluate(() => {
    document.querySelector('a[href="#pills-requests"]').click();
  });
  await delay(1000);
  
  // Expand the first folder "Auth"
  await page.evaluate(() => {
    const folders = document.querySelectorAll('.card-header');
    if (folders.length > 0) folders[0].click();
  });
  await delay(1000);
  await page.screenshot({ path: path.join(process.cwd(), 'screenshots/postman_2_auth.png'), fullPage: false });

  // Expand "Subjects"
  await page.evaluate(() => {
    const folders = document.querySelectorAll('.card-header');
    if (folders.length > 1) folders[1].click();
  });
  await delay(1000);
  await page.screenshot({ path: path.join(process.cwd(), 'screenshots/postman_3_subjects.png'), fullPage: false });

  // Expand "Tasks"
  await page.evaluate(() => {
    const folders = document.querySelectorAll('.card-header');
    if (folders.length > 2) folders[2].click();
  });
  await delay(1000);
  await page.screenshot({ path: path.join(process.cwd(), 'screenshots/postman_4_tasks.png'), fullPage: false });

  await browser.close();
  console.log('Screenshots taken!');
}

run();
