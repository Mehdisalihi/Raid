const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  try {
    await page.goto('http://localhost:3001', { waitUntil: 'networkidle2' });

    const title = await page.title();
    console.log('Page Title:', title);
    
    const statusBar = await page.$('.bg-green-600, .bg-red-600, .bg-blue-600');
    if (statusBar) {
      console.log('Offline status bar detected successfully.');
    } else {
      console.log('Offline status bar not found.');
    }
  } catch (error) {
    console.error('Error connecting to localhost:3000:', error.message);
  } finally {
    await browser.close();
  }
})();
