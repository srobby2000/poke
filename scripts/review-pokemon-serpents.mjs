/** Actual game renderer, six labeled views per species. Start npm run dev first.
 * node scripts/review-pokemon-serpents.mjs [output] [url]
 * Set CHROME_PATH only when Playwright's bundled Chromium isn't installed. */
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright-core';
const output = process.argv[2] ?? 'docs/model-review/serpent-rest';
const url = process.argv[3] ?? 'http://127.0.0.1:7173';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  const page = await browser.newPage({ viewport: { width: 1260, height: 840 } });
  const errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  for (const species of ['ekans', 'arbok', 'dratini', 'dragonair']) {
    await page.goto(`${url}/review.html?species=${species}&motion=idle&views=all`);
    await page.waitForSelector('[data-ready="true"]');
    await page.locator('[data-ready]').screenshot({ path: `${output}/${species}-views.png` });
    console.log(`Reviewed ${species}`);
  }
  if (errors.length) throw new Error(errors.join('\n'));
} finally { await browser.close(); }
