const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs/promises');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1100,height:800}}),errors=[],html=await fs.readFile('qa-preview/index.html','utf8');
  page.on('pageerror',e=>errors.push(e.message));await page.route('http://127.0.0.1:4173/',route=>route.fulfill({contentType:'text/html',body:html}));
  await page.addInitScript(()=>{window.oceanTools={};Object.defineProperty(document,'modelContext',{value:{registerTool:tool=>window.oceanTools[tool.name]=tool}});});
  const state=()=>page.evaluate(()=>window.oceanTools.get_ocean_state.execute({}));
  async function open(){await page.goto('http://127.0.0.1:4173/');await page.waitForFunction(()=>document.querySelector('#loading').hidden);await page.locator('#scene').focus();await page.keyboard.press('Enter');await page.waitForTimeout(950);await page.locator('#tab-accessories').click();await page.locator('#accessory-slot').selectOption('charm');}
  await open();assert.equal(await page.locator('#gm-controls').count(),0);
  const dolphin=page.locator('[data-accessory="dolphin-charm"]');assert.equal(await dolphin.getAttribute('aria-disabled'),'true');await dolphin.click({force:true});assert.equal((await state()).shipCustomization.accessories.charm,null);assert.match(await page.locator('#ship-notice').textContent(),/海豚伴游/);
  await page.locator('[data-accessory="aurora-crystal"]').click();assert.equal((await state()).shipCustomization.accessories.charm,'aurora-crystal');
  await page.screenshot({path:'qa/accessory-rewards-locked.png'});
  // Isolated test save: the director's completion/GM/no-duplicate behavior is covered by encounters.test.mjs.
  await page.addInitScript(()=>{const key='tiny-tides-game-v1',save=JSON.parse(localStorage.getItem(key));save.ownedSouvenirs=['dolphin_charm'];localStorage.setItem(key,JSON.stringify(save));});
  await open();assert.equal(await dolphin.getAttribute('aria-disabled'),'false');await dolphin.click();assert.equal((await state()).shipCustomization.accessories.charm,'dolphin-charm');
  await page.reload();await page.waitForFunction(()=>document.querySelector('#loading').hidden);assert.equal((await state()).shipCustomization.accessories.charm,'dolphin-charm');assert.deepEqual(errors,[]);
  const result={checks:'GM absent / locked click gives source hint / default crystal free / owned dolphin equips and survives reload',errors};await fs.writeFile('qa/accessory-rewards-browser-results.json',JSON.stringify(result,null,2)+'\n');console.log(result);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
