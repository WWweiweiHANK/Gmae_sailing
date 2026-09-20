const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),http=require('node:http');
(async()=>{
 const html=await fs.readFile('qa-preview/index.html'),server=http.createServer((req,res)=>res.setHeader('Content-Type','text/html').end(html));await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1100,height:800}}),errors=[],results=[];
  page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>{window.oceanTools={};Object.defineProperty(document,'modelContext',{value:{registerTool:t=>window.oceanTools[t.name]=t}});});
  for(const scenario of ['day','storm','dusk','night','dawn']){
   await page.goto(`http://127.0.0.1:${server.address().port}/?scenario=${scenario}`);await page.waitForFunction(()=>document.querySelector('#loading').hidden);await page.locator('#qa-panel').evaluate(el=>el.hidden=true);
   await page.locator('#scene').focus();await page.keyboard.press('Enter');await page.waitForTimeout(1200);
   const state=await page.evaluate(()=>window.oceanTools.get_ocean_state.execute({}));results.push({scenario,lighting:state.shipLighting});
   assert.ok(state.shipLighting.point<=.22);if(scenario==='day'||scenario==='storm')assert.deepEqual(state.shipLighting,{point:0,lamp:0,windows:0});
   await page.screenshot({path:`qa/boat-lighting-${scenario}.png`});
  }
  assert.ok(results[2].lighting.point>results[4].lighting.point);assert.ok(results[3].lighting.point>results[2].lighting.point);assert.deepEqual(errors,[]);
  await fs.writeFile('qa/boat-lighting-results.json',JSON.stringify({results,errors},null,2)+'\n');console.log({results,errors});
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});
