import * as THREE from 'three';
import {colorCatalog} from './color-catalog.mjs';
import {badgeId,badgeCatalog} from './badges.mjs';
import {boatSkin} from './boat-skins.mjs';
import {DEFAULT_ACCESSORIES,sanitizeAccessories,createBoatAccessories} from './boat-accessories.mjs';
export const DEFAULT_SHIP={name:'小雨号',skinId:'classic',accessories:DEFAULT_ACCESSORIES,hullColor:'#fffcf2',roofColor:'#284c65',stripeColor:'#284c65',equippedBadge:null};
export const SHIP_STORAGE_KEY='tiny-tides-ship-v1';

// ASCII occupies one unit; CJK and other wide characters occupy two (six CJK / twelve ASCII).
export function shipName(value){
 if(typeof value!=='string')return '';
 let result='',width=0;
 for(const char of value.normalize('NFC').replace(/[\p{Cc}\p{Cf}]/gu,'').trim()){
  const units=/[\x20-\x7e]/.test(char)?1:2;if(width+units>12)break;
  result+=char;width+=units;
 }
 return result.trim();
}
export function sanitizeShip(value){
 const data=value&&typeof value==='object'?value:{};
 const result={...DEFAULT_SHIP,name:shipName(data.name)||DEFAULT_SHIP.name};
 result.skinId=boatSkin(data.skinId)?.id??'classic';
 result.accessories=sanitizeAccessories(data.accessories);
 for(const key of ['hullColor','roofColor','stripeColor'])if(colorCatalog.some(color=>color.value===data[key]))result[key]=data[key];
 result.equippedBadge=badgeId(data.equippedBadge);
 return result;
}

