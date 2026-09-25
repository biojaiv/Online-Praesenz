import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const base = process.env.EXAMPLE_URL || 'http://127.0.0.1:5173';
const output = '/tmp/projection-tunnel-check';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ args: ['--no-sandbox'] });
// Use the real tunnel, projection stylesheet, viewport and embedded page without
// starting the unrelated WebGL scene. The final integration is checked separately.
const fixture = `<!doctype html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="/src/ui/exampleProjection.css"><style>
:root{--cyan:#78bfff;--fiber-blue-rgb:120,191,255;--ink-dim:#9caeba;--ink:#d4e8f8;--amber:#e8a45a;--amber-dim:#8b6236;--deep:#07101d;--font-body:Arial,sans-serif;--tracking-label:.1em}body{margin:0;background:#03060d}
</style></head><body><dialog class="example-projection" data-state="open"><div class="example-projection__controls"><button data-back><kbd>ESC</kbd> Zurück zur Übersicht ↩</button></div><div class="example-projection__light"><div class="example-projection__screen"><iframe title="Tiefgang" src="/beispiel/?lang=de&embedded=1"></iframe></div></div></dialog>
<script type="module">
import {createWarpTunnel} from '/src/ui/warpTunnel.js';
import {getProjectionViewport} from '/src/ui/projectionViewport.js';
window.ribs=[];window.draws=0;window.reflections=0;
const proto=CanvasRenderingContext2D.prototype,round=proto.roundRect,draw=proto.drawImage;
proto.roundRect=function(x,y,w,h,r){window.ribs.push({x,y,w,h,r});window.ribs=window.ribs.slice(-28);return round.call(this,x,y,w,h,r)};
proto.drawImage=function(source,...args){if(this.canvas.className==='warp-tunnel')window.draws++;if(source instanceof HTMLImageElement)window.reflections++;return draw.call(this,source,...args)};
const dialog=document.querySelector('dialog'),screen=document.querySelector('.example-projection__screen'),iframe=screen.querySelector('iframe');
function resize(){const v=getProjectionViewport();Object.assign(document.querySelector('.example-projection__light').style,{left:v.left+'px',top:v.top+'px',width:v.width+2+'px',height:v.height+2+'px',right:'auto',bottom:'auto'})}
window.addEventListener('resize',resize);resize();dialog.showModal();
window.tunnel=createWarpTunnel(dialog,screen,{reflectionSource:()=>'/example/preview-desktop-de.jpg'});
iframe.addEventListener('load',()=>tunnel.start());
if(iframe.contentDocument?.readyState==='complete')tunnel.start();
document.querySelector('[data-back]').onclick=()=>{tunnel.stop();dialog.close()};
</script></body></html>`;

