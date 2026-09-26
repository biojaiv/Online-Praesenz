/** Run against the actual Vite page: node scripts/example/check_annotations.mjs */
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { STATIONS, LABEL_COLUMN, STORAGE_CONTACT } from '../../src/example/diagramLayout.js';
const base = process.env.EXAMPLE_URL || 'http://127.0.0.1:5173';
const browser = await chromium.launch({ headless: true });
let completed = 0;
try {
  for (const [width, height] of [[1920,1080], [1440,900], [1280,800], [1024,768], [390,844]]) {
    for (const language of ['de', 'en']) {
      const page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'no-preference' });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(`${base.replace(/\/$/, '')}/beispiel/?lang=${language}`);
      await page.locator('.chapter-nav').waitFor();
      const units = await page.locator('.stage .service-chassis').evaluateAll(nodes => nodes.map(el => ({ id: el.dataset.server, top: el.getBoundingClientRect().top, bottom: el.getBoundingClientRect().bottom })));
      assert.deepEqual(units.map(unit => unit.id), ['provisioning', 'ad', 'services']);
      assert(units[1].top > units[0].bottom && units[2].top > units[1].bottom, 'Dedicated AD chassis has its own space');
      assert.equal(await page.locator('.stage .laptop-lower-guide-cut').count(), 1, 'Cloned lower guide is masked');
      const jump = async chapter => {
        await page.locator(`.chapter-nav [data-jump="${chapter}"]`).click();
        await page.waitForFunction(id => document.querySelector('.stage .source-infrastructure')?.dataset.station === id, STATIONS[chapter].id);
        await page.waitForTimeout(250);
      };
      for (let chapter = 0; chapter < 7; chapter++) {
        await jump(chapter);
        const label = await page.locator('.stage .station-label').evaluate(el => {
          const caption = el.querySelector('.source-backup-caption');
          return { x: +el.getAttribute('x'), width: +el.getAttribute('width'), y: +el.getAttribute('y'),
            visible: getComputedStyle(el).visibility, textFits: caption.scrollWidth <= caption.clientWidth + 1 };
        });
        assert.equal(label.x, LABEL_COLUMN.x);
        assert.equal(label.width, LABEL_COLUMN.width);
        assert.equal(label.y, STATIONS[chapter].labelY - LABEL_COLUMN.height / 2);
        assert.equal(label.visible, 'visible');
        assert(label.textFits, 'Complete label fits its constant width');
      }
      await jump(1);
      await page.evaluate(() => scrollTo({ top: innerHeight * 1.22, behavior: 'instant' }));
      await page.waitForFunction(() => document.querySelector('.stage .packet')?.transform.baseVal.consolidate()?.matrix.e === 740);
      const packetX = () => page.locator('.stage .packet').evaluate(el => el.transform.baseVal.consolidate().matrix.e);
      assert.equal(await packetX(), 740);
      await page.locator('[data-cable]').click();
      await page.waitForFunction(() => document.querySelector('.stage .source-infrastructure')?.dataset.link === 'failing');
      assert.equal(await packetX(), 740);
      await page.waitForFunction(() => document.querySelector('.stage .source-infrastructure')?.dataset.link === 'backup');
      assert.equal(await packetX(), 812);
      await page.locator('[data-cable]').click();
      await page.waitForFunction(() => document.querySelector('.stage .source-infrastructure')?.dataset.link === 'primary');
      assert.equal(await packetX(), 740);

      await jump(2);
      for (let step = 0; step < 4; step++) {
        const geometry = await page.locator('.hint-rail').evaluate(rail => {
          const root = rail.closest('.workspace');
          const svg = root.querySelector('.source-infrastructure');
          const card = rail.getBoundingClientRect(), story = root.querySelector('.story');
          const occupiedRight = Math.max(...[...story.children].filter(node => !node.hidden).map(node => node.getBoundingClientRect().right));
          const left = new DOMPoint(634, 500).matrixTransform(svg.getScreenCTM()).x;
          const drawing = root.querySelector('.stage').getBoundingClientRect();
          return { mode: rail.dataset.mode, target: rail.dataset.target, hidden: rail.hidden,
            outside: rail.dataset.mode === 'side' ? card.left >= occupiedRight && card.right < left : card.top >= drawing.bottom - 1,
            d: root.querySelector('.interaction-leader path').getAttribute('d'),
            h: card.height, w: card.width };
        });
        assert(!geometry.hidden && geometry.outside && geometry.h > 0 && geometry.w > 0, 'Question does not cover hardware or left section');
        assert.equal(geometry.target, 'dhcp');
        assert(geometry.d?.startsWith('M'), 'Leader is drawn to DHCP');
        if (step < 3) await page.locator('[data-dhcp]').click();
      }
      await jump(4);
      await page.locator('.vm-open').click({ force: true });
      await page.waitForFunction(() => document.querySelector('.hint-rail')?.dataset.target === 'vm' && !document.querySelector('.hint-rail').hidden);
      await page.keyboard.press('Escape');
      await jump(6);
      await page.evaluate(() => scrollTo({ top: innerHeight * 6.6, behavior: 'instant' }));
      await page.locator('.completion').waitFor({ state: 'visible' });
      const finish = await page.locator('.completion').evaluate(el => {
        const css = getComputedStyle(el);
        return { opacity: css.opacity, background: css.backgroundColor, blur: css.backdropFilter,
          supported: CSS.supports('backdrop-filter', 'blur(8px)') };
      });
      assert.equal(finish.opacity, '1', 'Message text is not made transparent');
      assert(finish.background.startsWith('rgba('), 'Background is translucent');
      if (finish.supported) assert(finish.blur.includes('8px'));
      const end = await page.locator('.stage .storage-connection').evaluate(el => {
        const point = el.getPointAtLength(el.getTotalLength());
        return { x: point.x, y: point.y };
      });
      assert(Math.abs(end.x - STORAGE_CONTACT.x) < .01 && Math.abs(end.y - STORAGE_CONTACT.bottom) < .01);
      assert.deepEqual(errors, [], 'No JavaScript page errors');
      await page.close(); completed++;
      console.log(`PASS ${language} ${width}x${height}: seven anchors, A/B, side/inline note, VM, blur and storage link`);
    }
  }
  console.log(`PASS: ${completed} browser configurations`);
} finally { await browser.close(); }
