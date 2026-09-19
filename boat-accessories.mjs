import * as THREE from 'three';

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
 const palette={cream:'#fff0d4',white:'#eeeae0',blue:'#71a9c9',navy:'#365771',pink:'#ed9eb8',gold:'#f7cc70',wood:'#b68b5f',dark:'#48494d',mint:'#90b999',green:'#658d5a',purple:'#b79adc',cyan:'#86d7d3',red:'#e67d67',orange:'#dc9155',glass:'#aad9df',gray:'#b6c2cb'};
 const mats=Object.fromEntries(Object.entries(palette).map(([id,color])=>[id,new THREE.MeshStandardMaterial({color,roughness:.83,flatShading:true})]));
 mats.glass.transparent=true;mats.glass.opacity=.34;mats.glass.depthWrite=false;mats.gold.emissive.set('#ffd17c');mats.gold.emissiveIntensity=.18;
 const shape=(points)=>{const s=new THREE.Shape();points.forEach(([x,y],i)=>i?s.lineTo(x,y):s.moveTo(x,y));s.closePath();return new THREE.ExtrudeGeometry(s,{depth:.12,bevelEnabled:false});};
 const starPoints=Array.from({length:10},(_,i)=>{const a=i*Math.PI/5+Math.PI/2,r=i%2?.42:1;return [Math.cos(a)*r,Math.sin(a)*r];});
 const geo={box:new THREE.BoxGeometry(1,1,1),ball:new THREE.IcosahedronGeometry(1,1),cylinder:new THREE.CylinderGeometry(1,1,1,10),cone:new THREE.ConeGeometry(1,1,6),torus:new THREE.TorusGeometry(1,.22,6,16),star:shape(starPoints),fin:shape([[-.6,0],[.3,.8],[.6,-.1]]),flag:shape([[0,.5],[1,.23],[.9,-.15],[0,-.1]]),shell:shape([[0,-.7],[-.9,.1],[-.7,.7],[0,1],[.7,.7],[.9,.1]]),wave:shape([[-1,-.5],[-.8,.3],[-.2,.7],[.3,.6],[.2,.1],[.6,-.1],[1,.25],[.8,-.5]])};
 let group,current={},time=0;
 function mesh(kind,color,x=0,y=0,z=0,sx=1,sy=sx,sz=sx){const m=new THREE.Mesh(geo[kind],typeof color==='string'?mats[color]:color);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;group.add(m);return m;}
 const box=(color,x,y,z,w,h,d)=>mesh('box',color,x,y,z,w,h,d);
 function rod(color,a,b,r=.045){const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),delta=end.clone().sub(start);const m=mesh('cylinder',color,...start.add(end).multiplyScalar(.5).toArray(),r,delta.length(),r);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return m;}
 function ring(color,x,y,z,r=.6){return mesh('torus',color,x,y,z,r,r,r);}
 function dolphin(color='blue',whale=false){
  mesh('ball',color,-.15,0,0,.73,.34,.3);mesh('ball','cream',-.15,-.12,.10,.57,.17,.23);mesh('ball',color,-.83,-.025,0,whale?.16:.29,.12,.16);
  mesh('fin',color,-.12,.23,-.07,.33,.45,.5);mesh('fin',color,-.12,-.13,.23,.29,.25,.6).rotation.z=Math.PI;
  mesh('fin',color,.64,-.01,0,.42,.4,.8).rotation.z=-.6;mesh('fin',color,.72,-.02,-.12,.34,.32,.8).rotation.z=2;
  mesh('ball','navy',-.62,.05,.255,.04);if(whale)rod('cream',[-.48,.31,0],[-.48,.6,0],.03);
 }
 function gull(){mesh('ball','white',0,.09,0,.38,.27,.24);mesh('ball','white',-.25,.32,0,.20);mesh('cone','gold',-.49,.3,0,.09,.24,.09).rotation.z=Math.PI/2;mesh('fin','gray',.18,.15,.17,.50,.3,1).rotation.z=-.4;mesh('ball','navy',-.31,.37,.18,.035);for(const x of [-.12,.13])rod('orange',[x,-.15,0],[x,-.36,0],.028);}
 function bottle(){mesh('cylinder','glass',0,0,0,.46,.95,.32);mesh('cylinder','cyan',0,-.45,0,.46,.10,.32);mesh('cylinder','glass',0,.57,0,.22,.23,.20);mesh('cylinder','wood',0,.72,0,.25,.16,.23);mesh('star','gold',0,0,.33,.25,.25,.3);}
 function emblem(id){
  if(id==='lifering'){ring('cream',0,0,0,.75);for(let i=0;i<4;i++){const a=i*Math.PI/2;const m=box('red',Math.sin(a)*.74,Math.cos(a)*.74,.02,.36,.32,.20);m.rotation.z=-a;}return;}
  if(id==='wheel'){ring('wood',0,0,0,.62);mesh('cylinder','wood',0,0,0,.20,.16,.20).rotation.x=Math.PI/2;for(let i=0;i<8;i++){const a=i*Math.PI/4;rod('wood',[0,0,0],[Math.sin(a)*.92,Math.cos(a)*.92,0],.055);}return;}
  if(id==='whale-emblem'){dolphin('blue',true);return;}if(id==='star'){mesh('star','gold',0,0,0,.86,.86,1);return;}
  if(id==='sunset'){mesh('ball','gold',0,.2,0,.7,.7,.15);mesh('ball','orange',0,.1,.13,.45,.45,.13);box('cream',0,-.12,.25,1.55,.13,.14);mesh('wave','blue',0,-.37,.18,.77,.36,1);return;}
  if(id==='gull-emblem'){gull();mesh('fin','white',.35,.3,0,.8,.6,1).rotation.z=-.4;return;}
  if(id==='snowflake'){for(let i=0;i<6;i++){const a=i*Math.PI/3,dir=[Math.sin(a),Math.cos(a)];rod('cyan',[0,0,0],[dir[0]*.85,dir[1]*.85,0]);for(const sign of [-1,1])rod('cyan',[dir[0]*.48,dir[1]*.48,0],[dir[0]*.63+dir[1]*sign*.23,dir[1]*.63-dir[0]*sign*.23,0],.035);}return;}
  if(id==='wave'){mesh('wave','blue',0,0,0,.88,.9,1);mesh('wave','cyan',0,-.22,.13,.72,.52,1);return;}
  ring('blue',0,.7,0,.18);rod('navy',[0,.5,0],[0,-.75,0],.075);rod('blue',[-.45,.25,0],[.45,.25,0],.065);rod('navy',[-.72,-.28,0],[0,-.75,0],.08);rod('navy',[0,-.75,0],[.72,-.28,0],.08);for(const sign of [-1,1])mesh('fin','navy',sign*.64,-.27,0,.34,.35,1).rotation.z=sign*.5;
 }
 function ornament(id){
  if(id==='polar-bear'){mesh('ball','cream',0,.40,0,.43,.58,.34);mesh('ball','cream',0,1,.05,.38,.33,.34);for(const x of [-.29,.29]){mesh('ball','cream',x,1.24,0,.13);mesh('ball','cream',x,.10,.2,.19,.12,.25);mesh('ball','dark',x*.52,1.05,.33,.035);}mesh('ball','white',0,.96,.35,.20,.12,.12);mesh('ball','dark',0,1,.45,.065);return;}
  if(id==='lighthouse'||id==='roof-lamp'){mesh('cylinder','cream',0,.55,0,.27,1.1,.27);for(const y of [.2,.65])mesh('cylinder','red',0,y,0,.29,.12,.29);mesh('cylinder','gold',0,1.13,0,.30,.27,.30);mesh('cone','red',0,1.39,0,.40,.3,.4);box('navy',0,.40,.275,.12,.24,.025);return;}
  if(id==='aurora-globe'||id==='snow-globe'){mesh('cylinder','navy',0,.10,0,.43,.20,.43);mesh('ball','glass',0,.69,0,.57);if(id==='snow-globe'){for(const [y,r] of [[.45,.32],[.68,.24],[.88,.16]])mesh('cone','mint',0,y,0,r,.42,r);for(const [x,y] of [[-.3,.65],[.26,.91],[.3,.48]])mesh('ball','white',x,y,.15,.045);}else{mesh('ball','cyan',0,.67,0,.33,.40,.29);mesh('star','purple',0,.72,.33,.28,.3,1);}return;}
  if(id==='glow-bottle'){bottle();group.children.forEach(o=>o.position.y+=.6);return;}
  if(id==='seabird'){gull();group.children.forEach(o=>o.position.y+=.4);return;}
  if(id==='whale'){mesh('cylinder','navy',0,.10,0,.42,.20,.32);const start=group.children.length;dolphin('blue',true);group.children.slice(start).forEach(o=>o.position.y+=.62);return;}
  if(id==='memory-flag'){mesh('cylinder','cream',0,.09,0,.29,.18,.29);rod('wood',[0,.1,0],[0,1.35,0],.035);mesh('flag','blue',0,1.05,0,.57,.55,1);return;}
  if(id==='luggage'){for(const [x,y,z,c,w,h,d] of [[0,.22,0,'wood',.95,.4,.6],[.12,.62,0,'orange',.62,.38,.48]]){box(c,x,y,z,w,h,d);for(const offset of [-.25,.25])box('navy',x+offset*w,y,z+.01,.055,h+.015,d+.025);ring('wood',x,y+h/2+.07,0,.1);}return;}
  if(id==='canopy'){for(const x of [-.65,.65])for(const z of [-.45,.45])rod('wood',[x,0,z],[x,1.1,z],.045);box('wood',0,.07,0,1.5,.14,1.05);for(let i=0;i<5;i++){const x=-.6+i*.3;const m=box(i%2?'cream':'blue',x,1.15,0,.3,.14,1.2);m.rotation.z=x*.22;}return;}
  if(id==='windmill'){mesh('cone','cream',0,.45,0,.4,.9,.35);const blades=new THREE.Group();blades.name='windmill-blades';blades.position.set(0,.9,.25);group.add(blades);const parent=group;group=blades;for(let i=0;i<4;i++){const a=i*Math.PI/2,m=box('wood',Math.sin(a)*.3,Math.cos(a)*.3,0,.18,.62,.065);m.rotation.z=-a+.22;}mesh('ball','red',0,0,.05,.12);group=parent;return;}
  if(id==='deck-chair'){for(const x of [-.36,.36]){rod('wood',[x,.07,.48],[x,.78,-.35]);rod('wood',[x,.05,-.4],[x,.45,.35]);}const back=box('cream',0,.59,-.12,.65,.64,.06);back.rotation.x=-.5;const stripe=box('pink',0,.59,-.08,.25,.62,.06);stripe.rotation.x=-.5;box('pink',0,.35,.27,.65,.055,.37);return;}
  if(id==='plant'){box('wood',0,.12,0,1.05,.24,.64);box('dark',0,.25,0,.9,.035,.50);for(let i=0;i<7;i++){const a=i*2.4,x=Math.cos(a)*.25,z=Math.sin(a)*.14,m=mesh('ball',i%2?'green':'mint',x,.60,z,.11,.42,.09);m.rotation.z=x*1.8;}return;}
 }
 function make(id,slot){
  group=new THREE.Group();group.name='accessory-'+id;
  if(slot==='lifering'){emblem(id);group.scale.setScalar(.17);return group;}
  if(slot==='deck'||slot==='roof'){ornament(id);group.scale.setScalar(.21);return group;}
  if(slot==='chimney'){const original=id==='chimney-skin';mesh('cylinder',original?boat.materials.chimney:mats.orange,0,.30,0,.155,.60,.155);mesh('cylinder',original?boat.materials.cap:mats.navy,0,.63,0,.176,.10,.176);return group;}
  if(slot==='flag'){group.rotation.y=Math.PI/2;rod('cream',[0,0,0],[0,.54,0],.016);mesh('ball',boat.materials.lamp,0,.565,0,.044);if(id==='bunting'){rod('wood',[-.02,.42,0],[.50,.32,0],.008);for(let i=0;i<4;i++)mesh('flag',['red','gold','blue','cream'][i],i*.12,.29-i*.025,0,.1,.16,.2);}else mesh('flag','red',.012,.34,0,.32,.34,.3);return group;}
  // Hanging decorations pivot at the rail, with the entire ornament below the rope.
  const loop=ring('wood',0,-.13,0,.08);loop.scale.y*=1.6;rod('wood',[0,-.2,0],[0,-.31,0],.022);
  const ropeCount=group.children.length;
  if(id==='dolphin-charm'||id==='pink-dolphin')dolphin(id==='pink-dolphin'?'pink':'blue');
  else if(id==='whale-tail'){for(const sign of [-1,1]){const m=mesh('fin','navy',sign*.33,0,0,.8,.75,1);m.rotation.z=sign*-.6;}}
  else if(id==='shooting-stars'){for(const [x,y,c,r] of [[0,.2,'gold',.45],[.4,-.3,'blue',.30],[-.15,-.55,'pink',.27]])mesh('star',c,x,y,0,r,r,1);}
  else if(id==='aurora-crystal'){mesh('cone','purple',0,.34,0,.38,.6,.27);mesh('cone','cyan',0,-.22,0,.38,.6,.27).rotation.z=Math.PI;}
  else if(id==='bottle')bottle();
  else if(id==='shell'){mesh('shell','cream',0,0,0,.75,.7,1);for(const x of [-.4,0,.4])rod('wood',[0,-.45,.14],[x,.5,.14],.018);}
  else if(id==='rain-cloud'){for(const x of [-.4,0,.4])mesh('ball','gray',x,.2,0,.35,.30,.24);for(const x of [-.35,.1,.4]){mesh('ball','blue',x,-.35,0,.10,.17,.08);rod('cream',[x,-.03,0],[x,-.23,0],.012);}}
  else if(id==='lantern'){mesh('cylinder','gold',0,0,0,.35,.70,.30);for(const y of [-.4,.4])mesh('cone','dark',0,y,0,.47,.24,.40);for(const x of [-.33,.33])rod('dark',[x,-.33,0],[x,.33,0],.028);}
  else if(id==='fenders'){for(const [x,c] of [[-.3,'red'],[.3,'mint']]){mesh('ball','cream',x,0,0,.20,.50,.20);mesh('cylinder',c,x,.07,0,.205,.16,.205);rod('wood',[x,.48,0],[0,.65,0],.03);}}
  // Normalize only the ornament, not the rope; keeps every charm below its hook.
  for(const child of group.children.slice(ropeCount)){child.position.multiplyScalar(.18);child.position.y-=.43;child.scale.multiplyScalar(.18);}group.scale.setScalar(.75);return group;
 }
 function apply(value){const next=sanitizeAccessories(value);for(const [slot,id] of Object.entries(next)){
  if(slot==='nameplate'||current[slot]===id)continue;const mount=mounts[slot];mount.clear();if(id){if(slot==='lifering'){for(const side of [-1,1]){const fitting=make(id,slot);fitting.userData.side=side;fitting.position.x=side*mount.userData.sideOffset;fitting.rotation.y=side*Math.PI/2;mount.add(fitting);}}else mount.add(make(id,slot));}
 }current=next;}
 return {apply,animate(dt){time+=dt;const charm=mounts.charm.children[0];if(charm)charm.rotation.z=Math.sin(time*1.8)*.08;const flag=mounts.flag.children[0];if(flag)flag.rotation.y=Math.PI/2+Math.sin(time*1.5)*.10;for(const slot of ['deck','roof']){const blades=mounts[slot].getObjectByName('windmill-blades');if(blades)blades.rotation.z=time*.65;}}};
}
