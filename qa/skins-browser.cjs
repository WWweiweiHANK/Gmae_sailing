const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true}),errors=[];
 try{
  const page=await browser.newPage({viewport:{width:1100,height:800},deviceScaleFactor:1});page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{window.oceanTools={};Object.defineProperty(document,'modelContext',{value:{registerTool:tool=>window.oceanTools[tool.name]=tool}});if(!localStorage.getItem('tiny-tides-game-debug-v1'))localStorage.setItem('tiny-tides-game-debug-v1',JSON.stringify({version:5,shipCustomization:{name:'晚风号',hullColor:'#a9d5bd',equippedBadge:'whale'},ownedBadges:[{badgeId:'whale'}],ownedColors:['mint'],sailingData:{points:119,totalSailingSeconds:5000}}));});
  await page.goto('http://127.0.0.1:4173/?sailingDebug=fast');await page.waitForFunction(()=>document.querySelector('#loading').hidden);assert.equal(await page.locator('#error').isVisible(),false);
  await page.locator('#edit').click();await page.locator('#pause').click();await page.locator('#scene').focus();await page.keyboard.press('Enter');await page.waitForTimeout(1100);
  assert.equal(await page.locator('#tab-colors').count(),0);assert.equal(await page.locator('.skin-card').count(),9);
  const state=()=>page.evaluate(()=>window.oceanTools.get_ocean_state.execute({})),initial=await state(),resources=[];
  for(const id of ['classic','rounded','tall','light','wide','speedy','square','explorer','gentle']){
   await page.locator(`[data-skin="${id}"]`).click();await page.waitForTimeout(120);const now=await state();assert.equal(now.shipCustomization.skinId,id);assert.equal(now.shipCustomization.name,'晚风号');assert.equal(now.shipCustomization.equippedBadge,'whale');assert.equal(now.sailingData.points,initial.sailingData.points);assert.equal(now.travelTime,initial.travelTime);
   await page.screenshot({path:`qa/skin-${id}.png`,clip:{x:0,y:0,width:1100,height:520}});
  }
  await page.setViewportSize({width:560,height:540});await page.waitForTimeout(250);await page.screenshot({path:'qa/skins-desktop.png'});assert.equal(await page.locator('#ship-panel').evaluate(p=>p.scrollHeight<=p.clientHeight),true);
  await page.locator('#journal-open').click();await page.waitForTimeout(1150);assert.equal(await page.locator('#journal').isVisible(),true);await page.keyboard.press('Escape');await page.waitForTimeout(1000);assert.equal(await page.locator('[data-skin="gentle"]').getAttribute('aria-pressed'),'true');
  await page.locator('[data-skin="classic"]').click();await page.waitForTimeout(5200);resources.push((await state()).last);
  for(let i=0;i<5;i++)for(const id of ['classic','rounded','tall','light','wide','speedy','square','explorer','gentle']){await page.locator(`[data-skin="${id}"]`).click();await page.waitForTimeout(45);}
  await page.locator('[data-skin="classic"]').click();await page.waitForTimeout(5200);resources.push((await state()).last);assert.equal(resources[0].geometries,resources[1].geometries);assert.equal(resources[0].textures,resources[1].textures);assert.equal(resources[0].programs,resources[1].programs);
  await page.locator('[data-skin="gentle"]').click();await page.reload();await page.waitForFunction(()=>document.querySelector('#loading').hidden);assert.equal((await state()).shipCustomization.skinId,'gentle');assert.deepEqual(errors,[]);
  const result={checks:'nine skins / no color controls / name and badge preservation / no spending / journal return / 560x540 fit / 45 switches release resources / reload',resources,errors};await fs.writeFile('qa/skins-browser-results.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
