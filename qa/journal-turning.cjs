const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1100,height:800}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4173/');const phase=name=>page.waitForFunction(n=>document.querySelector('#journal')?.dataset.state===n,name);await phase('closed');
  await page.locator('#journal-open').click();await phase('opening');
  assert.equal(await page.locator('.cover-back .journal-folio').textContent(),'01');
  assert.equal(await page.locator('.book-spread>.left-page').isVisible(),false,'stationary left page must not appear ahead of the cover');
  const cover=await page.evaluate(()=>{const el=document.querySelector('.book-cover'),animation=el.getAnimations()[0];animation.currentTime=animation.effect.getTiming().duration*.97;return getComputedStyle(el).opacity;});assert.equal(cover,'1','cover must turn, not fade through its own back');
  await phase('open');await page.waitForTimeout(150);
  assert.equal(await page.locator('.cover-back').textContent(),'');assert.equal(await page.locator('[aria-label="编辑船名"]').count(),1);
  const appearance=await page.locator('.journal-book').evaluate(n=>({matrix:getComputedStyle(n).transform,font:getComputedStyle(n.querySelector('.journal-page')).fontFamily,stack:getComputedStyle(n.querySelector('.book-page-stack')).visibility}));assert.ok(!appearance.matrix.startsWith('matrix3d'),'resting text is flat');assert.ok(!appearance.font.includes('KaiTi'));assert.equal(appearance.stack,'hidden');
  await page.screenshot({path:'qa/book-type-fixed.png'});
  await page.locator('#journal-next').click();await phase('flipping');assert.deepEqual(await page.locator('.flip-page .journal-folio').allTextContents(),['02','03'],'front and back are different, correct pages');await phase('open');await page.waitForTimeout(150);
  assert.equal(await page.locator('.left-page [data-skin]').count(),9);assert.equal(await page.locator('.left-page .paper-skins').innerText(),'');assert.ok(await page.locator('[data-skin=classic]').getAttribute('aria-label'));assert.equal(await page.locator('.right-page [data-accessory] span:not(.accessory-thumb)').count(),0);await page.screenshot({path:'qa/book-icons-fixed.png'});
  await page.locator('#journal-prev').click();await phase('flipping');assert.deepEqual(await page.locator('.flip-page .journal-folio').allTextContents(),['03','02']);await phase('open');
  await page.locator('#journal-close').click();await phase('closing');assert.equal(await page.locator('.cover-back .journal-folio').textContent(),'01');await phase('closed');
  await page.setViewportSize({width:560,height:540});await page.locator('#journal-open').click();await phase('open');await page.waitForTimeout(150);await page.screenshot({path:'qa/book-small-fixed.png'});await page.keyboard.press('Escape');await phase('closed');
  await page.emulateMedia({reducedMotion:'reduce'});await page.locator('#journal-open').click();await phase('open');await page.keyboard.press('Escape');await phase('closed');
  assert.deepEqual(errors,[]);console.log('PASS: cover continuity, distinct forward/back page faces, no stale cover controls, flat text, icon-only options, no outside stack, small window and reduced motion.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
