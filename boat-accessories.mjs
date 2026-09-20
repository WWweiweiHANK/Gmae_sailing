import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {accessoryRewards} from './accessory-rewards.mjs';

export const accessorySlots={flag:'旗子',deck:'前甲板',chimney:'烟囱',lifering:'救生圈 / 徽章',nameplate:'船名牌',charm:'挂件',roof:'顶板'};
const row=(ids,names,slots,y,start,step)=>ids.split(' ').map((id,i)=>({id,name:names.split(' ')[i],slots,thumb:[start+i*step,y]}));
export const accessoryCatalog=[
 ...row('dolphin-charm pink-dolphin whale-tail shooting-stars aurora-crystal bottle shell rain-cloud lantern','海豚挂件 粉色海豚 鲸尾吊饰 流星串饰 极光吊饰 漂流瓶 贝壳挂件 雨云挂件 小灯笼',['charm'],155,28,83.5).filter(a=>!['whale-tail','shell','rain-cloud'].includes(a.id)),
 ...row('lifering wheel whale-emblem star sunset gull-emblem snowflake wave anchor','救生圈 船舵徽章 鲸鱼徽章 星辰徽章 黄昏徽章 飞鸟徽章 冰晶徽章 海浪徽章 锚徽章',['lifering'],185,815,78),
 ...row('polar-bear','北极熊摆件',['deck','roof'],439,30,83.5),
 ...row('flag-red chimney-orange roof-lamp canopy bunting fenders windmill deck-chair plant','特别旗帜 烟囱样式 顶部灯塔 遮阳棚 彩旗 船侧浮标 小风车 甲板躺椅 绿植箱',['roof'],435,813,79).filter(a=>['flag-red','bunting'].includes(a.id)),
 {id:'chimney-skin',name:'船型原装',slots:['chimney']},
 {id:'plate-ivory',name:'奶油铭牌',slots:['nameplate']},{id:'plate-wood',name:'木色铭牌',slots:['nameplate']},{id:'plate-blue',name:'海蓝铭牌',slots:['nameplate']}
];
for(const item of accessoryCatalog){if(item.id==='flag-red')item.slots=['flag'];if(item.id==='chimney-orange')item.slots=['chimney'];if(item.id==='bunting')item.slots=['flag'];if(item.id==='fenders')item.slots=['charm'];if(['canopy','windmill','deck-chair','plant'].includes(item.id))item.slots=['deck','roof'];}
export const DEFAULT_ACCESSORIES={flag:'flag-red',deck:null,chimney:'chimney-skin',lifering:'lifering',nameplate:'plate-ivory',charm:null,roof:null};
export function sanitizeAccessories(value){return Object.fromEntries(Object.keys(accessorySlots).map(slot=>{const id=value?.[slot];return [slot,id===null&&slot!=='nameplate'?null:accessoryCatalog.some(a=>a.id===id&&a.slots.includes(slot))?id:DEFAULT_ACCESSORIES[slot]];}));}
export function createAccessoryEquipment({store,customization,preview=false}){
 function status(id){const reward=accessoryRewards.find(r=>r.accessory===id),owned=store.read().ownedSouvenirs;const available=!reward||owned.includes(reward.souvenir)||!!reward.legacy&&owned.includes(reward.legacy);return {available:available||preview,label:available?(reward?'已获得':'默认组件'):preview?'GM 试装':'见闻解锁',source:reward?.eventName};}
 return {status,equip(slot,id){if(!Object.hasOwn(accessorySlots,slot)||!(id===null&&slot!=='nameplate'||accessoryCatalog.some(a=>a.id===id&&a.slots.includes(slot))))return 'invalid';if(!status(id).available)return 'locked';const accessories={...customization.data.accessories,[slot]:id};if(!store.commit({shipCustomization:{...customization.data,accessories}}))return 'save-failed';customization.update({accessories},{save:false});return 'equipped';}};
}

