const {chromium}=require('playwright'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url'),path=require('node:path'),fs=require('node:fs/promises');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const source=pathToFileURL(path.resolve('template.html'));source.search='?entryCheck=1';source.hash='boat';
  await page.goto(source.href);
  await page.waitForURL(url=>url.pathname.endsWith('/preview/index.html'),{timeout:3000});
  assert.equal(new URL(page.url()).search,'?entryCheck=1');assert.equal(new URL(page.url()).hash,'#boat');
  await page.waitForFunction(()=>document.querySelector('#loading')?.hidden);
  await page.locator('#scene').focus();await page.keyboard.press('Enter');
  assert.deepEqual(await page.locator('.ship-tabs [role=tab]').allTextContents(),['船体','装饰']);
  assert.equal(await page.locator('#error').isVisible(),false);
  for(const dir of ['preview','desktop-dist','qa-preview']){
   const html=await fs.readFile(dir+'/index.html','utf8');
   assert.ok(!html.includes('id="template-entry"'),dir+' must not redirect');
   assert.ok(!html.includes('/* SCENE_BUNDLE */'),dir+' must contain the game bundle');
  }
  assert.deepEqual(errors,[]);console.log('PASS: double-click template → current bundled preview; query/hash, scene and ship UI work; all three builds contain no redirect.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
