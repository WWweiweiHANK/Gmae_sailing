const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const http=require('node:http');
(async()=>{
 const html=await fs.readFile('qa-preview/index.html'),server=http.createServer((req,res)=>res.setHeader('Content-Type','text/html; charset=utf-8').end(html));await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:560,height:540},deviceScaleFactor:1});
  await page.addInitScript(()=>{window.oceanTools={};Object.defineProperty(document,'modelContext',{value:{registerTool:tool=>window.oceanTools[tool.name]=tool}});});
  await page.goto(`http://127.0.0.1:${server.address().port}/?sailingDebug=fast`);await page.waitForFunction(()=>document.querySelector('#loading').hidden);await page.locator('#qa-panel').evaluate(el=>el.hidden=true);
  await page.locator('#scene').focus();await page.keyboard.press('Enter');await page.waitForTimeout(1200);
  await page.evaluate(()=>window.emitWorldEvent('encounter_completed',{encounterId:'pink_dolphin',startTime:'2026-09-20T09:00:00Z',endTime:'2026-09-20T09:00:30Z',shipName:'小雨号',weather:'clear',timeOfDay:'day',firstTime:true,seenCount:1}));
  const state=()=>page.evaluate(()=>window.oceanTools.get_ocean_state.execute({}));
  await page.waitForTimeout(11000);const baseline=(await state()).last;
  await page.locator('#journal-open').click();await page.waitForTimeout(1200);await page.waitForTimeout(11000);const opened=(await state()).last;
  assert.equal(opened.geometries,baseline.geometries);assert.equal(opened.textures,baseline.textures);assert.equal(opened.programs,baseline.programs);
  await page.emulateMedia({reducedMotion:'reduce'});const cdp=await page.context().newCDPSession(page);await cdp.send('HeapProfiler.collectGarbage');const memoryBefore=await cdp.send('Runtime.getHeapUsage');
  const domBefore=await page.locator('*').count();
  for(let i=0;i<30;i++){await page.keyboard.press('Escape');await page.waitForTimeout(130);await page.locator('#journal-open').click();await page.waitForTimeout(130);}
  await cdp.send('HeapProfiler.collectGarbage');const memoryAfter=await cdp.send('Runtime.getHeapUsage'),domAfter=await page.locator('*').count();assert.equal(domAfter,domBefore);assert.equal(await page.locator('.journal-page').count(),4);
  const gpu=await page.locator('#scene').evaluate(canvas=>{const gl=canvas.getContext('webgl2'),ext=gl.getExtension('WEBGL_debug_renderer_info');return ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):'unavailable';});
  const result={date:new Date().toISOString(),browser:await browser.version(),viewport:[560,540],gpu,baseline,opened,cycles:30,domBefore,domAfter,memoryBefore:memoryBefore.usedSize,memoryAfter:memoryAfter.usedSize,note:'Headless Edge, one five-second sample after each eleven-second settle. CPU measures Three.js submission, not GPU or CSS compositor time. 30 open/close cycles are a short regression check, not a long-duration desktop benchmark.'};
  await fs.writeFile('qa/journal-performance-results.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});
