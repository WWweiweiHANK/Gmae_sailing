import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createBoatModel} from './boat-model.mjs';
import {createGameSave,GAME_SAVE_KEY} from './game-save.mjs';
let accessories={};try{accessories=await import('./boat-accessories.mjs');}catch{}

test('retired fittings fall back without losing retained equipment or voyage progress',()=>{
 const disk=new Map([[GAME_SAVE_KEY,JSON.stringify({version:7,shipCustomization:{name:'晚风号',skinId:'rounded',accessories:{flag:'bunting',deck:'lighthouse',roof:'plant',chimney:'chimney-orange',charm:'pink-dolphin',lifering:'snowflake',nameplate:'plate-wood'}},sailingData:{points:119,totalSailingSeconds:5000}})]]);
 const store=createGameSave({getItem:k=>disk.get(k)??null,setItem:(k,v)=>disk.set(k,v)}),saved=store.read();
 assert.deepEqual(saved.shipCustomization.accessories,{flag:'bunting',deck:null,roof:null,chimney:'chimney-skin',charm:'pink-dolphin',lifering:'snowflake',nameplate:'plate-wood'});
 assert.equal(saved.shipCustomization.name,'晚风号');assert.equal(saved.sailingData.points,119);assert.equal(saved.sailingData.totalSailingSeconds,5000);
 const custom={data:saved.shipCustomization,update(p){Object.assign(this.data,p);}},equipment=accessories.createAccessoryEquipment({store,customization:custom});
 assert.equal(equipment.equip('deck','lighthouse'),'invalid');assert.equal(equipment.equip('charm','whale-tail'),'invalid');assert.equal(equipment.equip('deck','polar-bear'),'equipped');
});

test('all nine boats retain seven fitted mounts and equipped objects when their skin changes',()=>{
 const boat=createBoatModel();assert.ok(boat.mounts,'seven named mounts must exist');
 const slots=['flag','deck','chimney','lifering','nameplate','charm','roof'];
 for(const slot of slots){assert.ok(boat.mounts[slot]?.isGroup,slot);boat.mounts[slot].add(new THREE.Group());}
 const mounts={...boat.mounts};
 for(const skin of ['classic','rounded','tall','light','wide','speedy','square','explorer','gentle']){
  boat.setSkin(skin);for(const slot of slots){assert.equal(boat.mounts[slot],mounts[slot]);assert.ok(boat.mounts[slot].children.length);assert.equal(boat.mounts[slot].parent,boat.ship);}
  assert.ok(boat.mounts.deck.position.z>.7);assert.ok(boat.mounts.chimney.position.z<-.7);assert.ok(boat.mounts.roof.position.y>1);
  assert.ok(boat.mounts.flag.position.distanceTo(boat.mounts.roof.position)>.35);
  boat.ship.updateMatrixWorld(true);const ray=new THREE.Raycaster(new THREE.Vector3(0,boat.mounts.chimney.position.y+.01,-.94),new THREE.Vector3(0,-1,0));const support=ray.intersectObject(boat.ship.getObjectByName('boat-body'),true)[0];assert.ok(support&&Math.abs(support.point.y-boat.mounts.chimney.position.y)<.012,skin+' chimney must touch its support');
 }
});

test('accessories save atomically by slot, survive old saves and never spend sailing points',()=>{
 assert.equal(typeof accessories.createAccessoryEquipment,'function');
 const disk=new Map([[GAME_SAVE_KEY,JSON.stringify({version:6,shipCustomization:{name:'晚风号',skinId:'tall'},sailingData:{points:119}})]]),storage={getItem:k=>disk.get(k)??null,setItem:(k,v)=>disk.set(k,v)},store=createGameSave(storage);
 const custom={data:store.read().shipCustomization,update(p){Object.assign(this.data,p);}},equipment=accessories.createAccessoryEquipment({store,customization:custom});
 assert.equal(custom.data.accessories.flag,'flag-red');assert.equal(custom.data.accessories.deck,null);
 assert.equal(equipment.equip('deck','polar-bear'),'equipped');assert.equal(equipment.equip('charm','aurora-crystal'),'equipped');assert.equal(equipment.equip('roof','polar-bear'),'equipped');
 const saved=createGameSave(storage).read();assert.equal(saved.shipCustomization.accessories.deck,'polar-bear');assert.equal(saved.shipCustomization.accessories.charm,'aurora-crystal');assert.equal(saved.shipCustomization.skinId,'tall');assert.equal(saved.shipCustomization.name,'晚风号');assert.equal(saved.sailingData.points,119);
 const before=store.read();for(const [slot,id] of [['deck','flag-red'],['__proto__','plant'],['roof','unknown']])assert.equal(equipment.equip(slot,id),'invalid');assert.deepEqual(store.read(),before);
 storage.setItem=()=>{throw Error('full');};assert.equal(equipment.equip('deck',null),'save-failed');assert.equal(custom.data.accessories.deck,'polar-bear');
});

