import {test} from 'node:test';
import assert from 'node:assert/strict';
let sailing={},save={};
try{sailing=await import('./sailing.mjs');}catch{}
try{save=await import('./game-save.mjs');}catch{}
function meter(options){assert.equal(typeof sailing.createSailing,'function');return sailing.createSailing(options);}
const tick=(m,seconds,active=true)=>m.tick(seconds*1000,active,seconds*1000);
function advance(m,from,to,step=1){for(let t=from+step;t<to;t+=step)tick(m,t);tick(m,to);}
function storage(){const entries=new Map();return {getItem:key=>entries.get(key)??null,setItem:(key,value)=>entries.set(key,value)};}

test('154 sailing seconds give two points and retain 34 seconds; reloading adds no offline time',()=>{
 const m=meter();tick(m,0);advance(m,0,154,5);
 assert.deepEqual(m.snapshot(),{points:2,accumulatedSeconds:34,totalSailingSeconds:154});
 const loaded=meter({initial:m.snapshot()});tick(loaded,36000);assert.deepEqual(loaded.snapshot(),m.snapshot());advance(loaded,36000,36026);
 assert.deepEqual(loaded.snapshot(),{points:3,accumulatedSeconds:0,totalSailingSeconds:180});
});
test('20, 30 and 60 FPS produce the same points and remainder',()=>{
 for(const fps of [20,30,60]){const m=meter();tick(m,0);for(let i=1;i<=fps*154;i++)tick(m,i/fps);
  assert.equal(m.snapshot().points,2);assert.ok(Math.abs(m.snapshot().accumulatedSeconds-34)<1e-7);assert.ok(Math.abs(m.snapshot().totalSailingSeconds-154)<1e-7);}
});
test('60 then 90 seconds, reload, and 30 more seconds give exactly two points',()=>{
 const m=meter();tick(m,0);advance(m,0,60);assert.deepEqual(m.snapshot(),{points:1,accumulatedSeconds:0,totalSailingSeconds:60});
 advance(m,60,90);assert.deepEqual(m.snapshot(),{points:1,accumulatedSeconds:30,totalSailingSeconds:90});
 const restarted=meter({initial:m.snapshot()});tick(restarted,9000);advance(restarted,9000,9030);
 assert.deepEqual(restarted.snapshot(),{points:2,accumulatedSeconds:0,totalSailingSeconds:120});
});
test('showcase, hiding and pause stop accounting at the event and resume without catch-up',()=>{
 const m=meter();tick(m,0);tick(m,10,false);tick(m,130,false);tick(m,250,true);tick(m,255);
 assert.deepEqual(m.snapshot(),{points:0,accumulatedSeconds:15,totalSailingSeconds:15});
 for(let i=0;i<20;i++){tick(m,255,false);tick(m,255,true);}assert.equal(m.snapshot().totalSailingSeconds,15);
});
test('five-second stalls count, sleep/freeze and wall-clock jumps do not',()=>{
 const m=meter();tick(m,0);tick(m,5);tick(m,7205);tick(m,7210);
 m.tick(7211000,true,14411000);m.tick(7216000,true,14416000);
 m.tick(7215000,true,14415000);m.tick(7220000,true,14420000);
 assert.equal(m.snapshot().totalSailingSeconds,20);
});
test('spending checks positive safe integers, refuses overdrafts and never reduces history',()=>{
 const m=meter();tick(m,0);advance(m,0,125);
 for(const bad of [-1,0,.5,NaN,Infinity,'1',Number.MAX_SAFE_INTEGER+1]){
  assert.equal(m.canAffordSailingPoints(bad),false);assert.equal(m.spendSailingPoints(bad),false);assert.equal(m.addSailingPoints(bad),false);
 }
 assert.equal(m.spendSailingPoints(3),false);assert.equal(m.canAffordSailingPoints(2),true);assert.equal(m.spendSailingPoints(2),true);
 assert.deepEqual(m.snapshot(),{points:0,accumulatedSeconds:5,totalSailingSeconds:125});
 assert.equal(m.addSailingPoints(2),true);assert.equal(m.snapshot().totalSailingSeconds,125);
 const copy=m.snapshot();copy.points=-100;assert.equal(m.snapshot().points,2);
});
test('saves happen periodically, on integer changes and on flush, never on each frame',()=>{
 const saved=[];const m=meter({onSave:data=>{saved.push(data);return true;}});tick(m,0);
 for(let i=1;i<=24*60;i++)tick(m,i/60);assert.equal(saved.length,0);
 tick(m,25);assert.equal(saved.length,1);assert.ok(Math.abs(saved[0].totalSailingSeconds-25)<1e-7);
 advance(m,25,60);assert.equal(saved.at(-1).points,1);assert.equal(saved.length,3);
 tick(m,65,false);assert.ok(Math.abs(saved.at(-1).accumulatedSeconds-5)<1e-7);
 tick(m,200,false);m.flush();assert.ok(Math.abs(saved.at(-1).totalSailingSeconds-65)<1e-7);
});
test('unified save migrates the old ship, keeps remainder and never loses appearance on point saves',()=>{
 assert.equal(typeof save.createGameSave,'function');const disk=storage();
 disk.setItem('tiny-tides-ship-v1',JSON.stringify({name:'晚风号',hullColor:'#a9d5bd',equippedBadge:'whale'}));
 const store=save.createGameSave(disk);assert.equal(store.read().shipCustomization.name,'晚风号');
 assert.deepEqual(store.read().sailingData,{points:0,accumulatedSeconds:0,totalSailingSeconds:0});
 store.save({sailingData:{points:1,accumulatedSeconds:30,totalSailingSeconds:90}});
 const reloaded=save.createGameSave(disk);assert.equal(reloaded.read().sailingData.accumulatedSeconds,30);assert.equal(reloaded.read().shipCustomization.hullColor,'#a9d5bd');
 reloaded.save({shipCustomization:{...reloaded.read().shipCustomization,name:'远山号'}});assert.equal(save.createGameSave(disk).read().sailingData.points,1);
 assert.ok(disk.getItem('tiny-tides-ship-v1'));assert.equal(JSON.parse(disk.getItem('tiny-tides-game-v1')).version,6);
});
test('invalid save numbers are rejected; storage failures and newer versions are not silently overwritten',()=>{
 assert.equal(typeof save.createGameSave,'function');const disk=storage();
 disk.setItem('tiny-tides-game-v1',JSON.stringify({version:1,sailingData:{points:-2,accumulatedSeconds:75,totalSailingSeconds:'900'}}));
 assert.deepEqual(save.createGameSave(disk).read().sailingData,{points:0,accumulatedSeconds:0,totalSailingSeconds:0});
 const newer=JSON.stringify({version:99,valuable:'untouched'});disk.setItem('tiny-tides-game-v1',newer);
 const notices=[];const future=save.createGameSave(disk,{onError:message=>notices.push(message)});assert.equal(future.save({}),false);assert.equal(disk.getItem('tiny-tides-game-v1'),newer);assert.ok(notices.length);
 const unavailable=save.createGameSave({getItem(){throw Error('denied');},setItem(){throw Error('full');}});assert.equal(unavailable.save({}),false);
});
test('production ignores fast debug; isolated debug earns one point at five seconds',()=>{
 assert.equal(typeof sailing.sailingConfig,'function');const normal=meter({config:sailing.sailingConfig(false,true)});tick(normal,0);tick(normal,5);assert.equal(normal.snapshot().points,0);
 const fast=meter({config:sailing.sailingConfig(true,true)});tick(fast,0);tick(fast,5);assert.equal(fast.snapshot().points,1);
});
test('failed saves keep progress and retry at the next interval rather than every frame',()=>{
 let attempts=0;const m=meter({onSave:()=>++attempts>1});tick(m,0);advance(m,0,25);assert.equal(attempts,1);
 advance(m,25,49,1/60);assert.equal(attempts,1);tick(m,50);assert.equal(attempts,2);
 assert.ok(Math.abs(m.snapshot().totalSailingSeconds-50)<1e-7);
});
