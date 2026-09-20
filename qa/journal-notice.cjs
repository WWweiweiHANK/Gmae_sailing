const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),http=require('node:http');
(async()=>{
 const html=await fs.readFile('qa-preview/index.html'),server=http.createServer((req,res)=>res.setHeader('Content-Type','text/html').end(html));await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const p=await browser.newPage({viewport:{width:560,height:540}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto(`http://127.0.0.1:${server.address().port}/?scenario=day`);await p.waitForFunction(()=>document.querySelector('#loading').hidden);await p.evaluate(()=>document.querySelector('#qa-panel').hidden=true);
  const phase=n=>p.waitForFunction(n=>document.querySelector('#journal').dataset.state===n,n);
  const emit=id=>p.evaluate(id=>{const at=new Date().toISOString();window.emitWorldEvent('encounter_completed',{encounterId:id,startTime:at,endTime:at,shipName:'小雨号',weather:'clear',timeOfDay:'day',firstTime:true,seenCount:1});},id);
  await emit('quiet_day');await emit('giant_whale_surface');await p.waitForTimeout(250);
  const notice=await p.locator('.journal-dock-label').evaluate(n=>({text:n.textContent,opacity:getComputedStyle(n).opacity}));await p.screenshot({path:'qa/journal-notice-closed.png'});
  await p.locator('#journal-open').click();await phase('opening');assert.equal(await p.locator('.journal-backdrop').evaluate(n=>getComputedStyle(n).backgroundColor),'rgba(0, 0, 0, 0)','backdrop stays transparent during opening too');await phase('open');
  const background=await p.locator('.journal-backdrop').evaluate(n=>({color:getComputedStyle(n).backgroundColor,image:getComputedStyle(n).backgroundImage}));await p.screenshot({path:'qa/journal-notice-open.png'});
  console.log({notice,background});assert.equal(background.color,'rgba(0, 0, 0, 0)','opening must not tint the transparent window');assert.equal(background.image,'none');assert.match(notice.text,/2.*新旅行日志/);assert.equal(notice.opacity,'1','unread notice must be visible without hover');assert.match(await p.locator('[data-chapter=voyage]').innerText(),/新日志.*2/s);
  await p.locator('[data-chapter=voyage]').click();await phase('open');
  const first=await p.evaluate(()=>JSON.parse(localStorage.getItem('tiny-tides-game-v1')).journalEntries[0].id);
  assert.ok(await p.locator('.book-spread>.journal-page [data-entry]').evaluateAll((nodes,id)=>nodes.some(n=>n.dataset.entry===id),first),'chapter must open earliest unread, not latest entry');
  assert.match(await p.locator('[data-chapter=voyage]').innerText(),/新日志.*1/s);
  await p.locator('[data-chapter=voyage]').click();await phase('open');await p.locator('.journal-backdrop').click({position:{x:5,y:5}});await phase('closed');
  assert.equal(await p.locator('#journal-unread').isVisible(),false);assert.equal(await p.locator('.journal-dock-label').innerText(),'航海日志');
  await emit('quiet_day');await p.setViewportSize({width:390,height:700});await p.waitForTimeout(300);const r=await p.locator('.journal-dock-label').boundingBox();assert.ok(r.x>=0&&r.x+r.width<=390&&r.y+r.height<=700);await p.screenshot({path:'qa/journal-notice-narrow.png'});
  await p.emulateMedia({reducedMotion:'reduce'});await p.locator('#journal-open').click();await phase('open');assert.equal(await p.locator('.journal-backdrop').evaluate(n=>getComputedStyle(n).backgroundColor),'rgba(0, 0, 0, 0)');await p.keyboard.press('Escape');await phase('closed');assert.deepEqual(errors,[]);console.log('transparent backdrop, visible unread tabs, first unread navigation, read clearing and narrow layout passed');
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
