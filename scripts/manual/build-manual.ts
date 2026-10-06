/**
 * Genera le schermate del gioco e il manuale PDF.
 *
 *   npm run manual
 *
 * 1. Compila il gioco e lo serve in locale (vite preview).
 * 2. Gioca una carriera dimostrativa con seed fisso, catturando le schermate:
 *    quelle usate dal tutorial vanno in public/tutorial/, le altre in docs/manual/img/.
 * 3. Ricompila (il tutorial ora include le immagini) e cattura la pagina del tutorial.
 * 4. Impagina il manuale in HTML e lo stampa in PDF: docs/Manuale-Beach-Volley-Manager.pdf.
 *
 * Usa il Chrome o l'Edge installato (variabile CHROME_PATH per indicarne un altro).
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium, type Browser, type Page } from 'playwright-core';
import { build, preview, type PreviewServer } from 'vite';
import { manualHtml } from './manual-content';

const ROOT = resolve(import.meta.dirname, '..', '..');
const TUTORIAL_DIR = join(ROOT, 'public', 'tutorial');
const EXTRA_DIR = join(ROOT, 'docs', 'manual', 'img');
const PDF_PATH = join(ROOT, 'docs', 'Manuale-Beach-Volley-Manager.pdf');
/** Schermate mostrate anche nel tutorial del gioco. */
const TUTORIAL_SHOTS = new Set([
  'dashboard',
  'calendar',
  'player',
  'pairs',
  'tournament',
  'match',
  'training',
  'finance',
  'market',
  'history',
  'ranking',
]);
const VIEWPORT = { width: 1280, height: 800 };

function findBrowser(): string {
  const candidates = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ].filter((p): p is string => !!p);
  const found = candidates.find((p) => existsSync(p));
  if (!found) throw new Error('Browser non trovato: imposta CHROME_PATH');
  return found;
}

export const shotPath = (name: string): string =>
  join(TUTORIAL_SHOTS.has(name) ? TUTORIAL_DIR : EXTRA_DIR, `${name}.jpg`);

async function serve(): Promise<{ server: PreviewServer; url: string }> {
  await build({ root: ROOT, logLevel: 'warn' });
  const server = await preview({
    root: ROOT,
    logLevel: 'warn',
    preview: { port: 4180, strictPort: true },
  });
  const url = server.resolvedUrls?.local[0];
  if (!url) throw new Error('Server di anteprima non disponibile');
  return { server, url };
}

class Recorder {
  constructor(private page: Page) {}

  async shot(name: string): Promise<void> {
    await this.page.waitForTimeout(250);
    await this.page.screenshot({ path: shotPath(name), type: 'jpeg', quality: 80 });
    console.log(`  schermata: ${name}`);
  }

  async nav(link: string, heading: string | RegExp): Promise<void> {
    await this.page.getByRole('link', { name: link, exact: true }).first().click();
    await this.page.getByRole('heading', { level: 1, name: heading }).waitFor();
  }

  async advance(weeks: number): Promise<void> {
    for (let i = 0; i < weeks; i++) {
      await this.page.getByRole('button', { name: 'Avanza settimana' }).click();
      await this.page.waitForTimeout(60);
    }
  }

  /** Attende che il messaggio temporaneo (toast) scompaia. */
  async waitToast(): Promise<void> {
    await this.page
      .getByRole('status')
      .filter({ hasText: /./ })
      .last()
      .waitFor({ state: 'detached', timeout: 6000 })
      .catch(() => undefined);
  }
}

