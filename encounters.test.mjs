import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGameSave,GAME_SAVE_KEY} from './game-save.mjs';
import {createWorldEventBus} from './badges.mjs';
let module={};try{module=await import('./encounter-director.mjs');}catch{}
const day={period:'day',weather:'clear',night:0,rain:0,shade:0,auroraDueIn:Infinity,aurora:0};
function setup(storage){const disk=new Map();storage??={getItem:k=>disk.get(k)??null,setItem:(k,v)=>disk.set(k,v)};const store=createGameSave(storage),bus=createWorldEventBus(),events=[];bus.subscribe((type,data)=>events.push({type,...data}));assert.equal(typeof module.createEncounterDirector,'function');const director=module.createEncounterDirector({store,bus,random:()=>.3,now:()=>new Date('2026-09-19T12:00:00Z'),shipName:()=> '晚风号',unlockBadge:()=> 'unlocked'});return {director,store,storage,events};}
test('director enforces environment, chain, slots and quiet spacing even on manual start',()=>{
 const {director:d}=setup();assert.equal(d.startEncounter('meteor_shower',day),'conditions');assert.equal(d.startEncounter('massive_bird_migration',{...day,weather:'storm'}),'conditions');assert.equal(d.startEncounter('giant_whale_surface',day),'prerequisite');
 assert.equal(d.startEncounter('giant_whale_shadow',day),'started');assert.equal(d.startEncounter('pink_dolphin',day),'slot');assert.equal(d.startEncounter('underwater_fish_school',day),'started');assert.equal(d.active().length,2);
 d.confirmVisible('giant_whale_shadow');d.endEncounter('giant_whale_shadow');assert.equal(d.startEncounter('polar_bear_ice',day),'quiet');
});
test('actual visible encounter saves discovery once and completion provides future log data',()=>{
 const {director:d,store,events,storage}=setup();d.startEncounter('giant_whale_shadow',day);assert.deepEqual(store.read().encounterHistory,{});
 d.confirmVisible('giant_whale_shadow');d.confirmVisible('giant_whale_shadow');assert.equal(store.read().encounterHistory.giant_whale_shadow.seenCount,1);d.endEncounter('giant_whale_shadow');
 const completed=events.find(e=>e.type==='encounter_completed');assert.equal(completed.shipName,'晚风号');assert.equal(completed.firstTime,true);assert.equal(completed.seenCount,1);assert.equal(completed.weather,'clear');assert.ok(completed.startTime);assert.ok(completed.endTime);
 assert.equal(createGameSave(storage).read().encounterHistory.giant_whale_shadow.completedCount,1);assert.deepEqual(setup(storage).director.active(),[]);
});
test('hidden/paused director consumes no world time, windows or encounters',()=>{
 const {director:d}=setup();d.startEncounter('dolphin_companion',day);d.advance(4,day,true);const before=d.snapshot();d.advance(10800,day,false);assert.deepEqual(d.snapshot(),before);d.advance(1,day,true);assert.equal(d.active()[0].elapsed,5);
});
test('storm and aurora interrupt incompatible major encounters with a short exit, not a completion reward',()=>{
 const {director:d,store}=setup();d.startEncounter('giant_whale_shadow',day);d.confirmVisible('giant_whale_shadow');d.advance(1,{...day,weather:'storm'},true);assert.equal(d.active()[0].phase,'exit');d.advance(4,{...day,weather:'storm'},true);assert.equal(d.active().length,0);assert.equal(store.read().encounterHistory.giant_whale_shadow.completedCount,0);
 const {director:n}=setup();const night={...day,period:'night',night:1};assert.equal(n.startEncounter('meteor_shower',{...night,aurora:1}),'conditions');assert.equal(n.startEncounter('bioluminescent_sea',night),'started');assert.equal(n.startEncounter('meteor_shower',night),'slot');
});
test('automatic schedule has quiet windows, avoids immediate repeats and keeps long wonder cooldowns',()=>{
 const {director:d}=setup(),starts=[];for(let t=0;t<10000;t++){d.advance(1,day,true);for(const a of d.active()){d.confirmVisible(a.id);if(a.elapsed===0)starts.push({id:a.id,time:t});}}
 assert.ok(starts.length>3);assert.ok(starts.length<35);for(let i=1;i<starts.length;i++)assert.notEqual(starts[i].id,starts[i-1].id);assert.ok(starts[0].time>=45);assert.ok(starts.some((s,i)=>i&&s.time-starts[i-1].time>300));
});
test('souvenirs unlock once and old saves retain all existing progression',()=>{
 const {director:d,store,storage}=setup();assert.equal(d.unlockSouvenir('not_real'),false);assert.equal(d.unlockSouvenir('pink_dolphin_charm'),true);assert.equal(d.unlockSouvenir('pink_dolphin_charm'),false);assert.deepEqual(store.read().ownedSouvenirs,['pink_dolphin_charm']);
 storage.setItem(GAME_SAVE_KEY,JSON.stringify({version:3,shipCustomization:{name:'晚风号',hullColor:'#eddb9b'},sailingData:{points:85,totalSailingSeconds:500},ownedColors:['yellow']}));const migrated=createGameSave(storage).read();assert.equal(migrated.version,5);assert.equal(migrated.sailingData.points,85);assert.equal(migrated.shipCustomization.name,'晚风号');assert.deepEqual(migrated.encounterHistory,{});
});
test('all ten visual handlers reuse their objects and return to a quiet scene after cleanup',async()=>{
 const THREE=await import('three'),{createVoyageEffects}=await import('./scene-effects.mjs');let visuals={};try{visuals=await import('./encounter-visuals.mjs');}catch{}assert.equal(typeof visuals.createEncounterVisuals,'function');
 const scene=new THREE.Scene(),ship=new THREE.Group();scene.add(ship);const effects=createVoyageEffects(scene),visual=visuals.createEncounterVisuals({scene,ship,dolphinPod:effects.dolphinPod,waterTime:{value:0},waterRain:{value:0},waveStrength:{value:1}});
 const count=()=>{let n=0;scene.traverse(()=>n++);return n;},baseline=count();
 const ids=['underwater_fish_school','dolphin_companion','pink_dolphin','giant_whale_shadow','giant_whale_surface','massive_bird_migration','bioluminescent_sea','meteor_shower','polar_bear_ice','fog_lighthouse'];
 for(let cycle=0;cycle<3;cycle++)for(const id of ids){const a={id,elapsed:15,duration:40,phase:'play',seed:.3};let seen=false;for(let t=1;t<=30;t++){a.elapsed=t;visual.update([a],t,()=>0);seen ||= visual.visibleIds().includes(id);}assert.ok(seen,id+' must become visible');visual.update([],16,()=>0);assert.deepEqual(visual.visibleIds(),[]);assert.equal(visual.bio.value,0);assert.equal(count(),baseline);}
});

