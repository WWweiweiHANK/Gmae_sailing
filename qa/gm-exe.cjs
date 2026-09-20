// Run only with the supplied EXE stopped. Uses a temporary WebView2 profile.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),{spawn}=require('node:child_process');
(async()=>{
 const profile=await fs.mkdtemp(path.join(os.tmpdir(),'tiny-tides-gm-')),exe=path.resolve(process.argv[2]??'src-tauri/target/release/tiny-tides-pet.exe');
 const child=spawn(exe,[],{windowsHide:true,env:{...process.env,WEBVIEW2_USER_DATA_FOLDER:profile,WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS:'--remote-debugging-port=9227'}});let browser,page;
 const errors=[],checks=[];child.on('error',error=>errors.push(error.message));
 try{
  for(let attempt=0;attempt<30;attempt++){try{browser=await chromium.connectOverCDP('http://127.0.0.1:9227');break;}catch{await new Promise(r=>setTimeout(r,1000));}}
  assert.ok(browser,'WebView2 debugging endpoint did not open');const context=browser.contexts()[0];page=context.pages()[0]??await context.waitForEvent('page');
  assert.ok((await fs.readdir(profile)).length,'temporary WebView2 profile must be used');
  page.on('pageerror',e=>errors.push(e.message));await context.addInitScript(()=>{window.journalTrace=[];for(const name of ['click','keydown'])document.addEventListener(name,e=>window.journalTrace.push({time:performance.now(),event:name,key:e.key,target:e.target.id||e.target.className,phase:document.querySelector('#journal')?.dataset.state}),true);window.oceanTools={};Object.defineProperty(document,'modelContext',{value:{registerTool:t=>window.oceanTools[t.name]=t}});});
  await page.reload();await page.waitForFunction(()=>document.querySelector('#loading').hidden);assert.equal(await page.locator('body').getAttribute('data-native'),'true');
  const state=()=>page.evaluate(()=>window.oceanTools.get_ocean_state.execute({})),save=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('tiny-tides-game-v1')));
  const action=id=>page.evaluate(id=>window.__TAURI_INTERNALS__.invoke('pet_action',{id}),id);
  assert.equal((await state()).boatSize,.75);assert.equal(await page.locator('#boat-size').count(),0);
  await page.evaluate(()=>localStorage.setItem('tiny-tides-boat-size-v1','1'));await page.reload();await page.waitForFunction(()=>document.querySelector('#loading').hidden);assert.equal((await state()).boatSize,.75);checks.push('native EXE, fixed 75%, no size UI, old 100% preference ignored');
  await action('edit');await page.waitForFunction(()=>document.body.dataset.editing==='true');assert.equal(await page.locator('#gm-trigger').isVisible(),true);assert.equal(await page.locator('#gm-event option').count(),11);
  await page.locator('#gm-event').selectOption('giant_whale_shadow');await page.locator('#gm-trigger').click();await action('lock');
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('tiny-tides-game-v1'))?.journalEntries.some(e=>e.encounterId==='giant_whale_shadow'),null,{timeout:85000});
  assert.equal(await page.locator('#journal-open').isVisible(),true);await page.screenshot({path:'qa/gm-exe-note.png'});checks.push('GM whale sighting completes into a real unread notebook');
  await page.locator('#journal-open').click();await page.waitForFunction(()=>document.querySelector('#journal').dataset.state==='open');await page.locator('[data-chapter=voyage]').click();await page.waitForFunction(()=>document.querySelector('#journal').dataset.state==='open');assert.equal(await page.locator('.left-page .intent-sentence,.right-page .intent-sentence').count(),3);await page.screenshot({path:'qa/gm-exe-journal.png'});
  await page.locator('.left-page [data-intent="follow_deep_creature"],.right-page [data-intent="follow_deep_creature"]').click();await page.waitForFunction(()=>document.querySelector('#journal').dataset.state==='writing');await page.keyboard.press('Escape');await page.waitForFunction(()=>document.querySelector('#journal').dataset.state==='closed');assert.equal((await save()).voyageIntentState.currentIntentId,'follow_deep_creature');
  await action('edit');await page.waitForFunction(()=>document.body.dataset.editing==='true');await page.locator('#gm-event').selectOption('giant_whale_surface');await page.locator('#gm-trigger').click();await action('lock');
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('tiny-tides-game-v1'))?.journalEntries.some(e=>e.encounterId==='giant_whale_surface'),null,{timeout:85000});
  const response=(await save()).journalEntries.find(e=>e.encounterId==='giant_whale_surface');assert.equal(response.respondedToIntentId,'follow_deep_creature');assert.match(response.body,/沿着它/);checks.push('EXE notebook choice saves, closes to sea, GM whale response remembers the choice');
  await page.locator('#journal-open').click();await page.waitForFunction(()=>document.querySelector('#journal').dataset.state==='open');await page.locator('[data-chapter=ship]').click();await page.waitForFunction(()=>document.querySelector('#journal').dataset.state==='open');await page.locator('#journal-next').click();await page.waitForFunction(()=>document.querySelector('#journal').dataset.state==='open');await page.locator('.left-page [data-skin="gentle"]').click();assert.equal((await state()).boatSize,.75);await page.keyboard.press('Escape');await page.waitForFunction(()=>document.querySelector('#journal').dataset.state==='closed');
  await page.reload();await page.waitForFunction(()=>document.querySelector('#loading').hidden);assert.equal((await save()).journalEntries.length,2);assert.equal((await state()).boatSize,.75);checks.push('skin change and reload keep 75% and both journal entries');
  assert.deepEqual(errors,[]);const result={date:new Date().toISOString(),exe,browser:await browser.version(),checks,errors,rendererCount:(await state()).rendererCount};await fs.writeFile('qa/gm-exe-results.json',JSON.stringify(result,null,2)+'\n');console.log(result);
 }catch(error){if(page)console.log('Native journal trace',await page.evaluate(()=>({trace:window.journalTrace,state:document.querySelector('#journal')?.dataset.state})).catch(()=>null));throw error;}finally{
  if(page)await page.evaluate(()=>window.__TAURI_INTERNALS__.invoke('pet_action',{id:'quit'})).catch(()=>{});
  await new Promise(r=>setTimeout(r,2500));if(child.exitCode===null)child.kill();if(browser)await browser.close().catch(()=>{});
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
