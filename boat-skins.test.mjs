import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createGameSave,GAME_SAVE_KEY} from './game-save.mjs';
let skinModule={},modelModule={};try{skinModule=await import('./boat-skins.mjs');modelModule=await import('./boat-model.mjs');}catch{}

test('boat lights follow smooth time-of-day transitions, not daytime rain, and stay at the fitted lamp',async()=>{
 const {createBoatAccessories,DEFAULT_ACCESSORIES}=await import('./boat-accessories.mjs'),boat=modelModule.createBoatModel(),fittings=createBoatAccessories(boat);
 fittings.apply(DEFAULT_ACCESSORIES);
 assert.equal(boat.materials.lamp.emissiveIntensity,0);assert.equal(boat.materials.glass.emissiveIntensity,0);
 for(const skin of ['classic','rounded','tall','light','wide','speedy','square','explorer','gentle']){
  boat.setSkin(skin);fittings.apply(DEFAULT_ACCESSORIES);
  for(const weather of ['clear','drizzle','storm']){boat.updateLighting({fromPeriod:'day',period:'day',periodBlend:1,weather,rain:1});assert.equal(boat.shipLight.intensity,0);assert.equal(boat.materials.lamp.emissiveIntensity,0);}
  const brightness=[];for(const mix of [0,.25,.5,.75,1]){boat.updateLighting({fromPeriod:'day',period:'night',periodBlend:mix});brightness.push(boat.shipLight.intensity);}
  assert.ok(brightness.every((value,i)=>i===0||value>brightness[i-1]));assert.ok(brightness.at(-1)<=.3);assert.ok(boat.materials.glass.emissiveIntensity>=.7&&boat.materials.glass.emissiveIntensity<=1);
  assert.ok(boat.shipLight.position.distanceTo(boat.mounts.flag.position.clone().add(new THREE.Vector3(0,.565,0)))<.001);
  boat.updateLighting({fromPeriod:'night',period:'dawn',periodBlend:1});assert.ok(boat.shipLight.intensity<brightness.at(-1)*.2);
  boat.updateLighting({fromPeriod:'dawn',period:'day',periodBlend:1});assert.equal(boat.shipLight.intensity,0);
 }
 fittings.apply({...DEFAULT_ACCESSORIES,flag:null});boat.updateLighting({fromPeriod:'night',period:'night',periodBlend:1});assert.equal(boat.shipLight.intensity,0,'no floating light if mast is removed');
});
test('boat size clamps invalid settings and survives skin changes without moving mounts',()=>{
 const boat=modelModule.createBoatModel(),mount=boat.mounts.deck,position=mount.position.clone();
 assert.equal(boat.setSize(NaN),.8);assert.equal(boat.setSize(-1),.5);assert.equal(boat.setSize(9),1);
 boat.setSize(.65);boat.setSkin('gentle');assert.deepEqual(boat.ship.scale.toArray(),[.65,.65,.65]);assert.equal(boat.mounts.deck,mount);assert.deepEqual(mount.position,position);
 const night={fromPeriod:'night',period:'night',periodBlend:1};boat.updateLighting(night,0);const first=boat.materials.glass.emissiveIntensity;boat.updateLighting(night,2);assert.notEqual(first,boat.materials.glass.emissiveIntensity);assert.ok(Math.abs(first-boat.materials.glass.emissiveIntensity)<.1);
});
test('skin selection replaces the whole boat, persists and never spends sailing points',()=>{
 assert.equal(typeof skinModule.createBoatSkins,'function');const disk=new Map(),storage={getItem:k=>disk.get(k)??null,setItem:(k,v)=>disk.set(k,v)},store=createGameSave(storage);store.save({sailingData:{points:91,totalSailingSeconds:800},shipCustomization:{name:'晚风号'},ownedColors:['mint']});
 const custom={data:store.read().shipCustomization,update(p){Object.assign(this.data,p);}},skins=skinModule.createBoatSkins({store,customization:custom});
 for(const id of ['classic','rounded','tall','light','wide','speedy','square','explorer','gentle']){assert.equal(skins.equip(id),'equipped');assert.equal(custom.data.skinId,id);assert.equal(createGameSave(storage).read().shipCustomization.skinId,id);assert.equal(store.read().sailingData.points,91);}
 assert.equal(store.read().shipCustomization.name,'晚风号');assert.ok(store.read().ownedColors.includes('mint'));const before=store.read();assert.equal(skins.equip('__proto__'),'invalid');assert.deepEqual(store.read(),before);
 const write=storage.setItem;storage.setItem=()=>{throw Error('full');};assert.equal(skins.equip('classic'),'save-failed');assert.equal(custom.data.skinId,'gentle');storage.setItem=write;
});
test('version five colors migrate to classic skin while historical progress is retained',()=>{
 const value={version:5,shipCustomization:{name:'旧船',hullColor:'#a9d5bd',equippedBadge:'whale'},ownedBadges:[{badgeId:'whale'}],ownedColors:['mint'],sailingData:{points:120,totalSailingSeconds:900}};const storage={getItem:k=>k===GAME_SAVE_KEY?JSON.stringify(value):null,setItem:()=>{}};const saved=createGameSave(storage).read();assert.equal(saved.shipCustomization.skinId,'classic');assert.equal(saved.shipCustomization.name,'旧船');assert.equal(saved.sailingData.points,120);assert.equal(saved.shipCustomization.equippedBadge,'whale');assert.equal(saved.shipCustomization.hullColor,'#a9d5bd');
});
test('nine skins have distinct silhouettes, keep the ship root and release replaced geometry',()=>{
 assert.equal(typeof modelModule.createBoatModel,'function');const boat=modelModule.createBoatModel(),root=boat.ship;root.position.set(2,.1,1);root.rotation.y=.6;const attachment=new THREE.Group();attachment.name='kept-attachment';root.add(attachment);
 const boxes={};let disposed=0;
 for(let round=0;round<2;round++)for(const id of ['classic','rounded','tall','light','wide','speedy','square','explorer','gentle']){
  boat.setSkin(id);root.updateMatrixWorld(true);assert.equal(boat.ship,root);assert.equal(root.getObjectByName('kept-attachment'),attachment);assert.equal(root.position.x,2);assert.equal(root.rotation.y,.6);
  const visual=root.getObjectByName('boat-body');const geometry=new Set();visual.traverse(o=>{if(o.geometry)geometry.add(o.geometry);});for(const g of geometry)g.addEventListener('dispose',()=>disposed++);
  const local=new THREE.Box3();visual.updateMatrixWorld(true);visual.traverse(o=>{if(o.isMesh){o.geometry.computeBoundingBox();const m=root.matrixWorld.clone().invert().multiply(o.matrixWorld);local.union(o.geometry.boundingBox.clone().applyMatrix4(m));}});boxes[id]=local.getSize(new THREE.Vector3());assert.ok(boxes[id].z<2.9&&boxes[id].x<1.8&&boxes[id].y<2.8,id);assert.ok(geometry.size<15);
 }
 assert.ok(boxes.wide.x>boxes.light.x);assert.ok(boxes.tall.y>boxes.rounded.y);assert.ok(disposed>20);assert.equal(root.children.filter(o=>o.name==='boat-body').length,1);
});
