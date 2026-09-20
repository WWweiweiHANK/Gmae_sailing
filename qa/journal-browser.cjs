// Run against npm run preview:gm. Set NODE_PATH to an installed Playwright package directory.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true}),errors=[],result={};
 try{
  const context=await browser.newContext({viewport:{width:1280,height:800},deviceScaleFactor:1});
  await context.addInitScript(()=>{window.oceanTools={};Object.defineProperty(document,'modelContext',{value:{registerTool:tool=>window.oceanTools[tool.name]=tool}});});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4173/?sailingDebug=fast');await page.waitForFunction(()=>document.querySelector('#loading').hidden&&!document.querySelector('#error').textContent);
  const state=()=>page.evaluate(()=>window.oceanTools.get_ocean_state.execute({}));
  await page.locator('#scene').focus();await page.keyboard.press('Enter');await page.waitForTimeout(1100);
  await page.locator('#journal-open').click();await page.waitForTimeout(1200);assert.match(await page.locator('.left-page').innerText(),/故事，刚刚开始/);
  await page.locator('#journal-close').click();await page.waitForTimeout(1000);
  // Inject completed events into the actual bus in this isolated development save.
  await page.evaluate(()=>{
   const ids=['giant_whale_shadow','giant_whale_surface','pink_dolphin','bioluminescent_sea','meteor_shower','polar_bear_ice','fog_lighthouse','massive_bird_migration','dolphin_companion','quiet_day'];
   for(let i=0;i<ids.length;i++)window.emitWorldEvent('encounter_completed',{encounterId:ids[i],startTime:new Date(1790000000000+i*60000).toISOString(),endTime:new Date(1790000040000+i*60000).toISOString(),shipName:'小雨号',weather:'clear',timeOfDay:'dusk',firstTime:true,seenCount:1,souvenirUnlocked:true});
  });
  assert.equal(await page.locator('#journal-unread').isVisible(),true);assert.match(await page.locator('#journal-open').getAttribute('aria-label'),/10/);
  const before=await state();await page.locator('#journal-open').click();await page.waitForTimeout(1200);const during=await state();assert.ok(during.travelTime>before.travelTime);assert.equal(during.rendererCount,1);
  assert.match(await page.locator('.left-page').innerText(),/海底的影子/);assert.match(await page.locator('.right-page').innerText(),/原来是它/);
  assert.equal(await page.locator('#ship-panel').evaluate(el=>getComputedStyle(el).opacity),'0');assert.equal(await page.locator('#edit').isVisible(),false);
  assert.equal(await page.locator('#journal-unread').isVisible(),false);await page.screenshot({path:'qa/journal-wide.png'});
  await page.locator('#journal-next').click();await page.waitForTimeout(350);await page.screenshot({path:'qa/journal-flip.png'});await page.waitForTimeout(500);
  assert.match(await page.locator('.left-page').innerText(),/粉色的来客/);assert.match(await page.locator('.right-page').innerText(),/会发光的海/);
  await page.locator('#journal-prev').click();await page.waitForTimeout(820);assert.match(await page.locator('.left-page').innerText(),/海底的影子/);
  await page.locator('.journal-book').hover();await page.mouse.wheel(0,140);await page.mouse.wheel(0,140);await page.mouse.wheel(0,140);await page.waitForTimeout(1000);assert.match(await page.locator('#journal-page-number').textContent(),/^3 — 4/);
  await page.keyboard.press('Escape');await page.waitForTimeout(1000);assert.equal(await page.locator('#journal').evaluate(el=>el.classList.contains('is-open')),false);assert.equal(await page.locator('#ship-panel').isVisible(),true);assert.equal(await page.locator('#journal-open').evaluate(el=>document.activeElement===el),true);
  await page.locator('#journal-open').click();await page.waitForTimeout(1150);assert.match(await page.locator('#journal-page-number').textContent(),/^9 — 10/);
  await page.keyboard.press('Home');await page.setViewportSize({width:560,height:540});await page.waitForTimeout(700);await page.screenshot({path:'qa/journal-desktop.png'});
  result.smallWindow=await page.locator('.journal-book').boundingBox();
  const overflow=await page.locator('.left-page,.right-page').evaluateAll(pages=>pages.map(p=>({overflow:p.scrollHeight>p.clientHeight,title:p.querySelector('h2').textContent})));assert.ok(overflow.every(p=>!p.overflow),JSON.stringify(overflow));
  await page.emulateMedia({reducedMotion:'reduce'});
  for(let spread=0;spread<5;spread++){
   const overlaps=await page.locator('.left-page,.right-page').evaluateAll(pages=>pages.map(p=>({title:p.querySelector('h2').textContent,overlap:(p.querySelector('.journal-keepsake')??p.querySelector('.journal-prose')).getBoundingClientRect().bottom>p.querySelector('.journal-folio').getBoundingClientRect().top})));
   assert.ok(overlaps.every(p=>!p.overlap),JSON.stringify(overlaps));if(spread<4){await page.keyboard.press('ArrowRight');await page.waitForTimeout(160);}
  }
  await page.keyboard.press('Home');await page.emulateMedia({reducedMotion:'no-preference'});
  await page.setViewportSize({width:390,height:700});await page.waitForTimeout(500);await page.screenshot({path:'qa/journal-narrow.png'});
  // 500 entries still reuse the same four page containers.
  await page.evaluate(()=>{for(let i=10;i<500;i++)window.emitWorldEvent('encounter_completed',{encounterId:'pink_dolphin',startTime:new Date(1790000000000+i*60000).toISOString(),endTime:new Date(1790000040000+i*60000).toISOString(),shipName:'小雨号',weather:'clear',timeOfDay:'day',firstTime:false,seenCount:i});});
  assert.equal(await page.locator('.journal-page').count(),4);result.pageContainers=4;
  await page.emulateMedia({reducedMotion:'reduce'});await page.keyboard.press('End');await page.keyboard.press('ArrowLeft');await page.waitForTimeout(180);assert.match(await page.locator('#journal-page-number').textContent(),/^497 — 498/);
  await page.keyboard.press('Escape');await page.waitForTimeout(180);assert.equal(await page.locator('#journal').evaluate(el=>el.classList.contains('is-open')),false);
  await page.reload();await page.waitForFunction(()=>document.querySelector('#loading').hidden);assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('tiny-tides-game-debug-v1')).journalEntries.length),500);
  assert.deepEqual(errors,[]);result.errors=errors;result.checks='empty / completed events / old names / next and previous / wheel cooldown / close and focus / unread and latest / 560 and 390 widths / 500 entries / reduced motion / reload';
  console.log(JSON.stringify(result,null,2));await fs.writeFile('qa/journal-browser-results.json',JSON.stringify(result,null,2)+'\n');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
