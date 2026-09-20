import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGameSave,GAME_SAVE_KEY} from './game-save.mjs';
import {createJournal} from './journal/journal-store.mjs';
import {createWorldEventBus} from './badges.mjs';
import {createEncounterDirector} from './encounter-director.mjs';
import {encounterCatalog} from './encounter-catalog.mjs';
import * as module from './voyage-intents.mjs';
const event=(id,count=1)=>({encounterId:id,startTime:`2026-09-20T10:${String(count).padStart(2,'0')}:00Z`,endTime:`2026-09-20T10:${String(count).padStart(2,'0')}:40Z`,shipName:'小雨号',weather:'clear',timeOfDay:'day',firstTime:count===1,seenCount:count});
function setup(){let seconds=0;const disk=new Map(),storage={getItem:k=>disk.get(k)??null,setItem:(k,v)=>disk.set(k,v)},store=createGameSave(storage),bus=createWorldEventBus();assert.equal(typeof module.createVoyageIntentManager,'function');const intents=module.createVoyageIntentManager({store,total:()=>seconds,random:()=>0}),journal=createJournal({store,bus,intents});return {store,bus,intents,journal,storage,advance:n=>seconds+=n};}
test('GM staged events complete through the real journal pipeline; interrupted staging writes no record',()=>{
 const {store,bus,intents,journal}=setup();let at=0;
 const d=createEncounterDirector({store,bus,intents,shipName:()=> '小雨号',random:()=>.5,now:()=>new Date(1790000000000+at++*1000)}),env={period:'day',weather:'clear',rain:0};
 for(const id of ['giant_whale_surface',...encounterCatalog.filter(e=>e.id!=='giant_whale_surface').map(e=>e.id)]){
  const before=journal.entries().length;assert.equal(d.stageEncounter(id,env),'started');assert.equal(journal.entries().length,before);
  d.confirmVisible(id);d.advance(30,env);d.advance(30,env);assert.equal(journal.entries().at(-1).encounterId,id);
 }
 const count=journal.entries().length;assert.equal(count,encounterCatalog.length);
 d.stageEncounter('giant_whale_shadow',env);d.confirmVisible('giant_whale_shadow');d.stageEncounter('pink_dolphin',env);assert.equal(journal.entries().length,count);
 d.confirmVisible('pink_dolphin');d.endEncounter('pink_dolphin',true);assert.equal(journal.entries().length,count);
});
test('clues only, atomic permanent choice, overrides and old-save migration',()=>{
 const {bus,journal:j,intents,store,storage}=setup();
 for(const e of [event('dolphin_companion'),event('pink_dolphin'),event('pink_dolphin',2),event('giant_whale_shadow')])bus.emitWorldEvent('encounter_completed',e);
 const entries=j.entries();assert.equal(module.intentOptions(entries[0]).length,0);assert.equal(module.intentOptions(entries[1]).length,0);assert.equal(module.intentOptions(entries[2]).length,2);
 const id=entries[3].id;assert.equal(j.selectIntent(id,'follow_deep_creature'),'selected');assert.equal(j.selectIntent(id,'free_sailing'),'already-selected');assert.equal(intents.snapshot().currentIntentId,'follow_deep_creature');assert.ok(intents.modifiers().giant_whale_surface>1);
 const saved=createGameSave(storage).read();assert.equal(saved.journalEntries[3].selectedIntentText,'沿着那个影子离开的方向继续航行。');assert.equal(saved.version,9);
 assert.equal(j.selectIntent(entries[2].id,'follow_pink_visitor'),'selected');assert.equal(store.read().voyageIntentHistory.at(-1).endedReason,'replaced');
 storage.setItem(GAME_SAVE_KEY,JSON.stringify({...saved,version:8,voyageIntentState:undefined}));assert.equal(createGameSave(storage).read().voyageIntentState.currentIntentId,'free_sailing');
});
test('failed choice saves nothing, duration uses active seconds only and fades to default',()=>{
 const {bus,journal:j,intents,storage,advance}=setup();bus.emitWorldEvent('encounter_completed',event('giant_whale_shadow'));const id=j.entries()[0].id,write=storage.setItem;
 storage.setItem=()=>{throw Error('full');};assert.equal(j.selectIntent(id,'follow_deep_creature'),'save-failed');assert.equal(j.entries()[0].selectedIntentId,null);assert.equal(intents.snapshot().currentIntentId,'free_sailing');storage.setItem=write;
 j.selectIntent(id,'follow_deep_creature');const duration=intents.snapshot().targetDurationSeconds;assert.equal(intents.snapshot().activeElapsedSeconds,0);
 advance(duration-60);assert.ok(intents.modifiers().giant_whale_surface>1&&intents.modifiers().giant_whale_surface<2.5);
 intents.save();const resumed=module.createVoyageIntentManager({store:createGameSave(storage),total:()=>999999});assert.equal(resumed.snapshot().activeElapsedSeconds,duration-60);
 advance(61);assert.equal(intents.snapshot().currentIntentId,'free_sailing');assert.deepEqual(intents.modifiers(),{});
});
test('director preserves prerequisites, no forced spawn, response records source and free sailing still has a story',()=>{
 for(const selected of ['follow_deep_creature','free_sailing']){
  const {bus,journal:j,intents,store}=setup();const d=createEncounterDirector({store,bus,intents,shipName:()=> '小雨号',random:()=>.5}),env={period:'day',weather:'clear',rain:0};
  assert.equal(d.startEncounter('giant_whale_surface',env,{ignoreTiming:true}),'prerequisite');
  d.startEncounter('giant_whale_shadow',env,{ignoreTiming:true});d.confirmVisible('giant_whale_shadow');d.endEncounter('giant_whale_shadow');
  const source=j.entries()[0];j.selectIntent(source.id,selected);assert.equal(d.active().length,0);assert.equal(d.startEncounter('giant_whale_surface',{...env,weather:'storm'},{ignoreTiming:true}),'conditions');
  d.startEncounter('giant_whale_surface',env,{ignoreTiming:true});d.confirmVisible('giant_whale_surface');d.endEncounter('giant_whale_surface');
  const response=j.entries().at(-1);assert.equal(response.respondedToIntentId,selected);assert.equal(response.respondedToJournalEntryId,source.id);assert.match(response.body,selected==='free_sailing'?/没有追逐/:/沿着它/);assert.equal(intents.snapshot().currentIntentId,'free_sailing');
 }
});
test('latest unread entry and optional deferred choice; GM and interrupted sightings cannot respond',()=>{
 const {bus,journal:j,intents}=setup();bus.emitWorldEvent('encounter_completed',event('giant_whale_shadow'));bus.emitWorldEvent('encounter_completed',event('dolphin_companion',2));bus.emitWorldEvent('encounter_completed',event('meteor_shower',3));
 assert.equal(j.open({latest:true}),2);assert.equal(j.unread(),3);j.markRead(2,true);assert.equal(j.unread(),2);assert.equal(j.entries()[2].selectedIntentId,null);
 j.selectIntent(j.entries()[0].id,'follow_deep_creature');assert.deepEqual(intents.respond({...event('giant_whale_surface'),preview:true}),{});assert.deepEqual(intents.respond({...event('giant_whale_surface'),interrupted:true}),{});assert.equal(intents.snapshot().currentIntentId,'follow_deep_creature');
});
test('the same natural lottery changes with intent weights, without changing schedule eligibility',()=>{
 const selected=[];
 for(const intent of ['free_sailing','follow_light']){
  const {store,bus,intents}=setup();intents.setIntent(intent,{},true);
  store.save({encounterDirectorState:{next:{ambient:99999,special:0,wonder:99999}}});
  const d=createEncounterDirector({store,bus,intents,shipName:()=> '小雨号',random:()=>.32});
  d.advance(1,{period:'night',night:1,weather:'clear',rain:0});selected.push(d.active()[0]?.id);
 }
 assert.deepEqual(selected,['giant_whale_shadow','fog_lighthouse']);
});
