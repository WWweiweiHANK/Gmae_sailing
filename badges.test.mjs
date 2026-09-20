import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGameSave,GAME_SAVE_KEY} from './game-save.mjs';
import {createBadges,createWorldEventBus,createVisualEventTracker,badgeCatalog} from './badges.mjs';
function setup(){const data=new Map(),storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)},store=createGameSave(storage),bus=createWorldEventBus();let total=0;const customization={data:store.read().shipCustomization,update(p){Object.assign(this.data,p);}};const badges=createBadges({store,customization,bus,total:()=>total,config:{first_voyage:10,old_sailor:100,starry_night:5}});return {store,storage,bus,badges,customization,setTotal:v=>total=v};}
test('new save owns no badges; hidden views expose no names, icons or conditions',()=>{
 const {badges,store}=setup();assert.equal(badgeCatalog.length,10);assert.deepEqual(store.read().ownedBadges,[]);assert.equal(store.read().shipCustomization.equippedBadge,null);
 const hidden=badges.views().find(b=>b.id==='aurora_night');assert.equal(hidden.name,'???');assert.equal(hidden.description,'尚未发现');assert.equal(hidden.icon,null);assert.equal(hidden.progress,undefined);
 assert.equal(badges.equip('aurora_night'),'locked');assert.equal(badges.unlockBadge('fake'),'invalid');
});
test('visible event unlocks once, preserving date/source; equip, clear NEW and reload cost no points',()=>{
 const {store,bus,badges,storage,customization}=setup();store.save({sailingData:{points:88,totalSailingSeconds:200}});
 bus.emitWorldEvent('aurora_started',{sourceEventId:'night-7'});const first=store.read().ownedBadges[0];bus.emitWorldEvent('aurora_started',{sourceEventId:'night-8'});
 assert.deepEqual(store.read().ownedBadges,[first]);assert.equal(first.sourceEventId,'night-7');assert.ok(Number.isFinite(Date.parse(first.unlockedAt)));
 assert.equal(badges.equip('aurora_night'),'equipped');assert.equal(customization.data.equippedBadge,'aurora_night');badges.markSeen(['aurora_night']);
 const restored=createGameSave(storage).read();assert.equal(restored.shipCustomization.equippedBadge,'aurora_night');assert.equal(restored.sailingData.points,88);assert.deepEqual(restored.seenBadgeNotifications,['aurora_night']);
 assert.equal(badges.equip(null),'equipped');assert.equal(createGameSave(storage).read().shipCustomization.equippedBadge,null);
});
test('milestones use accumulated sailing time; paused time adds no night progress; night progress reloads',()=>{
 const {badges,store,setTotal}=setup();setTotal(9);badges.advance(false);assert.equal(store.read().ownedBadges.length,0);
 setTotal(10);badges.advance(true);assert.ok(store.read().ownedBadges.some(b=>b.badgeId==='first_voyage'));badges.advance(true);assert.equal(badges.progress().nightSailingSeconds,1);
 setTotal(14);badges.advance(true);assert.ok(store.read().ownedBadges.some(b=>b.badgeId==='starry_night'));store.save({badgeProgress:badges.progress()});assert.equal(store.read().badgeProgress.nightSailingSeconds,5);
});
test('visual tracker emits only on visible edges; scheduling and repeats do not unlock',()=>{
 const events=[],track=createVisualEventTracker((type)=>events.push(type));track({});track({aurora:false,dolphin:false});assert.deepEqual(events,[]);
 track({aurora:true});track({aurora:true});assert.deepEqual(events,['aurora_started']);track({});track({aurora:true,dolphin:true});assert.deepEqual(events,['aurora_started','aurora_started','dolphin_seen']);
});
test('real effects report no encounter at scheduling or while dolphins remain underwater',async()=>{
 const THREE=await import('three'),{createVoyageEffects}=await import('./scene-effects.mjs');
 const effects=createVoyageEffects(new THREE.Group()),wave=()=>0,events={auroraAt:10,dolphinsAt:10};
 const update=elapsed=>effects.update({time:elapsed,elapsed,weather:'sunny',auroraWeather:'night',events,nightMix:1,dt:1/30,wave});
 update(0);assert.deepEqual(effects.visibleEvents(0,wave),{aurora:false,dolphin:false});update(10);assert.deepEqual(effects.visibleEvents(10,wave),{aurora:false,dolphin:false});
 for(let t=10;t<16;t+=1/30)update(t);assert.deepEqual(effects.visibleEvents(16,wave),{aurora:true,dolphin:true});
 update(25);assert.equal(effects.visibleEvents(25,wave).dolphin,false);
});
test('old equipped test badge migrates alone, preserving appearance and balances',()=>{
 const {storage}=setup();storage.setItem(GAME_SAVE_KEY,JSON.stringify({version:2,shipCustomization:{name:'晚风号',equippedBadge:'whale',hullColor:'#eddb9b'},sailingData:{points:91,totalSailingSeconds:80},ownedColors:['yellow']}));
 const saved=createGameSave(storage).read();assert.equal(saved.version,10);assert.equal(saved.shipCustomization.equippedBadge,'whale');assert.equal(saved.ownedBadges.length,1);assert.equal(saved.ownedBadges[0].sourceEventId,'legacy_equipped');assert.equal(saved.ownedBadges[0].unlockedAt,null);assert.equal(saved.sailingData.points,91);assert.equal(saved.shipCustomization.name,'晚风号');assert.ok(saved.ownedColors.includes('yellow'));
});
test('failed persistence cannot equip or lose a pending experience; retry saves once',()=>{
 const {storage,badges,store}=setup(),write=storage.setItem;storage.setItem=()=>{throw Error('full');};assert.equal(badges.unlockBadge('aurora_night'),'save-failed');assert.equal(badges.equip('aurora_night'),'locked');
 storage.setItem=write;badges.advance(false);assert.equal(store.read().ownedBadges.length,1);badges.advance(false);assert.equal(store.read().ownedBadges.length,1);
});
test('old aurora alias migrates and corrupt ownership cannot equip locked badges',()=>{
 const {storage}=setup();storage.setItem(GAME_SAVE_KEY,JSON.stringify({version:2,shipCustomization:{equippedBadge:'aurora'}}));
 let saved=createGameSave(storage).read();assert.equal(saved.shipCustomization.equippedBadge,'aurora_night');assert.equal(saved.ownedBadges[0].badgeId,'aurora_night');
 storage.setItem(GAME_SAVE_KEY,JSON.stringify({version:3,shipCustomization:{equippedBadge:'whale'},ownedBadges:[null,{badgeId:'fake'},{badgeId:'dolphin',unlockedAt:'bad'},{badgeId:'dolphin'}],seenBadgeNotifications:['fake','whale','dolphin'],badgeProgress:{nightSailingSeconds:-4}}));
 saved=createGameSave(storage).read();assert.equal(saved.shipCustomization.equippedBadge,null);assert.equal(saved.ownedBadges.length,1);assert.deepEqual(saved.seenBadgeNotifications,['dolphin']);assert.equal(saved.badgeProgress.nightSailingSeconds,0);
});
test('badge changes fade and reuse both hull labels, material and atlas through rapid switching',async()=>{
 const THREE=await import('three'),{createShipCustomization}=await import('./ship-customization.mjs');
 const oldDocument=globalThis.document,ctx=new Proxy({measureText:()=>({width:80})},{get:(o,k)=>k in o?o[k]:()=>{}});
 globalThis.document={createElement:()=>({getContext:()=>ctx})};
 try{
  const ship=new THREE.Group(),material=new THREE.MeshStandardMaterial(),custom=createShipCustomization(ship,{hull:material.clone(),roof:material.clone(),stripe:material.clone()},()=>{},{equippedBadge:'dolphin'},()=>true);
  const labels=ship.children,atlas=custom.texture,shared=labels[0].material;assert.equal(labels[1].material,shared);assert.equal(labels[0].geometry,labels[1].geometry);
  custom.update({equippedBadge:'aurora_night'});custom.animate(.075);assert.ok(shared.opacity>0&&shared.opacity<1);custom.animate(.075);assert.equal(shared.opacity,0);custom.animate(.15);assert.equal(shared.opacity,1);
  custom.update({equippedBadge:'whale'});custom.animate(.08);const opacity=shared.opacity;custom.update({equippedBadge:null});assert.equal(shared.opacity,opacity);custom.animate(.15);custom.animate(.15);assert.equal(shared.opacity,1);assert.equal(custom.data.equippedBadge,null);assert.equal(custom.texture,atlas);assert.equal(labels[1].material.map,atlas);
 }finally{globalThis.document=oldDocument;}
});
