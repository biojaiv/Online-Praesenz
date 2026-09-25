import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const base=process.env.EXAMPLE_URL||'http://127.0.0.1:5173';
const out='/tmp/tiefgang-check'; await mkdir(out,{recursive:true});
const browser=await chromium.launch({args:['--no-sandbox']});
try {
  for(const [width,height] of [[1440,900],[1236,754],[768,1024],[390,844],[364,624]]) for(const lang of ['de','en']) {
    const page=await browser.newPage({viewport:{width,height},reducedMotion:'no-preference'});
    const errors=[], requests=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
    await page.goto(`${base}/beispiel/?lang=${lang}`);await page.locator('.story-title').waitFor();await page.evaluate(()=>document.fonts.ready);
    assert.equal(await page.locator('html').getAttribute('lang'),lang);
    assert.equal(await page.locator('.chapter-nav a').count(),7);
    assert.equal(requests.some(url=>/terminal[.-]|@xterm/.test(url)),false,'No terminal code is requested');
    assert(await page.locator('[data-cable]').isDisabled());
    const geometry=await page.evaluate(()=>{
      const s=document.querySelector('.stage').getBoundingClientRect(), f=document.querySelector('.depth').getBoundingClientRect();
      return {overflow:document.documentElement.scrollWidth>innerWidth,stage:s.bottom,footer:f.top};
    });
    assert(!geometry.overflow);assert(geometry.stage<=geometry.footer+1,'Drawing fits above depth ruler');
    await page.screenshot({path:`${out}/${width}-${lang}-start.png`});
    const go=async n=>{await page.locator(`.chapter-nav [data-jump="${n}"]`).click();await page.waitForFunction(n=>document.querySelector('.chapter-nav [aria-current]')?.dataset.jump===String(n),n);await page.waitForTimeout(650);};
    await go(1);await page.locator('[data-cable]').click();
    assert.equal(await page.locator('.stage svg.infrastructure').getAttribute('data-link'),'failing');
    assert(await page.locator('.log-lines .error').count()>0);
    await page.waitForFunction(()=>document.querySelector('.stage svg.infrastructure').dataset.link==='backup');
    assert.match(await page.locator('.log-lines').innerText(),/uplink B forwarding/);
    await page.locator('[data-cable]').click();assert.equal(await page.locator('.stage svg.infrastructure').getAttribute('data-link'),'primary');
    await go(2);
    for(const code of ['DISCOVER','OFFER','REQUEST','ACK']) {
      assert.equal(await page.locator('.dhcp-code').textContent(),code);
      if(code!=='ACK')await page.locator('[data-dhcp]').click();
    }
    assert.match(await page.locator('.log-lines').innerText(),/DHCPACK/);
    const card=await page.locator('.dhcp-card').boundingBox(); assert(card.x>=0&&card.x+card.width<=width,'DHCP dialogue stays inside mobile viewport');
    await page.screenshot({path:`${out}/${width}-${lang}-dhcp.png`});
    await page.locator('[data-replay]').click();assert.equal(await page.locator('.dhcp-code').textContent(),'DISCOVER');
    await go(3);await page.locator('.vm-open').click();assert(await page.locator('.vm-card').isVisible());
    assert.match(await page.locator('.vm-card').innerText(),/Windows Server/);
    await page.keyboard.press('Escape');assert(!await page.locator('.vm-card').isVisible());
    await go(4);
    await page.keyboard.press('Control+k');
    assert.equal(await page.locator('[data-terminal],.terminal-dialog,.xterm').count(),0,'Terminal UI and shortcut are removed');
    assert(await page.locator('.stage image.source-art').count()>0,'Supplied illustration is used');
    await page.evaluate(()=>scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));
    await page.locator('.completion').waitFor({state:'visible'});
    assert.equal(await page.locator('.time').textContent(),'00:04:12');assert.equal(await page.locator('progress').getAttribute('value'),'100');
    assert.equal(await page.locator('.completion [data-portfolio]').getAttribute('href'),'/#abschluss');
    await page.screenshot({path:`${out}/${width}-${lang}-end.png`});
    await page.locator('[data-restart]').click();await page.waitForFunction(()=>scrollY<2);
    await page.locator('#example-language').click();assert.equal(await page.locator('html').getAttribute('lang'),lang==='de'?'en':'de');
    assert.deepEqual(errors,[]);await page.close();console.log(`PASS ${width} × ${height} / ${lang}: chapters, DHCP, failover, VM, no terminal, completion`);
  }
  for(const lang of ['de','en']) {
    const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
    await page.goto(`${base}/beispiel/?lang=${lang}`);await page.locator('.reading-mode').waitFor();
    assert.equal(await page.locator('.chapter-content:visible').count(),7);
    assert.equal(await page.locator('.chapter-content svg.infrastructure').count(),7);
    await page.locator('.chapter-nav [data-jump="2"]').click();
    assert(await page.locator('#chapter-3').evaluate(el=>Math.abs(el.getBoundingClientRect().top)<40));
    await page.close();
  }
  const nojs=await browser.newPage({javaScriptEnabled:false});await nojs.goto(`${base}/beispiel/`);
  assert.equal(await nojs.locator('.chapter-content').count(),14);
  assert.equal(await nojs.locator('#reading-en').getAttribute('lang'),'en');
  assert.equal(await nojs.locator('#reading-de').getAttribute('lang'),'de');
  assert.equal(await nojs.locator('.chapter-content svg.infrastructure').count(),14);
  await nojs.close();console.log('PASS reduced motion and complete bilingual no-JavaScript reading views');
} finally {await browser.close();}