try {
  for (const mobile of [false, true]) {
    const page = await browser.newPage({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
      isMobile: mobile, hasTouch: mobile, reducedMotion: 'no-preference', deviceScaleFactor: 1 });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.route('**/__tunnel-check', route => route.fulfill({ contentType: 'text/html', body: fixture }));
    await page.goto(`${base}/__tunnel-check`);
    await page.locator('.warp-tunnel').waitFor();
    await page.frameLocator('iframe').locator('.story-title').waitFor();
    await page.waitForTimeout(650);
    const screen = await page.locator('.example-projection__screen').boundingBox();
    assert.equal(Math.round(screen.width), mobile ? 366 : 1152);
    const getRibs = () => page.evaluate(() => ribs.slice(-7));
    if (!mobile) {
      assert(await page.evaluate(() => reflections > 0), 'Page preview reflects on the floor');
      const geometry = await getRibs(); assert.equal(geometry.length, 7);
      for (let i = 1; i < geometry.length; i++) {
        assert(geometry[i].r < geometry[i - 1].r, 'Rounding decreases with depth');
        if (i > 1) assert(geometry[i].x - geometry[i - 1].x < geometry[i - 1].x - geometry[i - 2].x, 'Ribs converge towards page');
      }
      const capture = () => page.locator('.warp-tunnel').evaluate(canvas => canvas.toDataURL());
      const before = await capture(); await page.waitForTimeout(400); assert.notEqual(await capture(), before, 'Light impulses move');
      await page.mouse.move(screen.x + screen.width * .2, screen.y + screen.height * .3);
      await page.waitForTimeout(550); const left = await getRibs();
      await page.mouse.move(screen.x + screen.width * .8, screen.y + screen.height * .7);
      await page.waitForTimeout(550); const right = await getRibs();
      assert(right[0].x > left[0].x + 3, 'Mouse movement inside the iframe reaches tunnel parallax');
      assert(right[0].x - left[0].x > right[6].x - left[6].x, 'Front ribs move more than back ribs');
      assert.deepEqual(await page.locator('.example-projection__screen').boundingBox(), screen, 'Page itself stays fixed');
      await page.mouse.move(720, 450); await page.waitForTimeout(500);
    } else {
      assert.equal(await page.evaluate(() => ribs.length), 0, 'No mobile ribs');
      assert.equal(await page.evaluate(() => reflections), 0, 'No mobile reflection');
      const count = await page.evaluate(() => draws); await page.waitForTimeout(400);
      assert.equal(await page.evaluate(() => draws), count, 'Mobile corners and glow need no animation loop');
    }
    const clearCentre = await page.locator('.warp-tunnel').evaluate(canvas => {
      const box = document.querySelector('.example-projection__screen').getBoundingClientRect();
      return canvas.getContext('2d').getImageData((box.x + box.width / 2) * canvas.width / innerWidth,
        (box.y + box.height / 2) * canvas.height / innerHeight, 1, 1).data[3];
    });
    assert.equal(clearCentre, 0, 'Tunnel never paints over the readable document');
    await page.screenshot({ path: `${output}/${mobile ? 'mobile' : 'desktop'}-tunnel.png` });
    await page.emulateMedia({ reducedMotion: 'reduce' }); await page.waitForTimeout(300);
    const stopped = await page.evaluate(() => draws);
    await page.mouse.move(25, 200); await page.waitForTimeout(450);
    assert.equal(await page.evaluate(() => draws), stopped, 'Reduced motion disables both pulses and parallax');
    if (!mobile) {
      await page.screenshot({ path: `${output}/desktop-reduced.png` });
      await page.emulateMedia({ reducedMotion: 'no-preference' }); await page.waitForTimeout(200);
      await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); });
      const hidden = await page.evaluate(() => draws); await page.waitForTimeout(300);
      assert.equal(await page.evaluate(() => draws), hidden, 'Hidden document pauses the tunnel');
      await page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); });
      await page.waitForFunction(previous => draws > previous, hidden);
      await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(300);
      const resized = await page.evaluate(() => draws); await page.waitForTimeout(300);
      assert.equal(await page.evaluate(() => draws), resized, 'Resizing to mobile stops the loop');
      assert.equal(Math.round((await page.locator('.example-projection__screen').boundingBox()).width), 366);
    } else {
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await page.setViewportSize({ width: 844, height: 390 }); await page.waitForTimeout(300);
      const landscape = await page.evaluate(() => draws); await page.waitForTimeout(300);
      assert.equal(await page.evaluate(() => draws), landscape, 'Landscape phones remain static');
      assert.equal(await page.evaluate(() => ribs.length), 0, 'Landscape phones also omit ribs');
      assert.equal(await page.evaluate(() => reflections), 0);
    }
    await page.evaluate(() => { window.oldCanvas = document.querySelector('.warp-tunnel'); tunnel.stop(); });
    assert.equal(await page.locator('.warp-tunnel').count(), 0);
    assert.equal(await page.evaluate(() => oldCanvas.width), 0, 'Closing releases the backing buffer');
    const closed = await page.evaluate(() => draws); await page.waitForTimeout(200);
    assert.equal(await page.evaluate(() => draws), closed);
    await page.evaluate(() => tunnel.start()); assert.equal(await page.locator('.warp-tunnel').count(), 1);
    await page.evaluate(() => tunnel.dispose()); assert.equal(await page.locator('.warp-tunnel').count(), 0);
    assert.deepEqual(errors, []); await page.close();
    console.log(`PASS ${mobile ? 'mobile' : 'desktop'}: geometry, reflection, motion, iframe parallax, resize, reduced motion, pause and disposal`);
  }
} finally { await browser.close(); }