// One shared palette and fixed geometry pool, including every retained ornament.
export function createBoatAccessories(boat){
 const {mounts}=boat;
 const palette={cream:'#fff0d4',white:'#f5f3eb',blue:'#6ea7d1',navy:'#365771',pink:'#ef9fba',gold:'#f5c56b',wood:'#b88a58',dark:'#49494b',mint:'#a7d6ca',purple:'#b49edb',cyan:'#8acbd9',red:'#ed7866',orange:'#df944e',glass:'#b5dce0',gray:'#aebdca'};
 const mats=Object.fromEntries(Object.entries(palette).map(([id,color])=>[id,new THREE.MeshStandardMaterial({color,roughness:.78,flatShading:true})]));
 mats.glass.transparent=true;mats.glass.opacity=.40;mats.glass.depthWrite=false;mats.glass.side=THREE.DoubleSide;
 mats.gold.emissive.set('#ffd17c');mats.gold.emissiveIntensity=.12;
 mats.amber=mats.glass.clone();mats.amber.color.set('#ffe2a0');mats.amber.opacity=.65;mats.amber.emissive.set('#ffc966');mats.amber.emissiveIntensity=.4;
 mats.crystal=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.45,flatShading:true,transparent:true,opacity:.87});
 const surface=(vertices,indices)=>{const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();return g;};
 function relief(draw,depth=.12,bevel=.035){const s=new THREE.Shape();draw(s);s.closePath();const g=new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:bevel>0,bevelThickness:bevel,bevelSize:bevel,bevelSegments:2,curveSegments:5,steps:1});g.translate(0,0,-depth/2);return g;}
 const polygon=(points,depth=.08,bevel=.025)=>relief(s=>points.forEach(([x,y],i)=>i?s.lineTo(x,y):s.moveTo(x,y)),depth,bevel);
 function dolphinBody(){
  const rows=[[-.98,-.08,.026,.035],[-.77,0,.08,.09],[-.59,.11,.23,.20],[-.30,.22,.29,.26],[0,.21,.27,.25],[.25,.11,.22,.20],[.44,-.05,.16,.14],[.57,-.26,.085,.08],[.60,-.43,.032,.05]],vertices=[],faces=[[],[]];
  for(const [x,y,ry,rz] of rows)for(let i=0;i<12;i++){const a=i*Math.PI/6;vertices.push(x,y+Math.sin(a)*ry,Math.cos(a)*rz);}
  for(let r=0;r<rows.length-1;r++)for(let i=0;i<12;i++){const a=r*12+i,b=r*12+(i+1)%12;faces[i>=7&&i<=10?1:0].push(a,a+12,b,b,a+12,b+12);}
  for(let i=1;i<11;i++){faces[0].push(0,i+1,i,96,96+i,97+i);}
  const g=surface(vertices,faces.flat());g.addGroup(0,faces[0].length,0);g.addGroup(faces[0].length,faces[1].length,1);return g;
 }
 const whaleOutline=s=>{s.moveTo(-.86,.28);s.bezierCurveTo(-1,.03,-.75,-.39,-.19,-.35);s.bezierCurveTo(.32,-.33,.66,-.08,.79,.29);s.lineTo(.63,.33);s.quadraticCurveTo(.41,.02,.17,.15);s.bezierCurveTo(-.25,.31,-.61,.52,-.86,.28);};
 const waveOutline=s=>{s.moveTo(-.92,-.40);s.bezierCurveTo(-.88,.25,-.37,.74,.18,.52);s.quadraticCurveTo(-.04,.40,-.07,.18);s.bezierCurveTo(.07,-.10,.54,-.35,.95,.04);s.quadraticCurveTo(.76,-.62,.20,-.58);s.quadraticCurveTo(-.34,-.47,-.92,-.40);};
 const starVertices=[0,0,.30,0,0,-.18],starIndices=[];
 for(let i=0;i<10;i++){const a=i*Math.PI/5+Math.PI/2,r=i%2?.44:1;starVertices.push(Math.cos(a)*r,Math.sin(a)*r,0);}
 for(let i=0;i<10;i++){starIndices.push(0,2+i,2+(i+1)%10,1,2+(i+1)%10,2+i);}
 const crystalVertices=[],crystalIndices=[];
 for(const [y,r] of [[-.8,0],[-.32,.37],[.35,.37],[.78,.08]])for(let i=0;i<6;i++){const a=i*Math.PI/3;crystalVertices.push(Math.cos(a)*r,y,Math.sin(a)*r);}
 for(let row=0;row<3;row++)for(let i=0;i<6;i++){const a=row*6+i,b=row*6+(i+1)%6;crystalIndices.push(a,b,a+6,b,b+6,a+6);}
 const crystal=surface(crystalVertices,crystalIndices),colors=[];
 const crystalStops=[new THREE.Color('#a7ddae'),new THREE.Color('#72cfd3'),new THREE.Color('#90c9e6'),new THREE.Color('#b394e0')];
 for(let row=0;row<4;row++)for(let i=0;i<6;i++){const c=crystalStops[row].clone().multiplyScalar(i%2?.93:1);colors.push(c.r,c.g,c.b);}crystal.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
 const ringGeo=new THREE.TorusGeometry(.69,.23,8,32),ringFaces=[[],[]],indices=Array.from(ringGeo.index.array);
 for(let j=0;j<8;j++)for(let i=0;i<32;i++){const offset=(j*32+i)*6;ringFaces[Math.floor(i/4)%2].push(...indices.slice(offset,offset+6));}ringGeo.setIndex(ringFaces.flat());ringGeo.clearGroups();ringGeo.addGroup(0,ringFaces[0].length,0);ringGeo.addGroup(ringFaces[0].length,ringFaces[1].length,1);
 const funnelOutline=[[-1,-.65],[-.70,-1],[.70,-1],[1,-.65],[1,.65],[.70,1],[-.70,1],[-1,.65]],fv=[],fi=[];
 for(const [y,w,d,z] of [[0,.22,.18,0],[.59,.18,.15,-.035]])for(const [x,zz] of funnelOutline)fv.push(x*w,y,zz*d+z);
 for(let i=0;i<8;i++){const j=(i+1)%8;fi.push(i,i+8,j,j,i+8,j+8);}fi.push(8,10,9,8,11,10,8,12,11,8,13,12,8,14,13,8,15,14);
 const clothVertices=[],clothFaces=[];
 for(let i=0;i<=8;i++){const x=i/16,wave=Math.sin(i*.72);clothVertices.push(x,.18-.07*Math.sin(i*.38),wave*.038,x,-.09-.07*Math.sin(i*.38),wave*.038);if(i<8){const a=i*2;clothFaces.push(a,a+1,a+2,a+1,a+3,a+2);}}
 const cloth=surface(clothVertices,clothFaces);mats.cloth=mats.red.clone();mats.cloth.side=THREE.DoubleSide;
 const geo={
  box:new RoundedBoxGeometry(1,1,1,1,.055),ball:new THREE.IcosahedronGeometry(1,2),cylinder:new THREE.CylinderGeometry(1,1,1,10),cone:new THREE.ConeGeometry(1,1,8),frustum:new THREE.CylinderGeometry(.72,1,1,6),torus:new THREE.TorusGeometry(1,.18,8,24),lifering:ringGeo,funnel:surface(fv,fi),
  dolphin:dolphinBody(),whale:relief(whaleOutline,.30,.12),
  belly:relief(s=>{s.moveTo(-.69,-.04);s.quadraticCurveTo(-.15,.08,.25,-.15);s.quadraticCurveTo(.06,.03,-.22,-.13);s.quadraticCurveTo(-.51,-.16,-.69,-.04);},.008,.005),
  fin:relief(s=>{s.moveTo(-.17,0);s.quadraticCurveTo(.10,.15,.22,.43);s.quadraticCurveTo(.42,.36,.30,-.08);},.07,.02),
  tail:relief(s=>{s.moveTo(0,.02);s.quadraticCurveTo(-.12,.15,-.38,.12);s.quadraticCurveTo(-.32,-.08,-.10,-.13);s.lineTo(0,-.07);s.lineTo(.10,-.13);s.quadraticCurveTo(.32,-.08,.38,.12);s.quadraticCurveTo(.12,.15,0,.02);},.09,.02),
  star:surface(starVertices,starIndices),crystal,cloth,
  triangle:polygon([[0,0],[.17,0],[.085,-.19]],.004,0),
  bottle:new THREE.LatheGeometry([[0,-.55],[.28,-.55],[.36,-.49],[.36,.24],[.30,.38],[.15,.48],[.15,.67],[.19,.67],[.19,.74],[.13,.74],[.12,.46],[.27,.33],[.32,.23],[.32,-.47],[0,-.49]].map(p=>new THREE.Vector2(...p)),10),
  wing:relief(s=>{s.moveTo(0,0);s.quadraticCurveTo(-.36,.30,-.53,.97);s.quadraticCurveTo(.04,.77,.18,.37);s.lineTo(.31,.10);},.07,.018),
  wave:relief(waveOutline,.08,.03),
  anchor:relief(s=>{s.moveTo(-.75,-.13);s.quadraticCurveTo(-.68,-.73,0,-.86);s.quadraticCurveTo(.68,-.73,.75,-.13);s.lineTo(.49,-.30);s.lineTo(.59,-.35);s.quadraticCurveTo(.40,-.66,0,-.67);s.quadraticCurveTo(-.40,-.66,-.59,-.35);s.lineTo(-.49,-.30);},.09,.02),
  sun:relief(s=>{s.moveTo(-.67,0);s.absarc(0,0,.67,Math.PI,0,true);s.lineTo(-.67,0);},.10,.025),
  rope:new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(new THREE.Vector3(),new THREE.Vector3(.5,-.14,0),new THREE.Vector3(1,0,0)),16,.006,5,false)
 };
 let group,current={},time=0;
 function mesh(kind,color,x=0,y=0,z=0,sx=1,sy=sx,sz=sx){const m=new THREE.Mesh(geo[kind],typeof color==='string'?mats[color]:color);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;m.receiveShadow=true;group.add(m);return m;}
 const box=(color,x,y,z,w,h,d)=>mesh('box',color,x,y,z,w,h,d);
 function rod(color,a,b,r=.045){const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),delta=end.clone().sub(start);const m=mesh('cylinder',color,...start.add(end).multiplyScalar(.5).toArray(),r,delta.length(),r);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return m;}
 const ring=(color,x,y,z,r=.6)=>mesh('torus',color,x,y,z,r);
 function dolphin(color='blue',whale=false){
  mesh(whale?'whale':'dolphin',whale?color:[mats[color],mats.cream]).name=whale?'whale-body':'dolphin-body';
  const dorsal=mesh('fin',color,whale?-.05:.02,whale?.21:.41,0,.67,.68,.75);dorsal.rotation.z=-.4;
  for(const sign of [-1,1]){
   const flipper=mesh('fin',color,-.16,whale?-.19:-.02,sign*.21,.60,.68,.55);flipper.rotation.set(sign*.25,0,2.9);
   if(whale)mesh('ball','cream',-.25,-.20,sign*.205,.46,.115,.075);
   mesh('ball','navy',whale?-.70:-.57,whale?.13:.13,sign*(whale?.316:.225),.031).name=(whale?'whale':'dolphin')+(sign===1?'-eye':'-eye-port');
   mesh('ball','white',whale?-.708:-.578,.14,sign*(whale?.343:.253),.009);
  }
  const tail=mesh('tail',color,whale?.72:.60,whale?.33:-.49,.035,whale?.9:.90);tail.rotation.z=whale?.4:.20;
 }
 function bottle(){mesh('bottle','glass');mesh('cylinder','wood',0,.73,0,.14,.16,.14);ring('wood',0,.62,0,.17).rotation.x=Math.PI/2;mesh('star','gold',0,-.03,0,.26);mesh('ball','white',-.18,.23,.29,.025);}
 function emblem(id){
  if(id==='lifering'){mesh('lifering',[mats.red,mats.cream]);return;}
  if(id==='wheel'){ring('wood',0,0,0,.59);mesh('ball','wood',0,0,0,.17,.17,.12);for(let i=0;i<8;i++){const a=i*Math.PI/4;rod('wood',[0,0,0],[Math.sin(a)*.87,Math.cos(a)*.87,0],.055);mesh('ball','wood',Math.sin(a)*.88,Math.cos(a)*.88,0,.083,.083,.072);}return;}
  if(id==='whale-emblem'){dolphin('blue',true);return;}
  if(id==='star'){mesh('star','gold',0,0,0,.87);return;}
  if(id==='sunset'){mesh('sun','gold',0,-.05,-.09);mesh('sun','orange',0,-.06,.04,.65);mesh('wave','blue',0,-.22,.16,.78,.30,.60);box('cream',0,-.50,.10,1.46,.10,.28);return;}
  if(id==='gull-emblem'){
   mesh('ball','white',0,-.16,.06,.50,.20,.17);mesh('ball','white',.40,-.08,.05,.18);
   mesh('cone','orange',.63,-.09,.07,.062,.22,.065).rotation.z=-Math.PI/2;mesh('ball','navy',.46,-.035,.21,.024);
   const far=mesh('wing','gray',.12,-.02,-.10,.90,.74,1);far.rotation.z=-.82;
   mesh('wing','white',-.10,-.05,.13,1,.95,1);mesh('wing','gray',-.18,.23,.10,.70,.63,.9);
   mesh('tail','gray',-.52,-.15,0,.44).rotation.z=-Math.PI/2;return;
  }
  if(id==='snowflake'){for(let i=0;i<6;i++){const a=i*Math.PI/3,dx=Math.sin(a),dy=Math.cos(a);rod('cyan',[0,0,0],[dx*.85,dy*.85,0],.043);for(const t of [.33,.60])for(const side of [-1,1])rod('cyan',[dx*t,dy*t,0],[dx*(t+.14)+dy*side*.17,dy*(t+.14)-dx*side*.17,0],.031);}mesh('ball','white',0,0,.015,.13,.13,.05);return;}
  if(id==='wave'){mesh('wave','blue');mesh('wave','cyan',-.03,.05,.12,.83,.77,.55);mesh('wave','blue',.13,-.23,.21,.72,.46,.45);return;}
  ring('blue',0,.65,0,.17);rod('navy',[0,.49,0],[0,-.76,0],.069);rod('blue',[-.42,.24,0],[.42,.24,0],.062);mesh('anchor','navy');for(const x of [-.43,.43])mesh('ball','blue',x,.24,0,.073);
 }
 function bear(){
  mesh('cylinder','wood',0,.035,0,.45,.07,.38);
  mesh('ball','cream',0,.45,-.09,.30,.43,.25);mesh('ball','cream',0,.77,.06,.25,.32,.25);
  mesh('ball','cream',0,1.02,.22,.255,.235,.25);mesh('ball','cream',0,.96,.42,.18,.13,.20);
  for(const x of [-.19,.19]){
   mesh('ball','cream',x,1.18,.15,.076,.078,.063);mesh('ball','cream',x,.22,-.07,.21,.21,.23);
   const leg=mesh('ball','cream',x*.74,.36,.20,.11,.30,.12);leg.rotation.x=-.12;mesh('ball','cream',x*.75,.10,.30,.13,.08,.18);
   mesh('ball','dark',x*.65,1.06,.416,.021);
  }
  mesh('ball','dark',0,.998,.60,.058,.038,.035);
 }
 function make(id,slot){
  group=new THREE.Group();group.name='accessory-'+id;
  if(slot==='lifering'){emblem(id);group.scale.setScalar(.19);return group;}
  if(slot==='deck'||slot==='roof'){bear();const bounds=new THREE.Box3().setFromObject(group),size=bounds.getSize(new THREE.Vector3()),scale=Math.min(.42/Math.max(size.x,size.z),.48/size.y);group.children.forEach(child=>child.position.y-=bounds.min.y);group.scale.setScalar(scale);return group;}
  if(slot==='chimney'){mesh('funnel',boat.materials.chimney);box(boat.materials.cap,0,.635,-.035,.445,.09,.365);return group;}
  if(slot==='flag'){
   rod('cream',[0,0,0],[0,.54,0],.016);mesh('ball',boat.materials.lamp,0,.565,0,.044);
   if(id==='flag-red'){const cloth=mesh('cloth','cloth',0,.34,0,.67,.82,.67);cloth.rotation.y=-Math.PI/2;return group;}
   const string=new THREE.Group();string.name='bunting-string';group.add(string);const parent=group;group=string;mesh('rope','cream');
   for(let i=0;i<5;i++){const t=.09+i*.175;mesh('triangle',['blue','cream','red','gold','blue'][i],t,-.28*t*(1-t),0,.72);}
   group=parent;rod('cream',[0,0,0],[0,1,0],.014).name='bunting-rear-post';for(const name of ['start','end']){const tie=new THREE.Object3D();tie.name='bunting-'+name;group.add(tie);}return group;
  }
  const loop=ring('wood',0,-.045,0,.029);loop.scale.y*=2;loop.scale.x*=.73;rod('wood',[0,-.093,0],[0,-.118,0],.009);
  const ropeCount=group.children.length;
  if(id==='dolphin-charm'||id==='pink-dolphin')dolphin(id==='pink-dolphin'?'pink':'blue');
  else if(id==='shooting-stars'){
   rod('wood',[0,.34,0],[.34,-.20,0],.017);rod('wood',[0,.34,0],[-.18,-.56,0],.017);
   for(const [x,y,c,r] of [[0,.25,'gold',.44],[.34,-.28,'blue',.31],[-.15,-.61,'pink',.27]])mesh('star',c,x,y,.06,r);
  }else if(id==='aurora-crystal')mesh('crystal','crystal');
  else if(id==='bottle')bottle();
  else if(id==='lantern'){
   mesh('frustum','amber',0,0,0,.32,.78,.32);mesh('frustum','dark',0,.48,0,.40,.18,.40);mesh('cylinder','dark',0,-.43,0,.34,.10,.34);
   for(let i=0;i<6;i++){const a=i*Math.PI/3;rod('dark',[Math.cos(a)*.32,-.38,Math.sin(a)*.32],[Math.cos(a)*.23,.39,Math.sin(a)*.23],.022);}
   mesh('ball','gold',0,-.06,0,.065,.29,.065);ring('wood',0,.65,0,.10);
  }
  const pendant=new THREE.Group();pendant.name='pendant';for(const child of group.children.slice(ropeCount))pendant.add(child);
  const bounds=new THREE.Box3().setFromObject(pendant),size=bounds.getSize(new THREE.Vector3()),scale=Math.min(.40/size.x,.38/size.y,.23/size.z);
  const facing=id==='dolphin-charm'||id==='pink-dolphin'?-1:1;
  pendant.scale.set(scale*facing,scale,scale);pendant.position.set(-(bounds.min.x+bounds.max.x)*.5*scale*facing,-.118-bounds.max.y*scale,0);group.add(pendant);return group;
 }
 function apply(value){
  const next=sanitizeAccessories(value);
  for(const [slot,id] of Object.entries(next)){
   if(slot==='nameplate'||current[slot]===id)continue;const mount=mounts[slot];mount.clear();
   if(id){if(slot==='lifering'){for(const side of [-1,1]){const fitting=make(id,slot);fitting.userData.side=side;fitting.position.x=side*mount.userData.sideOffset;fitting.rotation.y=side*Math.PI/2;mount.add(fitting);}}else mount.add(make(id,slot));}
  }
  // A skin changes both roof and funnel heights. Retie the same pooled rope.
  if(next.flag==='bunting'){
   const flag=mounts.flag.children[0],start=new THREE.Vector3(0,.43,0),end=mounts.chimney.position.clone().add(new THREE.Vector3(0,.68,-.035).multiply(mounts.chimney.scale)).sub(mounts.flag.position),delta=end.clone().sub(start),string=flag.getObjectByName('bunting-string');
   string.position.copy(start);string.quaternion.setFromUnitVectors(new THREE.Vector3(1,0,0),delta.clone().normalize());string.scale.x=delta.length();
   flag.getObjectByName('bunting-start').position.copy(start);flag.getObjectByName('bunting-end').position.copy(end);
   const post=flag.getObjectByName('bunting-rear-post');post.visible=!next.chimney;
   if(post.visible){const base=mounts.chimney.position.clone().sub(mounts.flag.position),height=end.clone().sub(base);post.position.copy(base).add(end).multiplyScalar(.5);post.scale.set(.014,height.length(),.014);post.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),height.normalize());}
  }
  current=next;
 }
 return {apply,animate(dt){time+=dt;const charm=mounts.charm.children[0];if(charm)charm.rotation.z=Math.sin(time*1.3)*.045;const cloth=mounts.flag.getObjectByName('accessory-flag-red')?.children[2];if(cloth)cloth.rotation.y=-Math.PI/2+Math.sin(time*1.2)*.08;}};
}
