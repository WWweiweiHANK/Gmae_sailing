import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

export const accessorySlots={flag:'旗子',deck:'前甲板',chimney:'烟囱',lifering:'救生圈 / 徽章',nameplate:'船名牌',charm:'挂件',roof:'顶板'};
const row=(ids,names,slots,y,start,step)=>ids.split(' ').map((id,i)=>({id,name:names.split(' ')[i],slots,thumb:[start+i*step,y]}));
export const accessoryCatalog=[
 ...row('dolphin-charm pink-dolphin whale-tail shooting-stars aurora-crystal bottle shell rain-cloud lantern','海豚挂件 粉色海豚 鲸尾吊饰 流星串饰 极光吊饰 漂流瓶 贝壳挂件 雨云挂件 小灯笼',['charm'],155,28,83.5),
 ...row('lifering wheel whale-emblem star sunset gull-emblem snowflake wave anchor','救生圈 船舵徽章 鲸鱼徽章 星辰徽章 黄昏徽章 飞鸟徽章 冰晶徽章 海浪徽章 锚徽章',['lifering'],185,815,78),
 ...row('polar-bear lighthouse aurora-globe glow-bottle seabird whale snow-globe memory-flag luggage','北极熊摆件 灯塔摆件 极光球 发光海瓶 海鸟摆件 鲸鱼摆件 雪景球 纪念小旗 行李箱',['deck','roof'],439,30,83.5),
 ...row('flag-red chimney-orange roof-lamp canopy bunting fenders windmill deck-chair plant','特别旗帜 烟囱样式 顶部灯塔 遮阳棚 彩旗 船侧浮标 小风车 甲板躺椅 绿植箱',['roof'],435,813,79),
 {id:'chimney-skin',name:'船型原装',slots:['chimney']},
 {id:'plate-ivory',name:'奶油铭牌',slots:['nameplate']},{id:'plate-wood',name:'木色铭牌',slots:['nameplate']},{id:'plate-blue',name:'海蓝铭牌',slots:['nameplate']}
];
for(const item of accessoryCatalog){if(item.id==='flag-red')item.slots=['flag'];if(item.id==='chimney-orange')item.slots=['chimney'];if(item.id==='bunting')item.slots=['flag'];if(item.id==='fenders')item.slots=['charm'];if(['canopy','windmill','deck-chair','plant'].includes(item.id))item.slots=['deck','roof'];}
export const DEFAULT_ACCESSORIES={flag:'flag-red',deck:null,chimney:'chimney-skin',lifering:'lifering',nameplate:'plate-ivory',charm:null,roof:null};
export function sanitizeAccessories(value){return Object.fromEntries(Object.keys(accessorySlots).map(slot=>{const id=value?.[slot];return [slot,id===null&&slot!=='nameplate'?null:accessoryCatalog.some(a=>a.id===id&&a.slots.includes(slot))?id:DEFAULT_ACCESSORIES[slot]];}));}
export function createAccessoryEquipment({store,customization}){
 return {equip(slot,id){if(!Object.hasOwn(accessorySlots,slot)||!(id===null&&slot!=='nameplate'||accessoryCatalog.some(a=>a.id===id&&a.slots.includes(slot))))return 'invalid';const accessories={...customization.data.accessories,[slot]:id};if(!store.commit({shipCustomization:{...customization.data,accessories}}))return 'save-failed';customization.update({accessories},{save:false});return 'equipped';}};
}

