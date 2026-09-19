import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGameSave,GAME_SAVE_KEY} from './game-save.mjs';
import {createSailing} from './sailing.mjs';
import {DEFAULT_SHIP} from './ship-customization.mjs';
let colors={};try{colors=await import('./color-purchases.mjs');}catch{}
function disk(){const data=new Map();return {getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)};}
function setup(storage=disk(),points=200){
 const store=createGameSave(storage);store.save({sailingData:{points,accumulatedSeconds:12,totalSailingSeconds:12012}});
 const sailing=createSailing({initial:store.read().sailingData,onSave:sailingData=>store.save({sailingData})});
 const customization={data:{...store.read().shipCustomization},update(patch){Object.assign(this.data,patch);}};
 assert.equal(typeof colors.createColorPurchases,'function');
 return {store,sailing,customization,shop:colors.createColorPurchases({store,sailing,customization})};
}
test('new saves own three colors, old equipped colors migrate without losing sailing or appearance',()=>{
 const storage=disk();assert.deepEqual(createGameSave(storage).read().ownedColors,['cream','navy','skyBlue']);
 storage.setItem(GAME_SAVE_KEY,JSON.stringify({version:1,shipCustomization:{...DEFAULT_SHIP,name:'晚风号',hullColor:'#a9d5bd',stripeColor:'#42685f'},sailingData:{points:86,accumulatedSeconds:12,totalSailingSeconds:5172}}));
 const saved=createGameSave(storage).read();assert.equal(saved.version,7);assert.ok(saved.ownedColors.includes('mint'));assert.ok(saved.ownedColors.includes('forest'));assert.equal(saved.shipCustomization.name,'晚风号');assert.equal(saved.sailingData.points,86);
});
test('unlock charges once, equips immediately, works on all parts and survives reload as one save',()=>{
 const storage=disk(),{shop,sailing,customization}=setup(storage);
 assert.equal(shop.equip('mint','hullColor'),'locked');assert.equal(sailing.snapshot().points,200);
 assert.equal(shop.purchase('mint','hullColor'),'unlocked');assert.equal(sailing.snapshot().points,140);assert.equal(customization.data.hullColor,'#a9d5bd');
 for(const part of ['roofColor','stripeColor'])assert.equal(shop.purchase('mint',part),'equipped');assert.equal(sailing.snapshot().points,140);
 const saved=createGameSave(storage).read();assert.ok(saved.ownedColors.includes('mint'));assert.equal(saved.sailingData.points,140);assert.equal(saved.sailingData.totalSailingSeconds,12012);assert.equal(saved.shipCustomization.stripeColor,'#a9d5bd');
});
test('insufficient balance and invalid color/part leave data untouched',()=>{
 const {shop,store,sailing}=setup(disk(),59),before=store.read();
 assert.equal(shop.purchase('mint','hullColor'),'insufficient');assert.equal(shop.purchase('unknown','hullColor'),'invalid');assert.equal(shop.purchase('mint','__proto__'),'invalid');
 assert.deepEqual(store.read(),before);assert.equal(sailing.snapshot().points,59);assert.equal(shop.equip('navy','hullColor'),'equipped');assert.equal(sailing.snapshot().points,59);
});
test('failed purchase write neither charges nor unlocks; retry charges exactly once',()=>{
 const storage=disk(),{shop,store,sailing,customization}=setup(storage),write=storage.setItem;
 storage.setItem=()=>{throw Error('disk full');};assert.equal(shop.purchase('mint','hullColor'),'save-failed');
 assert.equal(sailing.snapshot().points,200);assert.ok(!store.read().ownedColors.includes('mint'));assert.equal(customization.data.hullColor,DEFAULT_SHIP.hullColor);
 storage.setItem=write;assert.equal(shop.purchase('mint','hullColor'),'unlocked');assert.equal(sailing.snapshot().points,140);
});
test('new format filters unknown ownership and remembers the one-time hint',()=>{
 const storage=disk(),{store,shop}=setup(storage);assert.equal(shop.takeHint(),true);assert.equal(shop.takeHint(),false);
 store.save({ownedColors:['mint','mint','unknown']});const saved=createGameSave(storage).read();assert.equal(saved.ownedColors.filter(id=>id==='mint').length,1);assert.ok(!saved.ownedColors.includes('unknown'));assert.equal(saved.colorHintSeen,true);
});
test('color transitions reuse materials, interpolate and can retarget without a jump',async()=>{
 const THREE=await import('three'),{createShipColorTransition}=await import('./ship-customization.mjs');assert.equal(typeof createShipColorTransition,'function');
 const materials={hullColor:new THREE.MeshStandardMaterial(),roofColor:new THREE.MeshStandardMaterial(),stripeColor:new THREE.MeshStandardMaterial()};
 const color=materials.hullColor.color,transition=createShipColorTransition(materials,DEFAULT_SHIP),start=color.clone();
 transition.set({...DEFAULT_SHIP,hullColor:'#a9d5bd'});assert.ok(color.equals(start));transition.update(.15);assert.ok(!color.equals(start));const midpoint=color.clone();
 transition.set({...DEFAULT_SHIP,hullColor:'#e99a7f'});assert.ok(color.equals(midpoint));transition.update(.3);assert.ok(color.equals(new THREE.Color('#e99a7f')));assert.equal(materials.hullColor.color,color);
});