async function captureGame(browser: Browser, url: string): Promise<void> {
  const context = await browser.newContext({ viewport: VIEWPORT });
  // Schermate pulite: niente invito al tutorial
  await context.addInitScript(() => localStorage.setItem('bvm:tutorial-banner-dismissed', '1'));
  const page = await context.newPage();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const r = new Recorder(page);

  await page.goto(url);
  await page.getByRole('button', { name: 'Nuova carriera' }).waitFor();
  await r.shot('home');

  await page.getByRole('button', { name: 'Nuova carriera' }).click();
  await page.getByLabel('Nome del manager').fill('Alex Marini');
  await page.getByLabel('Nome del club').fill('Beach Club Riviera');
  await page.getByLabel('Seed (opzionale)').fill('2027');
  await r.shot('newgame');
  await page.getByRole('button', { name: 'Inizia la carriera' }).click();
  await page.getByRole('heading', { level: 1, name: 'Dashboard' }).waitFor();

  // Sponsor e iscrizioni ai primi tornei
  await r.nav('Finanze', 'Finanze e sponsor');
  for (let i = 0; i < 2; i++) await page.getByRole('button', { name: 'Accetta' }).first().click();
  await r.nav('Calendario', /^Calendario/);
  for (let i = 0; i < 6; i++) {
    const btn = page.locator('button:not([disabled])', { hasText: /^Iscrivi$/ }).first();
    if ((await btn.count()) === 0) break;
    await btn.click();
  }
  await page.locator('[aria-current="date"]').scrollIntoViewIfNeeded();
  await r.shot('calendar');

  await r.nav('Rosa', 'Rosa e giocatori');
  await r.shot('squad');
  await page.locator('table a').first().click();
  await page.getByRole('heading', { name: 'Attributi' }).waitFor();
  await r.shot('player');
  await r.nav('Coppie', 'Coppie');
  await r.shot('pairs');
  await r.nav('Allenamento', 'Piani di allenamento');
  await r.shot('training');
  await r.nav('Staff', 'Staff tecnico');
  await r.shot('staff');

  // Settimana 4: primo torneo e partita in diretta
  await r.nav('Dashboard', 'Dashboard');
  await r.advance(3);
  await page.getByRole('link', { name: 'Vai al tabellone' }).first().click();
  await page.getByRole('button', { name: 'Gioca in diretta' }).first().click();
  await page.getByRole('heading', { level: 1, name: 'Partita in diretta' }).waitFor();
  for (let i = 0; i < 16; i++) await page.getByRole('button', { name: 'Punto successivo' }).click();
  await page.getByRole('button', { name: /^Timeout$/ }).click();
  await page.getByLabel('Servizio', { exact: true }).selectOption('aggressive');
  await page.getByRole('button', { name: 'Applica tattica' }).click();
  for (let i = 0; i < 6; i++) await page.getByRole('button', { name: 'Punto successivo' }).click();
  await r.waitToast();
  await r.shot('match');
  await page.getByRole('button', { name: 'Simula fino alla fine' }).click();
  await page.getByRole('button', { name: /Registra il risultato/ }).click();
  await page.waitForURL(/torneo/);
  for (let i = 0; i < 2; i++) await page.getByRole('button', { name: 'Simula la fase' }).click();
  await page.evaluate('window.scrollTo(0, 0)');
  await r.shot('tournament');
  await page.getByRole('button', { name: 'Simula fino alla fine' }).click();

  // A metà stagione
  await r.nav('Dashboard', 'Dashboard');
  await r.advance(6);
  await r.shot('dashboard');
  await r.nav('Finanze', 'Finanze e sponsor');
  await r.shot('finance');
  await r.nav('Mercato', 'Mercato e scouting');
  await page
    .getByRole('button', { name: /^Osserva / })
    .first()
    .click();
  await r.shot('market');
  await r.nav('Ranking', 'Ranking del circuito');
  await r.shot('ranking');

  // Fine stagione
  await r.nav('Dashboard', 'Dashboard');
  await r.advance(21);
  await r.nav('Storico', 'Storico');
  await r.shot('history');
  await r.nav('Impostazioni', 'Impostazioni');
  await r.shot('settings');

  if (errors.length) throw new Error(`Errori nella pagina:\n${errors.join('\n')}`);
  await context.close();
}

async function captureTutorial(browser: Browser, url: string): Promise<void> {
  const context = await browser.newContext({ viewport: VIEWPORT });
  await context.addInitScript(() =>
    localStorage.setItem(
      'bvm:tutorial-read',
      JSON.stringify(['goal', 'time', 'players', 'pairs', 'tournaments']),
    ),
  );
  const page = await context.newPage();
  await page.goto(`${url}#/tutorial/match`);
  await page.getByRole('heading', { name: 'Giocare una partita' }).waitFor();
  await page.waitForLoadState('networkidle');
  const r = new Recorder(page);
  await r.shot('tutorial');
  await context.close();
}

async function printPdf(browser: Browser): Promise<void> {
  const htmlPath = join(tmpdir(), 'bvm-manuale.html');
  writeFileSync(
    htmlPath,
    manualHtml(
      (name) => pathToFileURL(shotPath(name)).href,
      pathToFileURL(join(ROOT, 'public', 'brand', 'logo.png')).href,
    ),
  );
  const page = await browser.newPage();
  await page.goto(pathToFileURL(htmlPath).href);
  await page.waitForLoadState('networkidle');
  await page.pdf({
    path: PDF_PATH,
    format: 'A4',
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: '<span></span>',
    footerTemplate:
      '<div style="width:100%;font-size:8px;color:#7c5a22;padding:0 14mm;display:flex;justify-content:space-between;font-family:Segoe UI,Arial,sans-serif">' +
      '<span>Beach Volley Manager — Manuale di gioco</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>',
    margin: { top: '14mm', bottom: '16mm', left: '14mm', right: '14mm' },
  });
  await page.close();
  console.log(`PDF: ${PDF_PATH}`);
}

async function main(): Promise<void> {
  mkdirSync(TUTORIAL_DIR, { recursive: true });
  mkdirSync(EXTRA_DIR, { recursive: true });
  const browser = await chromium.launch({ executablePath: findBrowser(), headless: true });
  try {
    console.log('Cattura delle schermate di gioco…');
    let { server, url } = await serve();
    await captureGame(browser, url);
    await server.close();
    console.log('Cattura del tutorial…');
    ({ server, url } = await serve());
    await captureTutorial(browser, url);
    await server.close();
    console.log('Impaginazione del PDF…');
    await printPdf(browser);
  } finally {
    await browser.close();
  }
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
