import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { route, chooseWeather } from './motion.mjs';

const canvas = document.querySelector('#scene');
function showError(text) { document.querySelector('#loading').hidden=true;const el=document.querySelector('#error');el.hidden=false;el.textContent=text; }
try { start(); } catch (error) { console.error(error);showError('场景未能启动。请使用支持 WebGL 2 的新版浏览器，并开启硬件加速。'); }
function start() {
const scene = new THREE.Scene();scene.fog=new THREE.Fog(0xe8f2f4,55,110);
const renderer = new THREE.WebGLRenderer({canvas,antialias:true,alpha:false});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.18;
const camera=new THREE.PerspectiveCamera(36,innerWidth/innerHeight,.1,150);
const controls=new OrbitControls(camera,canvas);controls.enableDamping=true;controls.dampingFactor=.055;controls.enablePan=false;
controls.minDistance=11;controls.maxDistance=62;controls.minPolarAngle=.2;controls.maxPolarAngle=1.35;controls.target.set(0,.45,0);
function resetView(){camera.position.set(13,15,16).multiplyScalar(Math.max(1,1.02/camera.aspect));controls.target.set(0,.45,0);controls.update();}resetView();
document.querySelector('#reset').addEventListener('click',resetView);
const hemi=new THREE.HemisphereLight(0xe8f9ff,0x859ba9,2.3);scene.add(hemi);
const sun=new THREE.DirectionalLight(0xfff4df,3.2);sun.position.set(-5,12,6);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-10;sun.shadow.camera.right=10;sun.shadow.camera.top=10;sun.shadow.camera.bottom=-10;sun.shadow.normalBias=.04;sun.shadow.bias=-.0003;sun.shadow.radius=4;scene.add(sun);
const fill=new THREE.DirectionalLight(0xa0d5ff,1.2);fill.position.set(6,5,-7);scene.add(fill);
const mat=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.85,flatShading:true,...extra});
const white=mat(0xfffcf2), navy=mat(0x284c65), orange=mat(0xf16c3d), deckMat=mat(0xd5dece), glass=mat(0x418fa5,{roughness:.3}), railMat=mat(0xf5f6e9);
function mesh(geo,material,parent=scene,x=0,y=0,z=0){const obj=new THREE.Mesh(geo,material);obj.position.set(x,y,z);obj.castShadow=true;obj.receiveShadow=true;parent.add(obj);return obj;}
function box(w,h,d,material,parent,x,y,z){return mesh(new THREE.BoxGeometry(w,h,d),material,parent,x,y,z);}
function ball(r,material,parent,x,y,z,detail=0){return mesh(new THREE.IcosahedronGeometry(r,detail),material,parent,x,y,z);}
function rod(a,b,r,material,parent){const v=new THREE.Vector3(...b).sub(new THREE.Vector3(...a));const obj=mesh(new THREE.CylinderGeometry(r,r,v.length(),6),material,parent);obj.position.copy(new THREE.Vector3(...a).add(new THREE.Vector3(...b)).multiplyScalar(.5));obj.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());return obj;}
function boundary(a,scale=1){const co=Math.cos(a),si=Math.sin(a);return [5.8*Math.sign(co)*Math.abs(co)**.43*scale,4.45*Math.sign(si)*Math.abs(si)**.43*scale];}
const sides=[];
function ringHeight(y,a){return y+(y<0&&y>-.96?.045*Math.sin(a*5)+.025*Math.sin(a*9):0);}
function slab(top,bottom,color,scale=1){const pos=[],idx=[];for(let i=0;i<=96;i++){const a=i/96*Math.PI*2;const [x,z]=boundary(a,scale);pos.push(x,ringHeight(top,a),z,x,ringHeight(bottom,a),z);if(i<96){let j=i*2;idx.push(j,j+2,j+1,j+1,j+2,j+3);}}
const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setIndex(idx);geo.computeVertexNormals();const m=mat(color,{side:THREE.DoubleSide});const obj=mesh(geo,m);sides.push(m);return obj;}
slab(-.96,-1.17,0xe9e7d8,1.025);slab(-.62,-.96,0x12628d);slab(-.3,-.62,0x087fab);slab(0,-.3,0x12a6c6);
const capVertices=[0,-.96,0],capIndices=[];for(let i=0;i<=96;i++){const [x,z]=boundary(i/96*Math.PI*2,1.025);capVertices.push(x,-.96,z);if(i<96)capIndices.push(0,i+2,i+1);}const capGeo=new THREE.BufferGeometry();capGeo.setAttribute('position',new THREE.Float32BufferAttribute(capVertices,3));capGeo.setIndex(capIndices);capGeo.computeVertexNormals();mesh(capGeo,sides[0]);
const n=38,m=30,vertices=[],indices=[],colors=[];
for(let j=0;j<=m;j++)for(let i=0;i<=n;i++){let u=i/n*2-1,v=j/m*2-1;const d=(Math.abs(u)**4.65+Math.abs(v)**4.65)**(1/4.65);const f=d?Math.max(Math.abs(u),Math.abs(v))/d:1;vertices.push(u*f*5.8,0,v*f*4.45);}
for(let j=0;j<m;j++)for(let i=0;i<n;i++){const a=j*(n+1)+i;indices.push(a,a+n+1,a+1,a+1,a+n+1,a+n+2);}
let wg=new THREE.BufferGeometry();wg.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));wg.setIndex(indices);wg=wg.toNonIndexed();
const wp=wg.attributes.position;const originals=wp.array.slice();
for(let i=0;i<wp.count;i+=3){const c=new THREE.Color(0x0088b9).lerp(new THREE.Color(0x039dcc),Math.random()).multiplyScalar(.86+Math.random()*.14);for(let k=0;k<3;k++)colors.push(c.r,c.g,c.b);}
wg.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));wg.computeVertexNormals();const waterMat=mat(0xffffff,{vertexColors:true,metalness:.03,roughness:.62});const water=mesh(wg,waterMat);water.castShadow=false;
const floorMat=mat(0xe4edef);const floor=mesh(new THREE.PlaneGeometry(200,200),floorMat,scene,0,-1.38,0);floor.rotation.x=-Math.PI/2;floor.castShadow=false;
// A feathered contact shadow anchors the little world to the tabletop.
const shadowCanvas=document.createElement('canvas');shadowCanvas.width=128;shadowCanvas.height=128;const ctx=shadowCanvas.getContext('2d');const grad=ctx.createRadialGradient(64,64,5,64,64,64);grad.addColorStop(0,'rgba(22,60,77,.26)');grad.addColorStop(.65,'rgba(22,60,77,.12)');grad.addColorStop(1,'rgba(22,60,77,0)');ctx.fillStyle=grad;ctx.fillRect(0,0,128,128);
const shadow=mesh(new THREE.PlaneGeometry(17,13),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false}),scene,0,-1.365,0);shadow.rotation.x=-Math.PI/2;shadow.castShadow=false;
const ship=new THREE.Group();scene.add(ship);
// The hull is built in stacked rings: broad shoulders, a rounded bow and tapered keel.
const outline=[[-.48,-1.15],[-.65,-.75],[-.65,.45],[-.45,.98],[0,1.32],[.45,.98],[.65,.45],[.65,-.75],[.48,-1.15]];
function hull(y0,y1,lower,upper,material){const v=[],ii=[];outline.forEach(([x,z])=>v.push(x*lower,y0,z*lower,x*upper,y1,z*upper));for(let i=0;i<outline.length;i++){const a=i*2,b=((i+1)%outline.length)*2;ii.push(a,b,a+1,b,b+1,a+1);}const center=v.length/3;v.push(0,y1,0);for(let i=0;i<outline.length;i++)ii.push(center,i*2+1,((i+1)%outline.length)*2+1);const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(v,3));g.setIndex(ii);g.computeVertexNormals();return mesh(g,material,ship);}
hull(-.12,.12,.68,.94,navy);hull(.12,.47,.94,1,white);hull(.47,.51,1,.98,deckMat);
box(.89,.68,1.1,white,ship,0,.84,-.15);box(1.03,.1,1.25,white,ship,0,1.23,-.15);box(.65,.25,.72,white,ship,0,1.39,-.14);box(.77,.08,.86,navy,ship,0,1.55,-.14);
for(const side of [-1,1]){for(let i=0;i<3;i++)box(.018,.23,.2,glass,ship,side*.454,.93,-.49+i*.34);box(.018,.17,.49,glass,ship,side*.331,1.39,-.13);for(let i=0;i<4;i++){const p=mesh(new THREE.CylinderGeometry(.066,.066,.025,12),navy,ship,side*.637,.29,-.63+i*.32);p.rotation.z=Math.PI/2;}}
box(.6,.24,.02,glass,ship,0,.96,.407);box(.51,.17,.02,glass,ship,0,1.4,.229);
const chimney=mesh(new THREE.CylinderGeometry(.18,.21,.54,8),orange,ship,0,1.61,-.55);mesh(new THREE.CylinderGeometry(.2,.2,.09,8),navy,ship,0,1.9,-.55);
rod([0,1.55,.25],[0,2.08,.25],.025,railMat,ship);rod([-.26,1.84,.25],[.26,1.84,.25],.022,railMat,ship);
const flag=mesh(new THREE.BoxGeometry(.25,.14,.018),orange,ship,.13,2.01,.25);
for(const side of [-1,1]){for(let i=0;i<6;i++)rod([side*.51,.51,-.96+i*.31],[side*.51,.74,-.96+i*.31],.015,railMat,ship);rod([side*.51,.73,-1],[side*.51,.73,.64],.022,railMat,ship);const ring=mesh(new THREE.TorusGeometry(.14,.043,6,12),orange,ship,side*.49,.94,-.13);ring.rotation.y=Math.PI/2;}
rod([-.51,.73,-1],[.51,.73,-1],.022,railMat,ship);
const lampMat=mat(0xffdf95,{emissive:0xffae43,emissiveIntensity:0});ball(.065,lampMat,ship,0,2.11,.25,1);const shipLight=new THREE.PointLight(0xffbe69,0,4,2);shipLight.position.set(0,1.25,.7);ship.add(shipLight);
const birdMat=mat(0xfaf9ef), wingMat=mat(0xdce8ea,{side:THREE.DoubleSide});const birds=[];
for(let i=0;i<4;i++){const g=new THREE.Group();scene.add(g);const body=ball(.105,birdMat,g,0,0,0,1);body.scale.set(.72,.78,1.85);const beak=mesh(new THREE.ConeGeometry(.035,.13,4),orange,g,0,.01,.22);beak.rotation.x=Math.PI/2;const wings=[];for(const s of [-1,1]){const pivot=new THREE.Group();g.add(pivot);const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute([0,0,.08,s*.3,.035,.035,s*.65,-.08,-.16,s*.3,.035,.035,s*.38,0,-.17,0,0,-.09],3));geo.computeVertexNormals();mesh(geo,wingMat,pivot);wings.push(pivot);}birds.push({g,wings,phase:i*1.8});}
const cloudMat=mat(0xffffff);const clouds=[];
for(let i=0;i<2;i++){const cloud=new THREE.Group();cloud.position.set(i?3.6:-3.7,4.4+i*.5,-2.7);scene.add(cloud);[[0,0,0,.47],[-.5,-.09,0,.36],[.5,-.08,0,.37],[.12,.25,0,.4]].forEach(([x,y,z,r])=>{const p=ball(r,cloudMat,cloud,x,y,z,1);p.scale.z=.65;p.castShadow=false;});clouds.push(cloud);}
const moonGroup=new THREE.Group();moonGroup.position.set(-3.3,4.4,-2.6);scene.add(moonGroup);
const moonShape=new THREE.Shape();moonShape.moveTo(.18,.65);moonShape.bezierCurveTo(-.65,.65,-.88,-.4,-.13,-.68);moonShape.bezierCurveTo(.38,-.85,.81,-.42,.76,-.12);moonShape.bezierCurveTo(.1,-.45,-.22,.25,.18,.65);
const moon=mesh(new THREE.ExtrudeGeometry(moonShape,{depth:.14,bevelEnabled:true,bevelSize:.025,bevelThickness:.025,bevelSegments:1,curveSegments:15}),new THREE.MeshStandardMaterial({color:0xffefbc,emissive:0xffd487,emissiveIntensity:.8,roughness:.7}),moonGroup);moon.rotation.y=.45;
const starMat=new THREE.MeshBasicMaterial({color:0xfff4d9,transparent:true,opacity:0});const stars=[];for(let i=0;i<16;i++){const a=i*2.399;const o=mesh(new THREE.OctahedronGeometry(.035+(i%3)*.012),starMat,scene,Math.cos(a)*(2+i%4),3.3+(i%5)*.44,Math.sin(a)*2.8);o.castShadow=false;stars.push(o);}
const foamGeo=new THREE.IcosahedronGeometry(1,0),foam=[];
for(let i=0;i<200;i++){const material=new THREE.MeshBasicMaterial({color:0xf4ffff,transparent:true,opacity:0,depthWrite:false});const p=mesh(foamGeo,material);p.castShadow=false;p.visible=false;foam.push({p,born:-999,side:0,dx:0,dz:0});}let foamCursor=0,wakeClock=0;
function emitWake(t){const pos=route(t),next=route(t+.08);let dx=next.x-pos.x,dz=next.z-pos.z;const len=Math.hypot(dx,dz);dx/=len;dz/=len;for(const side of [-1,1]){const f=foam[foamCursor++%foam.length];f.born=t;f.side=side;f.dx=dz*side;f.dz=-dx*side;f.p.position.set(pos.x-dx*1.04+dz*side*.34,.06,pos.z-dz*1.04-dx*side*.34);f.p.visible=true;f.p.rotation.y=Math.random()*6;}}
const rainCount=440,rainArray=new Float32Array(rainCount*6),rainMeta=[];for(let i=0;i<rainCount;i++){const x=(Math.random()-.5)*10,z=(Math.random()-.5)*7.3;rainMeta.push({x,z,y:Math.random()*5.2,speed:4+Math.random()*2});}
const rainGeo=new THREE.BufferGeometry();rainGeo.setAttribute('position',new THREE.BufferAttribute(rainArray,3));const rainMat=new THREE.LineBasicMaterial({color:0xd7f4ff,transparent:true,opacity:0,depthWrite:false});const rain=new THREE.LineSegments(rainGeo,rainMat);scene.add(rain);
const ripples=[];for(let i=0;i<24;i++){const r=mesh(new THREE.RingGeometry(.14,.16,18),new THREE.MeshBasicMaterial({color:0xcce7ee,transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false}));r.rotation.x=-Math.PI/2;r.position.set((Math.random()-.5)*9,.06,(Math.random()-.5)*6.8);r.castShadow=false;r.userData.phase=Math.random();ripples.push(r);}
const glints=[];const glintMat=new THREE.MeshBasicMaterial({color:0xbbeaf0,transparent:true,opacity:.4});for(let i=0;i<42;i++){const p=mesh(new THREE.PlaneGeometry(.13+Math.random()*.24,.035),glintMat,scene,(Math.random()-.5)*10,.085,(Math.random()-.5)*7.4);p.rotation.x=-Math.PI/2;p.rotation.z=-.3;p.castShadow=false;glints.push(p);}
const palettes={sunny:{bg:0xe8f2f4,floor:0xe3edef,water:0xffffff,side:[0xe9e7d8,0x12628d,0x087fab,0x12a6c6],sun:3.2,hemi:2.3,night:0,rain:0,cloud:0xffffff},rainy:{bg:0xa2b8c6,floor:0xa9bdc9,water:0x86adbb,side:[0xc1ccd0,0x294e69,0x2c647f,0x428c9d],sun:.85,hemi:1.85,night:0,rain:1,cloud:0x8099ab},night:{bg:0x142239,floor:0x1a2e46,water:0x5275a3,side:[0x748ba3,0x183553,0x225577,0x307c9c],sun:.9,hemi:1.3,night:1,rain:0,cloud:0x607594}};
const state={time:15,weather:'sunny'};let nightMix=0,rainMix=0;scene.background=new THREE.Color(palettes.sunny.bg);
const btns=[...document.querySelectorAll('[data-mode]')];function setWeather(mode){chooseWeather(state,mode);document.body.dataset.weather=state.weather;btns.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===state.weather)));const i=['sunny','rainy','night'].indexOf(state.weather);document.querySelector('#mode-index').textContent=['01','02','03'][i];document.querySelector('#mood').textContent=['晴光，慢慢航行。','雨落，小海轻声。','月色，一盏归航的灯。'][i];document.querySelector('#status').textContent=['已切换晴天','已切换雨天','已切换夜景'][i];}
btns.forEach(b=>b.addEventListener('click',()=>setWeather(b.dataset.mode)));
if(document.modelContext?.registerTool){try{Promise.resolve(document.modelContext.registerTool({name:'set_ocean_weather',title:'切换小海天气',description:'在晴天、雨天和夜景之间切换，保持当前航行进度与视角。',inputSchema:{type:'object',properties:{weather:{type:'string',enum:['sunny','rainy','night']}},required:['weather'],additionalProperties:false},annotations:{readOnlyHint:false},execute(input){if(!input||!['sunny','rainy','night'].includes(input.weather))throw new Error('天气必须为 sunny、rainy 或 night');setWeather(input.weather);return {weather:state.weather};}})).catch(()=>{});}catch{}}
for(let t=state.time-8;t<state.time;t+=.12)emitWake(t);
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();showError('图形上下文暂时丢失，请刷新页面重新打开小海。');});
window.addEventListener('resize',()=>{const oldFit=Math.max(1,1.02/camera.aspect);camera.aspect=innerWidth/innerHeight;camera.position.sub(controls.target).multiplyScalar(Math.max(1,1.02/camera.aspect)/oldFit).add(controls.target);camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
document.addEventListener('visibilitychange',()=>{previous=performance.now();});
const tint=new THREE.Color();let previous=performance.now();
function wave(x,z,t){return .052*Math.sin(x*1.8+z*.8+t*1.2)+.035*Math.cos(z*2.2-x*.5+t*.9);}
function frame(now){requestAnimationFrame(frame);const dt=Math.min((now-previous)/1000,.05);previous=now;if(document.hidden)return;state.time+=dt;const t=state.time,pal=palettes[state.weather],blend=1-Math.exp(-dt*1.8);nightMix=THREE.MathUtils.lerp(nightMix,pal.night,blend);rainMix=THREE.MathUtils.lerp(rainMix,pal.rain,blend);
scene.background.lerp(tint.setHex(pal.bg),blend);scene.fog.color.copy(scene.background);floorMat.color.lerp(tint.setHex(pal.floor),blend);waterMat.color.lerp(tint.setHex(pal.water),blend);sides.forEach((s,i)=>s.color.lerp(tint.setHex(pal.side[i]),blend));cloudMat.color.lerp(tint.setHex(pal.cloud),blend);sun.intensity=THREE.MathUtils.lerp(sun.intensity,pal.sun,blend);hemi.intensity=THREE.MathUtils.lerp(hemi.intensity,pal.hemi,blend);fill.intensity=1.2-nightMix*.65;
for(let i=0;i<wp.count;i++){const x=originals[i*3],z=originals[i*3+2];const edge=Math.max(0,1-(Math.abs(x)/5.8)**8-(Math.abs(z)/4.45)**8);wp.setY(i,wave(x,z,t)*edge*(1+rainMix*.4));}wp.needsUpdate=true;wg.computeVertexNormals();
const pos=route(t),next=route(t+.12);ship.position.set(pos.x,wave(pos.x,pos.z,t)*.7+.05,pos.z);ship.rotation.set(.024*Math.sin(t*1.5),Math.atan2(next.x-pos.x,next.z-pos.z),.025*Math.sin(t*.8));flag.rotation.y=Math.sin(t*4)*.12;
wakeClock+=dt;if(wakeClock>.1){emitWake(t);wakeClock=0;}for(const f of foam){const age=t-f.born;if(age>8){f.p.visible=false;continue;}f.p.position.x+=f.dx*dt*.065;f.p.position.z+=f.dz*dt*.065;f.p.position.y=.045+wave(f.p.position.x,f.p.position.z,t)*.6;const size=(.10+Math.min(age,3)*.035)*Math.max(.1,1-age/9);f.p.scale.set(size*(1+age*.25),.025,size*.8);f.p.material.opacity=Math.max(0,.8*(1-age/8));}
birds.forEach(({g,wings,phase},i)=>{const a=t*.22+phase;g.position.set(pos.x*.34+Math.sin(a)*(1.4+i*.25),2.5+i*.34+Math.sin(t*.7+phase)*.25-rainMix*.5,pos.z*.25+Math.cos(a)*(1+i*.25));g.rotation.y=a+Math.PI/2;g.rotation.z=Math.sin(a)*.1;wings[0].rotation.z=Math.sin(t*3.7+phase)*.32;wings[1].rotation.z=-Math.sin(t*3.7+phase)*.32;g.scale.setScalar(1-nightMix*.2);});
clouds.forEach((c,i)=>{c.scale.setScalar(Math.max(.001,1-nightMix));c.position.y=4.4+i*.5+Math.sin(t*.35+i)*.08;});moonGroup.scale.setScalar(Math.max(.001,nightMix));moonGroup.rotation.y=Math.sin(t*.12)*.1;starMat.opacity=nightMix*.8;stars.forEach((s,i)=>s.scale.setScalar(.7+Math.sin(t*1.2+i)*.3));
glass.color.lerp(tint.setHex(nightMix>.3?0xffd68b:0x418fa5),blend);glass.emissive.setHex(0xffb642);glass.emissiveIntensity=nightMix*1.2;lampMat.emissiveIntensity=nightMix*2;shipLight.intensity=nightMix*3.5;
rainMat.opacity=rainMix*.55;rain.visible=rainMix>.005;for(let i=0;i<rainCount;i++){const r=rainMeta[i];r.y-=dt*r.speed;if(r.y<.1)r.y=5.2;const k=i*6;rainArray[k]=r.x;rainArray[k+1]=r.y;rainArray[k+2]=r.z;rainArray[k+3]=r.x-.045;rainArray[k+4]=r.y+.19;rainArray[k+5]=r.z;}rainGeo.attributes.position.needsUpdate=true;
ripples.forEach(r=>{const a=(t*.65+r.userData.phase)%1;r.scale.setScalar(.2+a*1.5);r.material.opacity=rainMix*(1-a)*.4;});glintMat.opacity=.35-nightMix*.2;glints.forEach((g,i)=>{g.position.y=.07+wave(g.position.x,g.position.z,t);g.scale.x=.7+Math.sin(t+i)*.3;});
controls.update();renderer.render(scene,camera);
}
requestAnimationFrame(frame);document.querySelector('#loading').hidden=true;
}
