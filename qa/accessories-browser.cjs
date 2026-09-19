const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true}),errors=[];
 try{
  const page=await browser.newPage({viewport:{width:1100,height:800},deviceScaleFactor:1});page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{window.oceanTools={};Object.defineProperty(document,'modelContext',{value:{registerTool:tool=>window.oceanTools[tool.name]=tool}});if(!localStorage.getItem('tiny-tides-game-debug-v1'))localStorage.setItem('tiny-tides-game-debug-v1',JSON.stringify({version:6,shipCustomization:{name:'晚风号',skinId:'classic',equippedBadge:'whale'},ownedBadges:[{badgeId:'whale'}],sailingData:{points:119,totalSailingSeconds:5000}}));});
  await page.goto('http://127.0.0.1:4173/?sailingDebug=fast');await page.waitForFunction(()=>document.querySelector('#loading').hidden);await page.locator('#edit').click();await page.locator('#pause').click();await page.locator('#scene').focus();await page.keyboard.press('Enter');await page.waitForTimeout(1100);
  const state=()=>page.evaluate(()=>window.oceanTools.get_ocean_state.execute({})),initial=await state(),resources=[];
  await page.locator('#tab-accessories').click();assert.equal(await page.locator('#accessory-slot option').count(),7);
  await page.locator('#tab-accessories').focus();await page.keyboard.press('Tab');assert.equal(await page.locator('#accessory-slot').evaluate(el=>el===document.activeElement),true);
  let selections=0;
  for(let round=0;round<2;round++){
   for(const slot of ['flag','deck','chimney','lifering','nameplate','charm','roof']){
    await page.locator('#accessory-slot').selectOption(slot);const ids=await page.locator('[data-accessory]').evaluateAll(buttons=>buttons.map(b=>b.dataset.accessory));
    for(const id of ids){await page.locator(`[data-accessory="${id}"]`).click();await page.waitForTimeout(90);const now=await state();assert.equal(now.shipCustomization.accessories[slot],id==='none'?null:id);assert.equal(now.sailingData.points,initial.sailingData.points);assert.equal(now.travelTime,initial.travelTime);selections++;}
   }
   await page.waitForTimeout(5100);resources.push((await state()).last);
  }
  assert.equal(resources[0].geometries,resources[1].geometries);assert.equal(resources[0].textures,resources[1].textures);assert.equal(resources[0].programs,resources[1].programs);
  const fitted={flag:'flag-red',deck:'lighthouse',chimney:'chimney-orange',lifering:'lifering',nameplate:'plate-wood',charm:'aurora-crystal',roof:'plant'};
  for(const [slot,id] of Object.entries(fitted)){await page.locator('#accessory-slot').selectOption(slot);await page.locator(`[data-accessory="${id}"]`).click();}
  await page.locator('#tab-skins').click();
  for(const id of ['classic','rounded','tall','light','wide','speedy','square','explorer','gentle']){await page.locator(`[data-skin="${id}"]`).click();assert.deepEqual((await state()).shipCustomization.accessories,fitted);await page.waitForTimeout(80);await page.screenshot({path:`qa/fittings-${id}.png`,clip:{x:0,y:0,width:1100,height:520}});}
  await page.locator('#tab-accessories').click();await page.locator('#accessory-slot').selectOption('charm');await page.screenshot({path:'qa/accessories-wide.png'});
  // Rotate the real scene to inspect the opposite hull side and all seven mounts.
  await page.mouse.move(550,240);await page.mouse.down();await page.mouse.move(850,280,{steps:24});await page.mouse.up();await page.waitForTimeout(1000);await page.screenshot({path:'qa/accessories-rotated.png'});
  for(const size of [{width:560,height:540},{width:390,height:700}]){await page.setViewportSize(size);await page.locator('#accessory-slot').selectOption('roof');await page.waitForTimeout(200);assert.equal(await page.locator('#ship-panel').evaluate(p=>p.scrollWidth<=p.clientWidth&&p.scrollHeight<=p.clientHeight),true);await page.screenshot({path:`qa/accessories-${size.width}.png`});}
  // New fourth tab participates in the same keyboard navigation as the original tabs.
  await page.locator('#tab-skins').focus();await page.keyboard.press('ArrowRight');assert.equal(await page.locator('#tab-accessories').getAttribute('aria-selected'),'true');await page.keyboard.press('ArrowLeft');assert.equal(await page.locator('#tab-skins').getAttribute('aria-selected'),'true');
  await page.locator('#journal-open').click();await page.waitForTimeout(1000);await page.keyboard.press('Escape');await page.waitForTimeout(850);assert.deepEqual((await state()).shipCustomization.accessories,fitted);
  await page.reload();await page.waitForFunction(()=>document.querySelector('#loading').hidden);const reloaded=await state();assert.deepEqual(reloaded.shipCustomization.accessories,fitted);assert.equal(reloaded.shipCustomization.name,'晚风号');assert.equal(reloaded.shipCustomization.equippedBadge,'whale');assert.deepEqual(errors,[]);
  const result={selections,checks:'all fittings selectable / 7 mounts / all9 skins retain choices / atomic save and reload / name and badge retained / no points spent / 560x540 and390x700 layout / keyboard tabs / journal / repeated GPU resource stability',resources,errors};await fs.writeFile('qa/accessories-browser-results.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
