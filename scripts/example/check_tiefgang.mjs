import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const base=process.env.EXAMPLE_URL||'http://127.0.0.1:5173';
const out='/tmp/tiefgang-check'; await mkdir(out,{recursive:true});
const browser=await chromium.launch({args:['--no-sandbox']});
const viewports=process.env.TIEFGANG_VIEWPORTS?JSON.parse(process.env.TIEFGANG_VIEWPORTS):[[1440,900],[1236,754],[768,1024],[390,844],[320,624],[844,390]];
try {
  for(const [width,height] of viewports) for(const lang of ['de','en']) {
    const page=await browser.newPage({viewport:{width,height},reducedMotion:'no-preference'});
    const errors=[], requests=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
    await page.goto(`${base}/beispiel/?lang=${lang}`);await page.locator('.story-title').waitFor();await page.evaluate(()=>document.fonts.ready);
    assert.equal(await page.locator('html').getAttribute('lang'),lang);
    assert.equal(await page.locator('.tiefgang-frame .hologram-border').count(),1);
    assert.equal(await page.locator('[data-tiefgang-start]').getAttribute('href'),`/beispiel/?lang=${lang}`);
    assert.equal(await page.locator('[data-tiefgang-hologram]').getAttribute('href'),`/?lang=${lang}#projekte/webseiten`);
    assert.equal(await page.locator('.chapter-nav a').count(),7);
    assert.equal(requests.some(url=>/terminal[.-]|@xterm/.test(url)),false,'No terminal code is requested');
    assert(!await page.locator('[data-cable]').isVisible(),'Failure switch is absent before chapter02');
    assert.equal(await page.locator('[data-depth="simple"]').getAttribute('aria-pressed'),'true');
    assert.match(await page.locator('.simple-caption').innerText(),lang==='de'?/In einfachen Worten/i:/In plain words/i);
    await page.locator('.term-chips [data-term="client"]').click();
    assert(await page.locator('.term-pop').isVisible());await page.keyboard.press('Escape');
    assert.equal(await page.locator('.term-chips [data-term="client"]').getAttribute('aria-expanded'),'false');
    const geometry=await page.evaluate(()=>{
      const s=document.querySelector('.stage').getBoundingClientRect(), f=document.querySelector('.depth').getBoundingClientRect();
      return {overflow:document.documentElement.scrollWidth>innerWidth,stage:s.bottom,footer:f.top};
    });
    assert(!geometry.overflow);if(width>900&&height>550)assert(geometry.stage<=geometry.footer+1,'Drawing fits above depth ruler');
    await page.screenshot({path:`${out}/${width}-${lang}-start.png`});
    const go=async n=>{
      if(width>900) await page.locator(`.chapter-nav [data-jump="${n}"]`).click();
      else await page.locator('.chapter-picker').selectOption(String(n));
      await page.waitForFunction(n=>document.querySelector('.chapter-nav [aria-current]')?.dataset.jump===String(n),n);await page.waitForTimeout(650);
    };
    const showLog=async()=>{
      if(width<=900&&await page.locator('[data-protocol-toggle]').getAttribute('aria-expanded')!=='true')await page.locator('[data-protocol-toggle]').click();
      if(width<=900) {
        await page.waitForFunction(()=>{const t=document.querySelector('.time'),b=t.getBoundingClientRect();return b.top>=0&&b.bottom<=innerHeight&&t.contains(document.elementFromPoint(b.left+b.width/2,b.top+b.height/2));});
        await page.locator('.protocol-inner').evaluate(e=>e.scrollTop=100);
        await page.waitForFunction(()=>{const t=document.querySelector('.time'),b=t.getBoundingClientRect();return t.contains(document.elementFromPoint(b.left+b.width/2,b.top+b.height/2));});
        await page.locator('.protocol-inner').evaluate(e=>e.scrollTop=0);
      }
    };
    const closeLog=async()=>{if(width<=900&&await page.locator('[data-protocol-toggle]').getAttribute('aria-expanded')==='true')await page.locator('[data-protocol-toggle]').click();};
    await go(1);await page.locator('[data-cable]').click();
    assert.equal(await page.locator('.stage svg.infrastructure').getAttribute('data-link'),'failing');
    assert(await page.locator('.log-lines .error').count()>0);
    await page.waitForFunction(()=>document.querySelector('.stage svg.infrastructure').dataset.link==='backup');
    await showLog();
    assert.match(await page.locator('.log-lines').innerText(),lang==='de'?/Leitung B übernimmt/:/Link B takes over/);
    await page.locator('[data-log-mode="tech"]').click();
    assert.match(await page.locator('.log-lines').innerText(),/uplink B forwarding/);
    await page.locator('[data-log-mode="plain"]').click();
    await closeLog();
    await page.locator('[data-cable]').click();assert.equal(await page.locator('.stage svg.infrastructure').getAttribute('data-link'),'primary');
    await go(2);
    const labels=await page.locator('.drawing-wrap .diagram-label').evaluateAll(nodes=>{
      const boxes=nodes.map(e=>e.getBoundingClientRect()),canvas=document.createElement('canvas').getContext('2d');
      return {overlap:boxes.some((b,i)=>i&&boxes[i-1].bottom>b.top+1),brokenWord:nodes.some(e=>{const title=e.querySelector('strong');canvas.font=getComputedStyle(title).font;return title.textContent.split(/\s+/).some(word=>canvas.measureText(word).width>title.clientWidth+1);})};
    });
    assert(!labels.overlap,'Device labels and second lines do not collide');assert(!labels.brokenWord,'No device name breaks inside a word');
    await page.waitForFunction(()=>{
      const pin=document.querySelector('.cable-pin').getBoundingClientRect();
      return [...document.querySelectorAll('.drawing-wrap .diagram-label')].every(node=>{
        const box=node.getBoundingClientRect();
        return pin.right<=box.left||pin.left>=box.right||pin.bottom<=box.top||pin.top>=box.bottom;
      });
    });
    await page.locator('[data-depth="explained"]').click();assert.match(await page.locator('.story-text').innerText(),/DHCP/);
    await page.locator('[data-depth="tech"]').click();assert.match(await page.locator('.story-text').innerText(),/Discover, Offer, Request, Acknowledge/);
    await page.locator('[data-depth="simple"]').click();assert.match(await page.locator('.story-text').innerText(),lang==='de'?/Hausnummer/:/house number/);
    assert.match(await page.locator('.depth-scale').getAttribute('aria-label'),lang==='de'?/Netz, die Wege/:/Network, the paths/);
    for(const code of ['DISCOVER','OFFER','REQUEST','ACK']) {
      assert.equal(await page.locator('.dhcp-code').textContent(),code);
      if(code!=='ACK')await page.locator('[data-dhcp]').click();
    }
    await showLog();assert.match(await page.locator('.log-lines li:last-child .log-original').innerText(),/DHCPACK/);
    await showLog();await page.locator('[data-log-mode="tech"]').click();assert.match(await page.locator('.log-lines').innerText(),/DHCPACK/);
    await page.locator('[data-log-mode="plain"]').click();
    await closeLog();
    const card=await page.locator('.dhcp-card').boundingBox(); assert(card.x>=0&&card.x+card.width<=width,'DHCP dialogue stays inside mobile viewport');
    await page.screenshot({path:`${out}/${width}-${lang}-dhcp.png`});
    await page.locator('[data-replay]').click();assert.equal(await page.locator('.dhcp-code').textContent(),'DISCOVER');
    await go(3);await page.locator('.vm-open').click();await page.locator('.vm-card').waitFor({state:'visible'});assert(await page.locator('.vm-card').isVisible());
    assert.match(await page.locator('.vm-card').innerText(),/Windows Server/);
    await page.keyboard.press('Escape');assert(!await page.locator('.vm-card').isVisible());
    await go(4);
    await page.keyboard.press('Control+k');
    assert.equal(await page.locator('[data-terminal],.terminal-dialog,.xterm').count(),0,'Terminal UI and shortcut are removed');
    assert(await page.locator('.stage image.source-art').count()>0,'Supplied illustration is used');
    await page.evaluate(()=>scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));
    await page.locator('.completion').waitFor({state:'visible'});
    assert(await page.locator('[data-tiefgang-start]').isVisible());
    assert(await page.locator('[data-tiefgang-hologram]').isVisible());
    assert.equal(await page.locator('.tiefgang-navigation').evaluate(e=>getComputedStyle(e).position),'fixed');
    assert.equal(await page.locator('.time').textContent(),'00:35:00');assert.equal(await page.locator('progress').getAttribute('value'),'100');
    assert.equal(await page.locator('.ready-list [data-jump]').count(),7);
    assert.equal(await page.locator('.stage .drawing-wrap').evaluate(e=>getComputedStyle(e).opacity),'1');
    assert.match(await page.locator('.completion').innerText(),lang==='de'?/nicht.*gemessen|weder gemessen/:/neither measured/);
    if(width<=900) {await page.evaluate(()=>document.querySelector('.workspace').scrollTo(0,99999));assert(await page.locator('.counter').isVisible());}
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
    await page.locator('.chapter-picker').selectOption('2');
    assert(await page.locator('#chapter-3').evaluate(el=>Math.abs(el.getBoundingClientRect().top)<40));
    await page.locator('[data-tiefgang-start]').click();
    await page.locator('.tiefgang-frame .hologram-border').waitFor();
    await page.waitForFunction(()=>scrollY<2);
    assert.equal(await page.locator('.tiefgang-frame .hologram-border').count(),1);
    await page.close();
  }
  const nojs=await browser.newPage({javaScriptEnabled:false});await nojs.goto(`${base}/beispiel/`);
  assert.equal(await nojs.locator('.chapter-content').count(),14);
  assert.equal(await nojs.locator('#reading-en').getAttribute('lang'),'en');
  assert.equal(await nojs.locator('#reading-de').getAttribute('lang'),'de');
  assert.equal(await nojs.locator('.chapter-content svg.infrastructure').count(),14);
  await nojs.close();console.log('PASS reduced motion and complete bilingual no-JavaScript reading views');
} finally {await browser.close();}