test('all reference ornaments fit their reserved envelopes and reuse resources across repeated fitting',()=>{
 assert.equal(typeof accessories.createBoatAccessories,'function');const boat=createBoatModel(),fittings=accessories.createBoatAccessories(boat),geometries=new Set(),materials=new Set();
 for(let cycle=0;cycle<2;cycle++)for(const item of accessories.accessoryCatalog)for(const slot of item.slots){
  if(slot==='nameplate')continue; // The existing canvas atlas is verified in the browser.
  fittings.apply({...accessories.DEFAULT_ACCESSORIES,[slot]:item.id});boat.ship.updateMatrixWorld(true);
  const mount=boat.mounts[slot];assert.ok(mount.children.length,item.id);const bounds=new THREE.Box3();mount.traverse(o=>{if(o.isMesh){geometries.add(o.geometry);materials.add(o.material);o.geometry.computeBoundingBox();bounds.union(o.geometry.boundingBox.clone().applyMatrix4(mount.matrixWorld.clone().invert().multiply(o.matrixWorld)));}});
  const size=bounds.getSize(new THREE.Vector3());assert.ok(Number.isFinite(size.y)&&size.y>0,item.id);if(slot==='deck'||slot==='roof')assert.ok(size.x<=.43&&size.z<=.43&&size.y<=.65,item.id+' must fit deck/roof');
 }
 assert.ok(geometries.size<25);assert.ok(materials.size<35);
 fittings.apply({...accessories.DEFAULT_ACCESSORIES,charm:'dolphin-charm'});fittings.animate(1);const before=boat.mounts.charm.children[0].rotation.z;fittings.animate(1);assert.notEqual(boat.mounts.charm.children[0].rotation.z,before);
 fittings.apply({...accessories.DEFAULT_ACCESSORIES,charm:null});assert.equal(boat.mounts.charm.children.length,0);
});

test('remodeled assembly has a broad tapered funnel, readable souvenirs and a short pendant cord',()=>{
 const boat=createBoatModel(),fittings=accessories.createBoatAccessories(boat);fittings.apply({...accessories.DEFAULT_ACCESSORIES,deck:'polar-bear',charm:'dolphin-charm'});boat.ship.updateMatrixWorld(true);
 const size=slot=>new THREE.Box3().setFromObject(boat.mounts[slot]).getSize(new THREE.Vector3());
 assert.ok(size('chimney').x>=.36,'funnel must be broad, not a narrow tube');
 assert.ok(size('deck').y>=.38,'bear must remain recognizable beside the cabin');
 assert.ok(size('charm').y>=.27&&size('charm').y<=.46,'pendant should be visible without reaching the keel');
 const dolphin=boat.mounts.charm.getObjectByName('dolphin-body');assert.ok(dolphin?.isMesh,'dolphin has a continuous curved body');
 const ring=boat.mounts.lifering.children[0];const ray=new THREE.Raycaster(new THREE.Vector3(1,boat.mounts.lifering.position.y,-.13),new THREE.Vector3(-1,0,0));assert.equal(ray.intersectObject(ring,true).length,0,'lifebuoy has a true open center');
 const before=boat.mounts.charm.children[0].rotation.z;fittings.animate(0);assert.equal(boat.mounts.charm.children[0].rotation.z,before);
});

test('retained whale emblem has eyes outside its head on both sides',()=>{
 const boat=createBoatModel(),fittings=accessories.createBoatAccessories(boat);fittings.apply({...accessories.DEFAULT_ACCESSORIES,lifering:'whale-emblem'});
 for(const emblem of boat.mounts.lifering.children){const eye=emblem.getObjectByName('whale-eye');assert.ok(eye);assert.ok(eye.position.z>.28);}
});