test('discovery waits for entry and surfacing; luminous fish have reusable contact trails',async()=>{
 const THREE=await import('three'),{createVoyageEffects}=await import('./scene-effects.mjs'),{createEncounterVisuals}=await import('./encounter-visuals.mjs');
 const scene=new THREE.Scene(),ship=new THREE.Group(),effects=createVoyageEffects(scene),v=createEncounterVisuals({scene,ship,dolphinPod:effects.dolphinPod,waterTime:{value:0},waterRain:{value:0},waveStrength:{value:1}});
 for(const id of ['giant_whale_surface','massive_bird_migration']){v.update([{id,elapsed:2,duration:40,phase:'enter'}],2,()=>0);assert.deepEqual(v.visibleIds(),[]);v.update([{id,elapsed:20,duration:40,phase:'play'}],20,()=>0);assert.deepEqual(v.visibleIds(),[id]);}
 v.update([{id:'bioluminescent_sea',elapsed:20,duration:50,phase:'play'}],20,()=>0);
 const trails=scene.getObjectByName('fish-contact-trails');assert.ok(trails?.isInstancedMesh);assert.equal(trails.count,48);assert.equal(trails.visible,true);
 v.update([{id:'underwater_fish_school',elapsed:20,duration:32,phase:'play'}],21,()=>0);assert.equal(trails.visible,false);
});