export function drawBadge(ctx,id,x,y,size){
 id=badgeCatalog.find(b=>b.id===id)?.icon??id;
 ctx.save();ctx.translate(x,y);ctx.scale(size/100,size/100);
 ctx.fillStyle='#e5f3ec';ctx.beginPath();ctx.arc(0,0,45,0,Math.PI*2);ctx.fill();
 ctx.strokeStyle='#497989';ctx.fillStyle='#497989';ctx.lineWidth=5;ctx.lineCap='round';ctx.lineJoin='round';
 if(id==='aurora'){
  for(let i=0;i<3;i++){ctx.strokeStyle=['#559b88','#699eb4','#a094bb'][i];ctx.beginPath();ctx.moveTo(-27,-16+i*14);ctx.bezierCurveTo(-5,-45+i*14,6,20+i*8,28,-17+i*10);ctx.stroke();}
 }else if(id==='whale'){
  ctx.beginPath();ctx.moveTo(-29,1);ctx.bezierCurveTo(-27,-30,22,-24,19,6);ctx.lineTo(32,-1);ctx.lineTo(35,-18);ctx.lineTo(22,-12);ctx.lineTo(30,-25);ctx.lineTo(40,-21);ctx.lineTo(35,6);ctx.bezierCurveTo(16,34,-26,30,-29,1);ctx.fill();
  ctx.beginPath();ctx.moveTo(-11,-23);ctx.lineTo(-11,-35);ctx.moveTo(-11,-29);ctx.lineTo(-20,-34);ctx.stroke();
 }else if(id==='dolphin'){
  ctx.beginPath();ctx.moveTo(-33,11);ctx.bezierCurveTo(-20,-10,-5,-26,10,-12);ctx.lineTo(10,-28);ctx.lineTo(22,-11);ctx.bezierCurveTo(26,-3,29,6,35,7);ctx.lineTo(26,14);ctx.lineTo(35,22);ctx.lineTo(19,19);ctx.bezierCurveTo(6,-8,-13,-2,-26,16);ctx.lineTo(-33,11);ctx.fill();
 }else if(id==='sunset'){
  ctx.fillStyle='#c69b63';ctx.beginPath();ctx.arc(0,1,19,Math.PI,0);ctx.fill();ctx.beginPath();ctx.moveTo(-29,8);ctx.lineTo(29,8);ctx.moveTo(-20,20);ctx.lineTo(20,20);ctx.stroke();
 }else if(id==='storm'){
  ctx.beginPath();ctx.moveTo(-25,-5);ctx.bezierCurveTo(-32,-25,-4,-30,2,-18);ctx.bezierCurveTo(28,-28,39,1,20,5);ctx.lineTo(-22,5);ctx.stroke();ctx.beginPath();ctx.moveTo(3,6);ctx.lineTo(-9,20);ctx.lineTo(5,19);ctx.lineTo(-3,33);ctx.stroke();
 }else if(id==='stars'){
  for(const [x,y,r] of [[-13,-7,16],[20,-20,7],[16,21,9]]){ctx.beginPath();ctx.moveTo(x,y-r);ctx.lineTo(x+r*.32,y-r*.32);ctx.lineTo(x+r,y);ctx.lineTo(x+r*.32,y+r*.32);ctx.lineTo(x,y+r);ctx.lineTo(x-r*.32,y+r*.32);ctx.lineTo(x-r,y);ctx.lineTo(x-r*.32,y-r*.32);ctx.closePath();ctx.fill();}
 }else if(id==='anchor'){
  ctx.beginPath();ctx.arc(0,-23,7,0,Math.PI*2);ctx.moveTo(0,-16);ctx.lineTo(0,28);ctx.moveTo(-15,-3);ctx.lineTo(15,-3);ctx.moveTo(-28,5);ctx.quadraticCurveTo(-25,27,0,28);ctx.quadraticCurveTo(25,27,28,5);ctx.moveTo(-28,5);ctx.lineTo(-32,17);ctx.moveTo(28,5);ctx.lineTo(32,17);ctx.stroke();
 }else if(id==='sail'){
  ctx.beginPath();ctx.moveTo(-26,17);ctx.lineTo(27,17);ctx.lineTo(17,29);ctx.lineTo(-16,29);ctx.closePath();ctx.fill();ctx.beginPath();ctx.moveTo(1,10);ctx.lineTo(1,-29);ctx.lineTo(-22,10);ctx.closePath();ctx.stroke();ctx.beginPath();ctx.moveTo(9,-20);ctx.lineTo(27,10);ctx.lineTo(9,10);ctx.closePath();ctx.fill();
 }else if(id==='glass'){
  ctx.fillStyle='#80b9aa';ctx.beginPath();ctx.moveTo(-22,13);ctx.lineTo(-9,-28);ctx.lineTo(22,-15);ctx.lineTo(28,14);ctx.lineTo(2,29);ctx.closePath();ctx.fill();ctx.stroke();
 }else{
  ctx.beginPath();ctx.arc(0,0,28,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.moveTo(9,-20);ctx.lineTo(3,7);ctx.lineTo(-9,20);ctx.lineTo(-3,-7);ctx.closePath();ctx.fill();
 }
 ctx.restore();
}

export function createShipColorTransition(materials,initial){
 let elapsed=.3;const parts=Object.entries(materials).map(([key,material])=>({key,material,from:new THREE.Color(initial[key]),to:new THREE.Color(initial[key])}));
 for(const part of parts)part.material.color.copy(part.to);
 return {set(data){elapsed=0;for(const part of parts){part.from.copy(part.material.color);part.to.set(data[part.key]);}},
  update(dt){if(elapsed>=.3)return;elapsed=Math.min(.3,elapsed+dt);const t=elapsed/.3,blend=t*t*(3-2*t);for(const part of parts){if(elapsed===.3)part.material.color.copy(part.to);else part.material.color.lerpColors(part.from,part.to,blend);}}
 };
}
export function createShipCustomization(ship,{hull,roof,stripe},onNotice,saved,onSave,boat=null){
 const data=sanitizeShip(saved);
 const transition=boat?null:createShipColorTransition({hullColor:hull,roofColor:roof,stripeColor:stripe},data);
 if(boat)boat.setSkin(data.skinId);
 const fittings=boat?createBoatAccessories(boat):null;fittings?.apply(data.accessories);
 // One atlas for both sides, redrawn in place; edits never allocate another GPU texture.
 const atlas=document.createElement('canvas');atlas.width=768;atlas.height=160;
 const ctx=atlas.getContext('2d'),texture=new THREE.CanvasTexture(atlas);texture.colorSpace=THREE.SRGBColorSpace;
 const material=new THREE.MeshStandardMaterial({map:texture,transparent:true,roughness:1,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2});
 let displayedBadge=data.equippedBadge,fadePhase='idle';
 const geometry=new THREE.PlaneGeometry(1.02,.205);
 for(const side of [-1,1]){
  const label=new THREE.Mesh(geometry,material);label.name='ship-name-and-badge';
  label.userData.side=side;label.position.set(side*(boat?boat.mounts.nameplate.userData.sideOffset:.656),boat?0:.265,boat?0:-.12);label.rotation.y=side*Math.PI/2;(boat?boat.mounts.nameplate:ship).add(label);
 }
 function apply(){
  const plate=data.accessories.nameplate;ctx.clearRect(0,0,768,160);ctx.fillStyle=plate==='plate-wood'?'#dfbf91':plate==='plate-blue'?'#bcdce6':'#fff9ec';ctx.beginPath();ctx.roundRect(4,8,760,144,28);ctx.fill();
  ctx.strokeStyle='#728a8a';ctx.lineWidth=3;ctx.stroke();
  const offset=displayedBadge?154:30;
  if(displayedBadge)drawBadge(ctx,displayedBadge,82,80,125);
  let font=84;ctx.font=`600 ${font}px "Microsoft YaHei", sans-serif`;
  while(ctx.measureText(data.name).width>724-offset&&font>20){font--;ctx.font=`600 ${font}px "Microsoft YaHei", sans-serif`;}
  ctx.fillStyle='#294858';ctx.textBaseline='middle';ctx.textAlign='center';ctx.fillText(data.name,(offset+738)/2,82);texture.needsUpdate=true;
 }
 apply();
 return {data,texture,animate(dt,worldDt=dt){transition?.update(dt);fittings?.animate(worldDt);
  if(fadePhase==='out'){material.opacity=Math.max(0,material.opacity-dt/.15);if(material.opacity===0){displayedBadge=data.equippedBadge;apply();fadePhase='in';}}
  else if(fadePhase==='in'){material.opacity=Math.min(1,material.opacity+dt/.15);if(material.opacity===1)fadePhase='idle';}
 },update(patch,{save=true}={}){const oldName=data.name,oldBadge=data.equippedBadge,oldPlate=data.accessories.nameplate;Object.assign(data,sanitizeShip({...data,...patch}));transition?.set(data);boat?.setSkin(data.skinId);fittings?.apply(data.accessories);if(oldBadge!==data.equippedBadge)fadePhase='out';if(oldName!==data.name||oldPlate!==data.accessories.nameplate)apply();
  if(save)onNotice(onSave(data)?'已保存在本机':'外观已应用，但本机保存失败；刷新后可能丢失。');
 }};
}
