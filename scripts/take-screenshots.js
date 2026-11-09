import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  const routes = [
    { path: '/esqueci-senha', name: 'esqueci-senha' }
  ];

  const screenshotsDir = path.join(process.cwd(), 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir);
  }

  for (const route of routes) {
    const url = `http://localhost:5173${route.path}`;
    console.log(`Navigating to ${url}...`);
    try {
      await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
      await delay(2000); // wait for animations
      const filePath = path.join(screenshotsDir, `${route.name}.png`);
      await page.screenshot({ path: filePath });
      console.log(`Saved screenshot to ${filePath}`);
    } catch (e) {
      console.error(`Error taking screenshot of ${route.path}:`, e);
    }
  }

  await browser.close();
  console.log('Done!');
}

run();