test('world timing is frame-rate independent and completed whale prerequisites survive reload',()=>{
 for(const fps of [20,30,60]){const {director:d}=setup();d.startEncounter('underwater_fish_school',day);for(let i=0;i<fps*10;i++)d.advance(1/fps,day);assert.ok(Math.abs(d.active()[0].elapsed-10)<1e-8);}
 const {director:d,storage}=setup();d.startEncounter('giant_whale_shadow',day);d.confirmVisible('giant_whale_shadow');d.endEncounter('giant_whale_shadow');
 const restored=setup(storage).director;assert.equal(restored.startEncounter('giant_whale_surface',day),'quiet');assert.equal(restored.startEncounter('giant_whale_surface',day,{ignoreTiming:true}),'started');assert.equal(restored.snapshot().encounterHistory.giant_whale_shadow.completedCount,1);
});

test('inactive meteor segments never travel outside the miniature sky',async()=>{
 const THREE=await import('three'),{createVoyageEffects}=await import('./scene-effects.mjs'),{createEncounterVisuals}=await import('./encounter-visuals.mjs');
 const scene=new THREE.Scene(),v=createEncounterVisuals({scene,ship:new THREE.Group(),dolphinPod:createVoyageEffects(scene).dolphinPod,waterTime:{value:0},waterRain:{value:0},waveStrength:{value:1}});
 for(let t=1;t<=40;t++){v.update([{id:'meteor_shower',elapsed:t,duration:40,phase:'play'}],t,()=>0);const p=scene.getObjectByName('meteor_shower').children[0].geometry.attributes.position;for(let i=0;i<p.count;i++){assert.ok(Math.abs(p.getX(i))<5.8);assert.ok(p.getY(i)>3&&p.getY(i)<6.3);assert.ok(Math.abs(p.getZ(i))<4.45);}}
});

test('accelerating development also shortens previously scheduled cooldowns and quiet periods',async()=>{
 const {ENCOUNTER_PACING}=await import('./encounter-catalog.mjs'),{director:d}=setup();
 d.startEncounter('giant_whale_shadow',day);d.confirmVisible('giant_whale_shadow');d.endEncounter('giant_whale_shadow');d.startEncounter('giant_whale_surface',day,{ignoreTiming:true});d.endEncounter('giant_whale_surface');
 d.setPacing({...ENCOUNTER_PACING,windows:{ambient:[10,20],special:[20,40],wonder:[40,60]},quietAfterMajor:[5,8],wonderGap:45,cooldownScale:.01});const s=d.snapshot().encounterDirectorState;
 assert.ok(s.wonderUntil-s.time<=45);assert.ok(s.quietUntil-s.time<=8);assert.ok(s.cooldowns.giant_whale_surface-s.time<=72);
});

test('GM preview replaces active events, ignores conditions and never changes progression',()=>{
 const {director:d,store,events}=setup();assert.equal(typeof d.previewEncounter,'function');
 assert.equal(d.startEncounter('underwater_fish_school',day),'started');
 assert.equal(d.previewEncounter('meteor_shower',day),'started');assert.deepEqual(d.active().map(a=>a.id),['meteor_shower']);
 d.confirmVisible('meteor_shower');d.endEncounter('meteor_shower');
 assert.deepEqual(store.read().encounterHistory,{});assert.deepEqual(store.read().ownedSouvenirs,[]);assert.equal(events.some(e=>e.type==='encounter_completed'),false);
 assert.equal(d.previewEncounter('not-real',day),'invalid');
});
