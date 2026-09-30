/** Screenshot every Pokémon through the game's real renderer (models, materials, lighting).
 * Needs the dev server: `npm run dev`, then
 *   node scripts/review-pokemon-skins.mjs [output-directory] [--motion walk] [--url http://127.0.0.1:7173]
 * Writes sheet-01.png … sheet-04.png (40 Pokémon each, rest pose unless --motion is given).
 * The offline pose sheets (audit-pokemon-motion.mjs) check joints only and draw no skins. */
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright-core';

const args = process.argv.slice(2);
const option = name => { const i = args.indexOf(`--${name}`); return i >= 0 ? args.splice(i, 2)[1] : undefined; };
const motion = option('motion');
const base = option('url') ?? 'http://127.0.0.1:7173';
const output = args[0] ?? 'docs/model-review/skins';
await mkdir(output, { recursive: true });
// Software WebGL, so the sheets render the same on any machine.
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext({ viewport: { width: 1600, height: 1000 } })).newPage();
const errors = [];
page.on('pageerror', error => errors.push(String(error)));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
for (let sheet = 1; sheet <= 4; sheet++) {
  await page.goto(`${base}/review.html?sheet=${sheet}${motion ? `&motion=${motion}` : ''}`);
  await page.waitForSelector('[data-ready="true"]', { timeout: 120000 });
  const name = `${output}/sheet-${String(sheet).padStart(2, '0')}${motion ? `-${motion}` : ''}.png`;
  await page.locator('[data-ready]').screenshot({ path: name });
  console.log(`Rendered ${name}`);
}
await browser.close();
if (errors.length) { console.error(errors.slice(0, 10).join('\n')); process.exit(1); }
