import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGameSave,GAME_SAVE_KEY} from './game-save.mjs';
import {createWorldEventBus} from './badges.mjs';
import {createEncounterDirector} from './encounter-director.mjs';
import {createShowcaseCamera} from './ship-showcase.mjs';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
let journalModule={};try{journalModule=await import('./journal/journal-store.mjs');}catch{}
function setup(){
 const disk=new Map(),storage={getItem:k=>disk.get(k)??null,setItem:(k,v)=>disk.set(k,v)},store=createGameSave(storage),bus=createWorldEventBus();
 assert.equal(typeof journalModule.createJournal,'function');
 const journal=journalModule.createJournal({store,bus});return {journal,store,bus,storage,disk};
}
const event=(id='pink_dolphin',count=1)=>({encounterId:id,startTime:`2026-09-19T10:${String(count).padStart(2,'0')}:00Z`,endTime:`2026-09-19T10:${String(count).padStart(2,'0')}:40Z`,shipName:'小雨号',weather:'clear',timeOfDay:'day',firstTime:count===1,seenCount:count,souvenirUnlocked:count===1,badgeUnlocked:false});
test('journal records completed sightings once, preserves the old name and survives other saves',()=>{
 const {journal:j,store,bus,storage}=setup(),e=event();
 bus.emitWorldEvent('encounter_seen',e);bus.emitWorldEvent('encounter_interrupted',e);assert.equal(j.entries().length,0);
 bus.emitWorldEvent('encounter_completed',e);bus.emitWorldEvent('encounter_completed',e);assert.equal(j.entries().length,1);
 store.save({shipCustomization:{...store.read().shipCustomization,name:'Aurora'}});
 const restored=journalModule.createJournal({store:createGameSave(storage),bus:createWorldEventBus()});
 assert.equal(restored.entries()[0].shipName,'小雨号');assert.match(restored.entries()[0].body,/小雨号/);assert.equal(restored.entries()[0].souvenirUnlocked,'pink_dolphin_charm');assert.equal(restored.unread(),1);
 bus.emitWorldEvent('encounter_completed',{...event('pink_dolphin',2),preview:true});assert.equal(j.entries().length,1);
});
test('whale story preserves the mystery and recurring visitors use different prose',()=>{
 const {journal:j,bus}=setup();
 for(const e of [event('giant_whale_shadow'),event('giant_whale_surface'),event(),event('pink_dolphin',2),event('pink_dolphin',3)])bus.emitWorldEvent('encounter_completed',e);
 const [shadow,surface,first,second,third]=j.entries();assert.doesNotMatch(shadow.body,/鲸/);assert.match(surface.body,/熟悉.*影子/s);assert.match(surface.body,/鲸/);assert.notEqual(first.body,second.body);assert.notEqual(second.body,third.body);
});
test('first opening starts at page one; later openings select first unread or latest spread',()=>{
 const {journal:j,bus}=setup();for(let i=1;i<=5;i++)bus.emitWorldEvent('encounter_completed',event('pink_dolphin',i));
 assert.equal(j.open(),0);assert.equal(j.unread(),0);assert.equal(j.open(),4);
 for(let i=6;i<=8;i++)bus.emitWorldEvent('encounter_completed',event('pink_dolphin',i));assert.equal(j.unread(),3);assert.equal(j.open(),4);assert.equal(j.unread(),0);
});
test('failed writes retain entries in memory, retry saves and damaged journal records are filtered',()=>{
 const {journal:j,bus,storage}=setup(),write=storage.setItem;storage.setItem=()=>{throw Error('full');};bus.emitWorldEvent('encounter_completed',event());assert.equal(j.entries().length,1);
 storage.setItem=write;j.save();assert.equal(createGameSave(storage).read().journalEntries.length,1);
 const old=JSON.parse(storage.getItem(GAME_SAVE_KEY));old.journalEntries.push(null,{id:'broken'},old.journalEntries[0]);storage.setItem(GAME_SAVE_KEY,JSON.stringify(old));assert.equal(createGameSave(storage).read().journalEntries.length,1);
});
test('version four upgrades without inventing past journals or losing sailing and discoveries',()=>{
 const {storage}=setup();storage.setItem(GAME_SAVE_KEY,JSON.stringify({version:4,shipCustomization:{name:'旧船'},sailingData:{points:42,totalSailingSeconds:300},encounterHistory:{pink_dolphin:{seenCount:3,completedCount:2}}}));const save=createGameSave(storage).read();assert.equal(save.sailingData.points,42);assert.equal(save.encounterHistory.pink_dolphin.seenCount,3);assert.deepEqual(save.journalEntries,[]);assert.equal(save.version,5);
});
test('malformed completion payloads cannot break the event bus or add a journal',()=>{
 const {journal:j,bus}=setup();for(const bad of [{...event(),encounterId:'toString'},{...event(),seenCount:NaN},{...event(),weather:'unknown'},{...event(),endTime:'bad'}])assert.doesNotThrow(()=>bus.emitWorldEvent('encounter_completed',bad));assert.equal(j.entries().length,0);
});
test('quiet entries come only from the director after long active quiet time, at most once per date',()=>{
 const {store,bus,journal:j}=setup();const d=createEncounterDirector({store,bus,random:()=>0,now:()=>new Date('2026-09-19T12:00:00Z'),shipName:()=> '小雨号',unlockBadge:()=>false});const env={period:'dusk',weather:'clear',rain:0,stormWarning:false,aurora:0};
 for(let i=0;i<200;i++)d.advance(30,env,false);assert.equal(j.entries().length,0);
 for(let i=0;i<200;i++)d.advance(30,env);const quiet=j.entries().filter(e=>e.encounterId==='quiet_day');assert.equal(quiet.length,1);assert.ok(d.snapshot().encounterDirectorState.time>=2700);
 for(let i=0;i<200;i++)d.advance(30,env);assert.equal(j.entries().filter(e=>e.encounterId==='quiet_day').length,1);
});
test('journal camera keeps following the actual ship at left and restores showcase framing',()=>{
 const camera=new THREE.PerspectiveCamera(36,1.6,.1,150),controls=new OrbitControls(camera,null),ship=new THREE.Group();camera.position.set(13,16,18);controls.update();const view=createShowcaseCamera(camera,controls);
 view.update(ship,.5,.4,-.1,1,0);const original=camera.position.clone();view.update(ship,.5,.4,-.1,1,1);camera.updateMatrixWorld();const point=ship.position.clone().add(new THREE.Vector3(0,1,0)).project(camera);assert.ok(point.x<-.4);assert.ok(point.x>-.95);
 const before=camera.position.clone();ship.position.x+=1;view.update(ship,.5,.4,-.1,1,1);assert.ok(Math.abs(camera.position.x-before.x-1)<1e-9);ship.position.x-=1;view.update(ship,.5,.4,-.1,1,0);assert.ok(camera.position.distanceTo(original)<1e-9);
});
