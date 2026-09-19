import * as THREE from 'three';

export const SHIP_COLORS=[
 ['奶油白','#fffcf2'],['海军蓝','#284c65'],['天空蓝','#83bfd6'],['薄荷绿','#a9d5bd'],
 ['珊瑚橙','#e99a7f'],['淡黄色','#eddb9b'],['灰蓝','#829ba8'],['墨绿色','#42685f']
];
export const SHIP_BADGES=[
 {id:'dolphin',name:'海豚',unlocked:true},{id:'whale',name:'鲸鱼',unlocked:true},
 {id:'aurora',name:'极光',unlocked:true},{id:'moon',name:'月亮',unlocked:false},
 {id:'star',name:'星星',unlocked:false},{id:'wave',name:'海浪',unlocked:false}
];
export const DEFAULT_SHIP={name:'小雨号',hullColor:'#fffcf2',roofColor:'#284c65',stripeColor:'#284c65',equippedBadge:'dolphin'};
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
 for(const key of ['hullColor','roofColor','stripeColor'])if(SHIP_COLORS.some(([,color])=>color===data[key]))result[key]=data[key];
 if(data.equippedBadge===null||SHIP_BADGES.some(b=>b.id===data.equippedBadge&&b.unlocked))result.equippedBadge=data.equippedBadge;
 return result;
}

export function drawBadge(ctx,id,x,y,size){
 ctx.save();ctx.translate(x,y);ctx.scale(size/100,size/100);
 ctx.fillStyle='#e5f3ec';ctx.beginPath();ctx.arc(0,0,45,0,Math.PI*2);ctx.fill();
 ctx.strokeStyle='#497989';ctx.fillStyle='#497989';ctx.lineWidth=5;ctx.lineCap='round';ctx.lineJoin='round';
 if(id==='aurora'){
  for(let i=0;i<3;i++){ctx.strokeStyle=['#559b88','#699eb4','#a094bb'][i];ctx.beginPath();ctx.moveTo(-27,-16+i*14);ctx.bezierCurveTo(-5,-45+i*14,6,20+i*8,28,-17+i*10);ctx.stroke();}
 }else if(id==='whale'){
  ctx.beginPath();ctx.moveTo(-29,1);ctx.bezierCurveTo(-27,-30,22,-24,19,6);ctx.lineTo(32,-1);ctx.lineTo(35,-18);ctx.lineTo(22,-12);ctx.lineTo(30,-25);ctx.lineTo(40,-21);ctx.lineTo(35,6);ctx.bezierCurveTo(16,34,-26,30,-29,1);ctx.fill();
  ctx.beginPath();ctx.moveTo(-11,-23);ctx.lineTo(-11,-35);ctx.moveTo(-11,-29);ctx.lineTo(-20,-34);ctx.stroke();
 }else{
  ctx.beginPath();ctx.moveTo(-33,11);ctx.bezierCurveTo(-20,-10,-5,-26,10,-12);ctx.lineTo(10,-28);ctx.lineTo(22,-11);ctx.bezierCurveTo(26,-3,29,6,35,7);ctx.lineTo(26,14);ctx.lineTo(35,22);ctx.lineTo(19,19);ctx.bezierCurveTo(6,-8,-13,-2,-26,16);ctx.lineTo(-33,11);ctx.fill();
 }
 ctx.restore();
}

export function createShipCustomization(ship,{hull,roof,stripe},onNotice,saved,onSave){
 const data=sanitizeShip(saved);
 // One atlas for both sides, redrawn in place; edits never allocate another GPU texture.
 const atlas=document.createElement('canvas');atlas.width=768;atlas.height=160;
 const ctx=atlas.getContext('2d'),texture=new THREE.CanvasTexture(atlas);texture.colorSpace=THREE.SRGBColorSpace;
 const material=new THREE.MeshStandardMaterial({map:texture,transparent:true,roughness:1,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2});
 const geometry=new THREE.PlaneGeometry(1.02,.205);
 for(const side of [-1,1]){
  const label=new THREE.Mesh(geometry,material);label.name='ship-name-and-badge';
  label.position.set(side*.656,.265,-.12);label.rotation.y=side*Math.PI/2;ship.add(label);
 }
 function apply(){
  hull.color.set(data.hullColor);roof.color.set(data.roofColor);stripe.color.set(data.stripeColor);
  ctx.clearRect(0,0,768,160);ctx.fillStyle='#fff9ec';ctx.beginPath();ctx.roundRect(4,8,760,144,28);ctx.fill();
  ctx.strokeStyle='#728a8a';ctx.lineWidth=3;ctx.stroke();
  const offset=data.equippedBadge?154:30;
  if(data.equippedBadge)drawBadge(ctx,data.equippedBadge,82,80,125);
  let font=84;ctx.font=`600 ${font}px "Microsoft YaHei", sans-serif`;
  while(ctx.measureText(data.name).width>724-offset&&font>20){font--;ctx.font=`600 ${font}px "Microsoft YaHei", sans-serif`;}
  ctx.fillStyle='#294858';ctx.textBaseline='middle';ctx.textAlign='center';ctx.fillText(data.name,(offset+738)/2,82);texture.needsUpdate=true;
 }
 apply();
 return {data,texture,update(patch){Object.assign(data,sanitizeShip({...data,...patch}));apply();
  onNotice(onSave(data)?'已保存在本机':'外观已应用，但本机保存失败；刷新后可能丢失。');
 }};
}
