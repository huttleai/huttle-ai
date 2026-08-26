/**
 * One-off utility: render a static HTML report to PDF via headless Chromium.
 * Usage: node scripts/render-report-pdf.mjs <input.html> <output.pdf>
 */
import { chromium } from 'playwright';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const [, , inputArg, outputArg] = process.argv;
if (!inputArg || !outputArg) {
  console.error('Usage: node scripts/render-report-pdf.mjs <input.html> <output.pdf>');
  process.exit(1);
}

const inputPath = path.resolve(process.cwd(), inputArg);
const outputPath = path.resolve(process.cwd(), outputArg);

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.goto(pathToFileURL(inputPath).href, { waitUntil: 'networkidle' });
  await page.pdf({
    path: outputPath,
    format: 'Letter',
    printBackground: true,
    margin: { top: '0in', bottom: '0in', left: '0in', right: '0in' },
  });
  console.log('PDF written to', outputPath);
} finally {
  await browser.close();
}