// Small local meshes share this fixed geometry/material palette. Nothing is allocated
// during animation and changing a fitting only replaces its inexpensive object nodes.
export function createBoatAccessories(boat){
 const {mounts}=boat;
 const palette={cream:'#fff0d4',white:'#f6f2e8',blue:'#78afdb',navy:'#365771',pink:'#f5a5c0',gold:'#f7cc70',wood:'#c8945e',dark:'#48494d',mint:'#9dbb69',green:'#6e984f',purple:'#b79adc',cyan:'#86d7d3',red:'#ee8068',orange:'#ed8045',glass:'#aad9df',gray:'#b6c2cb'};
 const mats=Object.fromEntries(Object.entries(palette).map(([id,color])=>[id,new THREE.MeshStandardMaterial({color,roughness:.83,flatShading:true})]));
 mats.glass.transparent=true;mats.glass.opacity=.34;mats.glass.depthWrite=false;mats.gold.emissive.set('#ffd17c');mats.gold.emissiveIntensity=.18;
 const dolphinMaterials={blue:[mats.blue,mats.cream],pink:[mats.pink,mats.cream]},liferingMaterials=[mats.red,mats.cream];
 const shape=(points)=>{const s=new THREE.Shape();points.forEach(([x,y],i)=>i?s.lineTo(x,y):s.moveTo(x,y));s.closePath();return new THREE.ExtrudeGeometry(s,{depth:.12,bevelEnabled:true,bevelThickness:.035,bevelSize:.035,bevelSegments:1,steps:1});};
 function surface(vertices,indices){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();return g;}
 function seaBody(whale=false){
  const rows=whale?[[-.92,.07,.02,.03],[-.77,.08,.29,.28],[-.43,.09,.38,.33],[-.03,.06,.32,.28],[.34,-.02,.21,.19],[.62,.02,.08,.09],[.78,.13,.02,.045]]:[[-.99,.05,.035,.065],[-.76,.09,.10,.12],[-.59,.18,.24,.23],[-.26,.24,.30,.26],[.09,.15,.24,.22],[.40,-.07,.15,.15],[.60,-.30,.065,.08],[.68,-.39,.025,.05]];
  const vertices=[],faces=[[],[]];for(const [x,y,ry,rz] of rows)for(let i=0;i<10;i++){const a=i*Math.PI/5;vertices.push(x,y+Math.sin(a)*ry,Math.cos(a)*rz);}
  for(let r=0;r<rows.length-1;r++)for(let i=0;i<10;i++){const a=r*10+i,b=r*10+(i+1)%10;faces[i>=5&&i<=8?1:0].push(a,a+10,b,b,a+10,b+10);}
  const g=surface(vertices,faces.flat());g.addGroup(0,faces[0].length,0);g.addGroup(faces[0].length,faces[1].length,1);return g;
 }
 const ringGeo=new THREE.TorusGeometry(.69,.23,8,24),ringFaces=[[],[]],ringIndices=Array.from(ringGeo.index.array);for(let j=0;j<8;j++)for(let i=0;i<24;i++){const offset=(j*24+i)*6;ringFaces[Math.floor(i/3)%2].push(...ringIndices.slice(offset,offset+6));}ringGeo.setIndex(ringFaces.flat());ringGeo.clearGroups();ringGeo.addGroup(0,ringFaces[0].length,0);ringGeo.addGroup(ringFaces[0].length,ringFaces[1].length,1);
 const funnelOutline=[[-1,-.65],[-.70,-1],[.70,-1],[1,-.65],[1,.65],[.70,1],[-.70,1],[-1,.65]],fv=[],fi=[];
 for(const [y,w,d,z] of [[0,.22,.18,0],[.59,.18,.15,-.035]])for(const [x,zz] of funnelOutline)fv.push(x*w,y,zz*d+z);
 for(let i=0;i<8;i++){const j=(i+1)%8;fi.push(i,i+8,j,j,i+8,j+8);}fi.push(8,10,9,8,11,10,8,12,11,8,13,12,8,14,13,8,15,14);
 const starPoints=Array.from({length:10},(_,i)=>{const a=i*Math.PI/5+Math.PI/2,r=i%2?.42:1;return [Math.cos(a)*r,Math.sin(a)*r];});
 const geo={box:new RoundedBoxGeometry(1,1,1,1,.055),ball:new THREE.IcosahedronGeometry(1,2),cylinder:new THREE.CylinderGeometry(1,1,1,10),cone:new THREE.ConeGeometry(1,1,8),frustum:new THREE.CylinderGeometry(.72,1,1,8),torus:new THREE.TorusGeometry(1,.22,6,16),lifering:ringGeo,funnel:surface(fv,fi),dolphin:seaBody(),whale:seaBody(true),leaf:surface([0,0,0,-.17,.40,.03,0,.48,.13,.17,.4,.03,0,1,.24,0,.40,-.04],[0,2,1,0,3,2,1,2,4,2,3,4,0,1,5,0,5,3,1,4,5,3,5,4]),star:shape(starPoints),fin:shape([[-.5,0],[-.2,.16],[.1,.7],[.2,.82],[.32,.65],[.36,.13],[.65,-.12]]),tail:shape([[-.85,.20],[-.60,.54],[-.26,.42],[0,.10],[.26,.42],[.60,.54],[.85,.20],[.57,-.12],[0,-.08],[-.57,-.12]]),flag:shape([[0,.50],[.28,.56],[.57,.43],[.85,.31],[1,.33],[.92,-.12],[.60,-.22],[.28,-.06],[0,-.1]]),shell:shape([[0,-.7],[-.8,-.05],[-.9,.38],[-.70,.75],[-.3,.98],[.3,.98],[.70,.75],[.9,.38],[.8,-.05]]),wave:shape([[-1,-.5],[-.8,.3],[-.2,.7],[.3,.6],[.2,.1],[.6,-.1],[1,.25],[.8,-.5]])};
 let group,current={},time=0;
 function mesh(kind,color,x=0,y=0,z=0,sx=1,sy=sx,sz=sx){const m=new THREE.Mesh(geo[kind],typeof color==='string'?mats[color]:color);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;m.receiveShadow=true;group.add(m);return m;}
 const box=(color,x,y,z,w,h,d)=>mesh('box',color,x,y,z,w,h,d);
 function rod(color,a,b,r=.045){const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),delta=end.clone().sub(start);const m=mesh('cylinder',color,...start.add(end).multiplyScalar(.5).toArray(),r,delta.length(),r);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return m;}
 function ring(color,x,y,z,r=.6){return mesh('torus',color,x,y,z,r,r,r);}
 function dolphin(color='blue',whale=false){
  mesh(whale?'whale':'dolphin',dolphinMaterials[color]).name=whale?'whale-body':'dolphin-body';
  mesh('fin',color,-.02,.30,-.025,.37,.45,.38).rotation.z=-.35;
  for(const sign of [-1,1]){const flipper=mesh('fin',color,-.36,-.07,sign*.19,.32,.38,.6);flipper.rotation.set(sign*.40,0,2.5);const eye=mesh('ball','navy',-.68,whale?.16:.23,sign*(whale?.282:.195),.039);eye.name=(whale?'whale':'dolphin')+(sign===1?'-eye':'-eye-port');mesh('ball','white',-.689,whale?.17:.24,sign*(whale?.312:.224),.011);}
  const tail=mesh('tail',color,whale?.77:.68,whale?.12:-.38,0,.42,.42,.7);tail.rotation.set(.7,0,whale?-.25:-.7);
  if(whale){rod('cyan',[-.57,.40,0],[-.58,.64,0],.025);rod('cyan',[-.58,.62,0],[-.73,.70,0],.025);rod('cyan',[-.58,.62,0],[-.45,.72,0],.025);}
 }
 function gull(){mesh('ball','white',0,.09,0,.38,.27,.24);mesh('ball','white',-.25,.32,0,.20);mesh('cone','gold',-.49,.3,0,.09,.24,.09).rotation.z=Math.PI/2;mesh('fin','gray',.18,.15,.17,.50,.3,1).rotation.z=-.4;mesh('ball','navy',-.31,.37,.18,.035);for(const x of [-.12,.13])rod('orange',[x,-.15,0],[x,-.36,0],.028);}
 function bottle(){mesh('cylinder','glass',0,-.05,0,.41,.85,.34);mesh('ball','glass',0,.37,0,.41,.24,.34);mesh('cylinder','cyan',0,-.45,0,.41,.06,.34);mesh('cylinder','glass',0,.61,0,.21,.30,.20);mesh('cylinder','wood',0,.78,0,.23,.14,.22);ring('gold',0,.50,0,.21).rotation.x=Math.PI/2;mesh('star','gold',0,0,.28,.25,.25,.3);for(const [x,y] of [[-.22,-.25],[.20,.22],[.19,-.29]])mesh('ball','cream',x,y,.19,.05);}
 function emblem(id){
  if(id==='lifering'){mesh('lifering',liferingMaterials);return;}
  if(id==='wheel'){ring('wood',0,0,0,.62);mesh('cylinder','wood',0,0,0,.20,.16,.20).rotation.x=Math.PI/2;for(let i=0;i<8;i++){const a=i*Math.PI/4;rod('wood',[0,0,0],[Math.sin(a)*.92,Math.cos(a)*.92,0],.055);}return;}
  if(id==='whale-emblem'){dolphin('blue',true);return;}if(id==='star'){mesh('star','gold',0,0,0,.86,.86,1);return;}
  if(id==='sunset'){mesh('ball','gold',0,.2,0,.7,.7,.15);mesh('ball','orange',0,.1,.13,.45,.45,.13);box('cream',0,-.12,.25,1.55,.13,.14);mesh('wave','blue',0,-.37,.18,.77,.36,1);return;}
  if(id==='gull-emblem'){gull();mesh('fin','white',.35,.3,0,.8,.6,1).rotation.z=-.4;return;}
  if(id==='snowflake'){for(let i=0;i<6;i++){const a=i*Math.PI/3,dir=[Math.sin(a),Math.cos(a)];rod('cyan',[0,0,0],[dir[0]*.85,dir[1]*.85,0]);for(const sign of [-1,1])rod('cyan',[dir[0]*.48,dir[1]*.48,0],[dir[0]*.63+dir[1]*sign*.23,dir[1]*.63-dir[0]*sign*.23,0],.035);}return;}
  if(id==='wave'){mesh('wave','blue',0,0,0,.88,.9,1);mesh('wave','cyan',0,-.22,.13,.72,.52,1);return;}
  ring('blue',0,.7,0,.18);rod('navy',[0,.5,0],[0,-.75,0],.075);rod('blue',[-.45,.25,0],[.45,.25,0],.065);rod('navy',[-.72,-.28,0],[0,-.75,0],.08);rod('navy',[0,-.75,0],[.72,-.28,0],.08);for(const sign of [-1,1])mesh('fin','navy',sign*.64,-.27,0,.34,.35,1).rotation.z=sign*.5;
 }
 function ornament(id){
  if(id==='polar-bear'){mesh('cylinder','wood',0,.035,0,.49,.07,.42);mesh('ball','cream',0,.40,0,.43,.53,.32);mesh('ball','cream',0,1,.05,.34,.32,.31);for(const x of [-.24,.24]){mesh('ball','cream',x,1.24,0,.115);mesh('ball','pink',x,1.25,.065,.065);mesh('ball','cream',x,.10,.26,.19,.12,.24);mesh('ball','cream',x*1.22,.43,.20,.13,.33,.13);mesh('ball','dark',x*.60,1.05,.31,.031);}mesh('ball','white',0,.96,.33,.18,.12,.13);mesh('ball','dark',0,1,.44,.057);return;}
  if(id==='lighthouse'){
   mesh('cylinder','cream',0,.06,0,.40,.12,.40);mesh('frustum','red',0,.58,0,.27,.98,.27);
   for(const y of [.36,.82])mesh('cylinder','cream',0,y,0,.275-y*.055,.17,.275-y*.055);
   mesh('cylinder','red',0,1.06,0,.32,.09,.32);mesh('cylinder','gold',0,1.22,0,.245,.26,.245);
   for(let i=0;i<6;i++){const a=i*Math.PI/3;rod('cream',[Math.cos(a)*.255,1.09,Math.sin(a)*.255],[Math.cos(a)*.255,1.36,Math.sin(a)*.255],.025);}
   mesh('cone','red',0,1.49,0,.36,.27,.36);mesh('ball','red',0,1.65,0,.055);box('cream',0,.38,.269,.15,.24,.023);box('navy',0,.38,.285,.10,.18,.018);return;
  }
  if(id==='roof-lamp'){mesh('frustum','cream',0,.16,0,.25,.32,.25);rod('cream',[0,.30,0],[0,1.07,0],.042);rod('cream',[-.19,.67,0],[.19,.67,0],.04);mesh('cone','red',0,1.04,0,.19,.25,.19);mesh('ball','gold',0,1.25,0,.18);return;}
  if(id==='aurora-globe'||id==='snow-globe'){mesh('cylinder',id==='snow-globe'?'wood':'navy',0,.10,0,.43,.20,.43);mesh('cylinder','cream',0,.22,0,.41,.055,.41);mesh('ball','glass',0,.69,0,.57);if(id==='snow-globe'){for(const [y,r] of [[.45,.32],[.68,.24],[.88,.16]]){mesh('cone','navy',0,y,0,r,.42,r);mesh('cone','white',0,y+.08,0,r*.84,.28,r*.84);}for(const [x,y] of [[-.3,.65],[.26,.91],[.3,.48]])mesh('ball','white',x,y,.25,.045);}else{for(const [x,y,c] of [[-.17,.64,'cyan'],[.08,.81,'mint'],[.22,.58,'purple']])mesh('leaf',c,x,.31,0,.9,y,.7).rotation.z=-.35+x;mesh('star','cream',-.2,.79,.29,.13,.13,.3);}return;}
  if(id==='glow-bottle'){bottle();group.children.forEach(o=>o.position.y+=.6);return;}
  if(id==='seabird'){gull();group.children.forEach(o=>o.position.y+=.4);return;}
  if(id==='whale'){mesh('cylinder','navy',0,.10,0,.42,.20,.32);mesh('cylinder','navy',-.25,.29,0,.085,.24,.10).name='whale-stand';const start=group.children.length;dolphin('blue',true);group.children.slice(start).forEach(o=>o.position.y+=.62);return;}
  if(id==='memory-flag'){mesh('cylinder','cream',0,.09,0,.29,.18,.29);rod('wood',[0,.1,0],[0,1.35,0],.035);mesh('flag','blue',0,1.05,0,.57,.55,1);return;}
  if(id==='luggage'){for(const [x,y,z,c,w,h,d] of [[0,.22,0,'wood',.95,.4,.6],[.12,.62,0,'orange',.62,.38,.48]]){box(c,x,y,z,w,h,d);for(const offset of [-.25,.25])box('navy',x+offset*w,y,z+.01,.055,h+.015,d+.025);ring('wood',x,y+h/2+.07,0,.1);}return;}
  if(id==='canopy'){for(const x of [-.60,.60])for(const z of [-.4,.4])rod('wood',[x,.1,z],[x,.99,z],.045);box('wood',0,.07,0,1.4,.14,.98);for(let i=0;i<5;i++){const x=-.56+i*.28;for(const sign of [-1,1]){const m=box(i%2?'cream':'blue',x,1.12,sign*.28,.28,.075,.64);m.rotation.x=sign*.3;}box(i%2?'cream':'blue',x,1.01,.59,.28,.17,.03);}return;}
  if(id==='windmill'){mesh('cylinder','wood',0,.035,0,.39,.07,.33);mesh('frustum','cream',0,.45,0,.27,.85,.25);box('navy',0,.22,.251,.15,.27,.03);const blades=new THREE.Group();blades.name='windmill-blades';blades.position.set(0,.87,.29);group.add(blades);const parent=group;group=blades;for(let i=0;i<4;i++){const a=i*Math.PI/2;rod('wood',[0,0,0],[Math.sin(a)*.7,Math.cos(a)*.7,0],.032);const m=box('cream',Math.sin(a)*.45,Math.cos(a)*.45,0,.22,.50,.055);m.rotation.z=-a+.22;}mesh('ball','red',0,0,.05,.12);group=parent;return;}
  if(id==='deck-chair'){for(const x of [-.36,.36]){rod('wood',[x,.07,.48],[x,.78,-.35]);rod('wood',[x,.05,-.4],[x,.45,.35]);}const back=box('cream',0,.59,-.12,.65,.64,.06);back.rotation.x=-.5;const stripe=box('pink',0,.59,-.08,.25,.62,.06);stripe.rotation.x=-.5;box('pink',0,.35,.27,.65,.055,.37);return;}
  if(id==='plant'){box('wood',0,.10,0,1.05,.20,.65);box('dark',0,.21,0,.90,.035,.50);for(const z of [-.34,.34])for(const y of [.065,.17])box('wood',0,y,z,1.11,.09,.035);for(let i=0;i<9;i++){const a=i*2.4,m=mesh('leaf',i%2?'green':'mint',Math.sin(a)*.10,.21,Math.cos(a)*.07,i%3===0?1.1:.86,i<7?.62:.84,1);m.name='plant-leaf';m.rotation.set(i<7?.64:.12,a,0,'YXZ');}return;}
 }
 function make(id,slot){
  group=new THREE.Group();group.name='accessory-'+id;
  if(slot==='lifering'){emblem(id);group.scale.setScalar(.19);return group;}
  if(slot==='deck'||slot==='roof'){ornament(id);const bounds=new THREE.Box3().setFromObject(group),size=bounds.getSize(new THREE.Vector3()),scale=Math.min(id==='lighthouse'?.265:id==='plant'?.29:.31,.42/Math.max(size.x,size.z),.48/size.y);group.children.forEach(child=>{child.position.y-=bounds.min.y;});group.scale.setScalar(scale);return group;}
  if(slot==='chimney'){const original=id==='chimney-skin';mesh('funnel',original?boat.materials.chimney:mats.orange);box(original?boat.materials.cap:mats.navy,0,.635,-.035,.445,.09,.365);return group;}
  if(slot==='flag'){group.rotation.y=Math.PI/2;rod('cream',[0,0,0],[0,.54,0],.016);mesh('ball',boat.materials.lamp,0,.565,0,.044);if(id==='bunting'){rod('wood',[-.02,.42,0],[.50,.32,0],.008);for(let i=0;i<4;i++)mesh('flag',['red','gold','blue','cream'][i],i*.12,.29-i*.025,0,.1,.16,.2);}else mesh('flag','red',.012,.34,0,.32,.34,.3);return group;}
  // Hanging decorations pivot at the rail, with the entire ornament below the rope.
  const loop=ring('wood',0,-.045,0,.030);loop.scale.y*=1.25;rod('wood',[0,-.075,0],[0,-.11,0],.012);
  const ropeCount=group.children.length;
  if(id==='dolphin-charm'||id==='pink-dolphin')dolphin(id==='pink-dolphin'?'pink':'blue');
  else if(id==='whale-tail'){mesh('tail','navy',0,-.25,0,.85,.9,1);mesh('frustum','navy',0,.12,.045,.12,.58,.10);}
  else if(id==='shooting-stars'){for(const [x,y,c,r] of [[0,.2,'gold',.45],[.4,-.3,'blue',.30],[-.15,-.55,'pink',.27]])mesh('star',c,x,y,0,r,r,1);}
  else if(id==='aurora-crystal'){mesh('cone','purple',0,.34,0,.38,.6,.27);mesh('cone','cyan',0,-.22,0,.38,.6,.27).rotation.z=Math.PI;}
  else if(id==='bottle')bottle();
  else if(id==='shell'){mesh('shell','cream',0,0,0,.75,.7,1);for(const x of [-.48,-.24,0,.24,.48])rod('white',[0,-.45,.17],[x,.53-Math.abs(x)*.18,.17],.03);}
  else if(id==='rain-cloud'){for(const x of [-.4,0,.4])mesh('ball','gray',x,.2,0,.35,.30,.24);for(const x of [-.35,.1,.4]){mesh('ball','blue',x,-.35,0,.10,.17,.08);rod('cream',[x,-.03,0],[x,-.23,0],.012);}}
  else if(id==='lantern'){mesh('frustum','gold',0,0,0,.34,.70,.28);mesh('cylinder','dark',0,-.39,0,.36,.10,.30);mesh('cone','dark',0,.43,0,.45,.28,.38);for(const x of [-.27,.27])rod('dark',[x,-.34,.19],[x,.31,.19],.028);ring('wood',0,.65,0,.11);}
  else if(id==='fenders'){for(const [x,c] of [[-.3,'red'],[.3,'mint']]){mesh('ball','cream',x,0,0,.20,.50,.20);mesh('cylinder',c,x,.07,0,.205,.16,.205);rod('wood',[x,.48,0],[0,.65,0],.03);}}
  // Normalize only the ornament, not the rope; keeps every charm below its hook.
  const ornamentGroup=new THREE.Group();ornamentGroup.name='pendant';for(const child of group.children.slice(ropeCount))ornamentGroup.add(child);
  const bounds=new THREE.Box3().setFromObject(ornamentGroup),size=bounds.getSize(new THREE.Vector3());const scale=Math.min(.31/size.x,.30/size.y,.18/size.z);ornamentGroup.scale.setScalar(scale);ornamentGroup.position.set(-(bounds.min.x+bounds.max.x)*.5*scale,-.105-bounds.max.y*scale,0);group.add(ornamentGroup);return group;
 }
 function apply(value){const next=sanitizeAccessories(value);for(const [slot,id] of Object.entries(next)){
  if(slot==='nameplate'||current[slot]===id)continue;const mount=mounts[slot];mount.clear();if(id){if(slot==='lifering'){for(const side of [-1,1]){const fitting=make(id,slot);fitting.userData.side=side;fitting.position.x=side*mount.userData.sideOffset;fitting.rotation.y=side*Math.PI/2;mount.add(fitting);}}else mount.add(make(id,slot));}
 }current=next;}
 return {apply,animate(dt){time+=dt;const charm=mounts.charm.children[0];if(charm)charm.rotation.z=Math.sin(time*1.8)*.08;const flag=mounts.flag.children[0];if(flag)flag.rotation.y=Math.PI/2+Math.sin(time*1.5)*.10;for(const slot of ['deck','roof']){const blades=mounts[slot].getObjectByName('windmill-blades');if(blades)blades.rotation.z=time*.65;}}};
}
