import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { route, chooseWeather, seaHeight, advanceWeather, weatherEvents, WEATHER_ORDER } from './motion.mjs';
import { createAmbientAudio } from './ambient-audio.mjs';
import { createVoyageEffects } from './scene-effects.mjs';

const canvas = document.querySelector('#scene');
function showError(text) { document.querySelector('#loading').hidden=true;const el=document.querySelector('#error');el.hidden=false;el.textContent=text; }
try { start(); } catch (error) { console.error(error);showError('场景未能启动。请使用支持 WebGL 2 的新版浏览器，并开启硬件加速。'); }
function start() {
const scene = new THREE.Scene();scene.fog=new THREE.Fog(0xc5d4b8,55,110);
const soundButton=document.querySelector('#sound');
function updateSoundButton(active){soundButton.setAttribute('aria-pressed',String(active));soundButton.setAttribute('aria-label',active?'关闭环境音':'开启环境音');soundButton.querySelector('span').textContent=active?'声音开':'听海';document.querySelector('#volume-control').hidden=!active;}
const ambience=createAmbientAudio(updateSoundButton);
document.querySelector('#volume').addEventListener('input',e=>ambience.setVolume(Number(e.target.value)/100));
const localTime=document.querySelector('#local-time');
function updateClock(){const date=new Date();localTime.textContent=date.toLocaleTimeString('zh-CN',{hour12:false});localTime.dateTime=date.toISOString();}updateClock();setInterval(updateClock,1000);
soundButton.addEventListener('click',async()=>{soundButton.disabled=true;try{const active=await ambience.setEnabled(!ambience.enabled);document.querySelector('#status').textContent=active?'环境音已开启':'环境音已关闭';}catch(error){console.warn(error);document.querySelector('#status').textContent='环境音暂时无法开启，请再次点击重试';}finally{soundButton.disabled=false;}});
const renderer = new THREE.WebGLRenderer({canvas,antialias:true,alpha:false});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
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
const n=96,m=76,vertices=[],indices=[];
for(let j=0;j<=m;j++)for(let i=0;i<=n;i++){let u=i/n*2-1,v=j/m*2-1;const d=(Math.abs(u)**4.65+Math.abs(v)**4.65)**(1/4.65);const f=d?Math.max(Math.abs(u),Math.abs(v))/d:1;vertices.push(u*f*5.8,0,v*f*4.45);}
for(let j=0;j<m;j++)for(let i=0;i<n;i++){const a=j*(n+1)+i;indices.push(a,a+n+1,a+1,a+1,a+n+1,a+n+2);}
const wg=new THREE.BufferGeometry();wg.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));wg.setIndex(indices);
const wp=wg.attributes.position;const originals=wp.array.slice();
wg.computeVertexNormals();const waterMat=new THREE.MeshLambertMaterial({color:0x367f99});const waterTime={value:15};
waterMat.onBeforeCompile=shader=>{shader.uniforms.uSeaTime=waterTime;shader.vertexShader='varying vec3 vSeaPosition;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvSeaPosition=position;');shader.fragmentShader='uniform float uSeaTime;\nvarying vec3 vSeaPosition;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
  vec2 sea=vSeaPosition.xz;
  float phase=sea.x*.7+sea.y*1.65-uSeaTime*1.05;
  float swellTone=.94+.085*sin(phase)+.035*sin(sea.x*1.6-sea.y*.65-uSeaTime*.72);
  float grain=sin(sea.x*67.+sin(sea.y*49.))*sin(sea.y*83.+sea.x*13.);
  float ripples=sin(sea.x*18.+sea.y*25.-uSeaTime*.7)*sin(sea.x*9.-sea.y*21.);
  diffuseColor.rgb*=swellTone+grain*.018+ripples*.022;
`);};
const water=mesh(wg,waterMat);water.castShadow=false;
const floorMat=mat(0x9fb68c);const floor=mesh(new THREE.PlaneGeometry(200,200),floorMat,scene,0,-1.38,0);floor.rotation.x=-Math.PI/2;floor.castShadow=false;
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
const wingMat=mat(0xf9fbf5,{side:THREE.DoubleSide});const wingTipMat=mat(0xb0c1c6,{side:THREE.DoubleSide});const birds=[];
for(let i=0;i<4;i++){
 const g=new THREE.Group();scene.add(g);const body=ball(.105,white,g,0,0,0);body.scale.set(.62,.68,1.8);const head=ball(.065,white,g,0,.065,.155);const wings=[];
 for(const side of [-1,1]){const pivot=new THREE.Group();g.add(pivot);
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute([0,0,.1,side*.29,.14,.02,side*.57,.04,-.16,0,0,.1,side*.57,.04,-.16,side*.18,.01,-.12],3));geo.computeVertexNormals();mesh(geo,wingMat,pivot).castShadow=false;
 const tip=new THREE.BufferGeometry();tip.setAttribute('position',new THREE.Float32BufferAttribute([side*.43,.08,-.065,side*.57,.04,-.16,side*.32,.02,-.135],3));tip.computeVertexNormals();mesh(tip,wingTipMat,pivot).castShadow=false;wings.push(pivot);}
 birds.push({g,wings,phase:i*1.8});
}
const cloudMat=mat(0xffffff,{flatShading:false,roughness:1});const clouds=[];
for(let i=0;i<3;i++){const cloud=new THREE.Group();cloud.position.set(i===0?-3.7:i===1?3.6:.2,4.4+i*.3,-2.7-i*.4);scene.add(cloud);[[0,0,0,.47],[-.5,-.09,0,.36],[.5,-.08,0,.37],[.12,.25,0,.4]].forEach(([x,y,z,r])=>{const p=mesh(new THREE.SphereGeometry(r,24,16),cloudMat,cloud,x,y,z);p.scale.z=.65;p.castShadow=false;});clouds.push(cloud);}
const moonGroup=new THREE.Group();moonGroup.position.set(-3.3,4.4,-2.6);scene.add(moonGroup);
const moonShape=new THREE.Shape();moonShape.moveTo(.18,.65);moonShape.bezierCurveTo(-.65,.65,-.88,-.4,-.13,-.68);moonShape.bezierCurveTo(.38,-.85,.81,-.42,.76,-.12);moonShape.bezierCurveTo(.1,-.45,-.22,.25,.18,.65);
const moon=mesh(new THREE.ExtrudeGeometry(moonShape,{depth:.14,bevelEnabled:true,bevelSize:.025,bevelThickness:.025,bevelSegments:1,curveSegments:15}),new THREE.MeshStandardMaterial({color:0xffefbc,emissive:0xffd487,emissiveIntensity:.8,roughness:.7}),moonGroup);moon.rotation.y=.45;
const effects=createVoyageEffects(scene);
const foamGeo=new THREE.IcosahedronGeometry(1,0),foam=[];
for(let i=0;i<200;i++){const material=new THREE.MeshBasicMaterial({color:0xf4ffff,transparent:true,opacity:0,depthWrite:false});const p=mesh(foamGeo,material);p.castShadow=false;p.visible=false;foam.push({p,born:-999,side:0,dx:0,dz:0});}let foamCursor=0,wakeClock=0;
function emitWake(t){const pos=route(t),next=route(t+.08);let dx=next.x-pos.x,dz=next.z-pos.z;const len=Math.hypot(dx,dz);dx/=len;dz/=len;for(const side of [-1,1]){const f=foam[foamCursor++%foam.length];f.born=t;f.side=side;f.dx=dz*side;f.dz=-dx*side;f.p.position.set(pos.x-dx*1.04+dz*side*.34,.06,pos.z-dz*1.04-dx*side*.34);f.p.visible=true;f.p.rotation.y=Math.random()*6;}}
const rainCount=1100,rainArray=new Float32Array(rainCount*6),rainMeta=[];for(let i=0;i<rainCount;i++){const x=(Math.random()-.5)*10,z=(Math.random()-.5)*7.3;rainMeta.push({x,z,y:Math.random()*5.2,speed:4+Math.random()*2});}
const rainGeo=new THREE.BufferGeometry();rainGeo.setAttribute('position',new THREE.BufferAttribute(rainArray,3));const rainMat=new THREE.LineBasicMaterial({color:0xd7f4ff,transparent:true,opacity:0,depthWrite:false});const rain=new THREE.LineSegments(rainGeo,rainMat);scene.add(rain);
const ripples=[];for(let i=0;i<24;i++){const r=mesh(new THREE.RingGeometry(.14,.16,18),new THREE.MeshBasicMaterial({color:0xcce7ee,transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false}));r.rotation.x=-Math.PI/2;r.position.set((Math.random()-.5)*9,.06,(Math.random()-.5)*6.8);r.castShadow=false;r.userData.phase=Math.random();ripples.push(r);}
const palettes={
 sunny:{bg:0xf0f0ea,floor:0xe6e8e3,water:0x337e9b,side:[0xe8e5d9,0x245a78,0x327d94,0x4a9aa8],sun:2.25,hemi:2,night:0,rain:0,cloud:0xffffff,light:0xfff5e2},
 rainy:{bg:0xc1c9d0,floor:0xadb9c2,water:0x37697e,side:[0xc1c8c9,0x2d4f67,0x3b6b7f,0x56818c],sun:.7,hemi:1.7,night:0,rain:.32,cloud:0xa1aab5,light:0xcbd9ed},
 storm:{bg:0x66717f,floor:0x576575,water:0x2b526d,side:[0x8999a9,0x203b57,0x305774,0x47718a],sun:.45,hemi:1.4,night:0,rain:1,cloud:0x69778a,light:0xb9c9e4},
 dusk:{bg:0xead8ca,floor:0xe6d5c4,water:0x467e9a,side:[0xd5bca0,0x425568,0x557887,0x779396],sun:2.4,hemi:1.7,night:0,rain:0,cloud:0xffe4c3,light:0xffc17c},
 night:{bg:0x101722,floor:0x111c2a,water:0x193b58,side:[0x697689,0x152e49,0x234866,0x37627c],sun:.65,hemi:1.1,night:1,rain:0,cloud:0x445266,light:0x9ebce9}
};
const state={time:15,weather:'sunny',elapsed:0};let nightMix=0,rainMix=0,duskMix=0,events=weatherEvents('sunny');scene.background=new THREE.Color(palettes.sunny.bg);
const countdown=document.querySelector('#countdown');const btns=[...document.querySelectorAll('[data-mode]')];
function applyWeather(){
 events=weatherEvents(state.weather);ambience.setWeather(state.weather);document.body.dataset.weather=state.weather;
 btns.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===state.weather)));
 const i=WEATHER_ORDER.indexOf(state.weather);document.querySelector('#mode-index').textContent=String(i+1).padStart(2,'0');
 document.querySelector('#mood').textContent=['晴光，与海豚同行。','细雨，落在蓝色的海。','远雷，潮水起伏。','日落，海面染上金色。','星光，等一场偶遇。'][i];
 document.querySelector('#status').textContent=['已切换晴天','已切换小雨','已切换暴雨','已切换黄昏','已切换夜景'][i];
}
function setWeather(mode){if(!WEATHER_ORDER.includes(mode))return;chooseWeather(state,mode);applyWeather();}
btns.forEach(b=>b.addEventListener('click',()=>setWeather(b.dataset.mode)));
if(document.modelContext?.registerTool){
 const register=tool=>{try{Promise.resolve(document.modelContext.registerTool(tool)).catch(()=>{});}catch{}};
 register({name:'set_ocean_weather',title:'切换小海天气',description:'切换晴天、小雨、暴雨、黄昏或夜景。重启约60秒天气计时，保持航线和视角。',inputSchema:{type:'object',properties:{weather:{type:'string',enum:WEATHER_ORDER}},required:['weather'],additionalProperties:false},annotations:{readOnlyHint:false},execute(input){if(!WEATHER_ORDER.includes(input?.weather))throw new Error('无效天气');setWeather(input.weather);return {weather:state.weather};}});
 register({name:'get_ocean_state',title:'查看航行状态',description:'查看天气、航行时间、下次天气变化和环境音状态。',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute(){return {weather:state.weather,voyageSeconds:state.time,weatherSeconds:state.elapsed,nextWeatherIn:Math.ceil(60-state.elapsed),audioEnabled:ambience.enabled,recordingsLoaded:ambience.loaded};}});
}
applyWeather();
for(let t=state.time-8;t<state.time;t+=.12)emitWake(t);
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();showError('图形上下文暂时丢失，请刷新页面重新打开小海。');});
window.addEventListener('resize',()=>{const oldFit=Math.max(1,1.02/camera.aspect);camera.aspect=innerWidth/innerHeight;camera.position.sub(controls.target).multiplyScalar(Math.max(1,1.02/camera.aspect)/oldFit).add(controls.target);camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
document.addEventListener('visibilitychange',()=>{previous=performance.now();ambience.setVisible(!document.hidden);});
const tint=new THREE.Color();let previous=performance.now();
function wave(x,z,t){return seaHeight(x,z,t,rainMix);}
function frame(now){requestAnimationFrame(frame);const dt=Math.min((now-previous)/1000,.05);previous=now;if(document.hidden)return;state.time+=dt;if(advanceWeather(state,dt))applyWeather();countdown.textContent=String(Math.ceil(60-state.elapsed)).padStart(2,'0');const t=state.time,pal=palettes[state.weather],blend=1-Math.exp(-dt*1.8);nightMix=THREE.MathUtils.lerp(nightMix,pal.night,blend);rainMix=THREE.MathUtils.lerp(rainMix,pal.rain,blend);duskMix=THREE.MathUtils.lerp(duskMix,state.weather==='dusk'?1:0,blend);
sun.color.lerp(tint.setHex(pal.light),blend);sun.position.set(-7,12-duskMix*8,6);hemi.color.lerp(tint.setHex(state.weather==='dusk'?0xffecd7:0xe1eeff),blend);
if(state.elapsed>=events.lightningAt){effects.lightning();ambience.thunder();events.lightningAt=state.weather==='storm'?state.elapsed+16+Math.random()*15:Infinity;}
effects.update({...state,events,nightMix,dt,wave,cameraYaw:Math.atan2(camera.position.x,camera.position.z)});
scene.background.lerp(tint.setHex(pal.bg),blend);scene.fog.color.copy(scene.background);floorMat.color.lerp(tint.setHex(pal.floor),blend);waterMat.color.lerp(tint.setHex(pal.water),blend);sides.forEach((s,i)=>s.color.lerp(tint.setHex(pal.side[i]),blend));cloudMat.color.lerp(tint.setHex(pal.cloud),blend);sun.intensity=THREE.MathUtils.lerp(sun.intensity,pal.sun,blend);hemi.intensity=THREE.MathUtils.lerp(hemi.intensity,pal.hemi,blend);fill.intensity=1.1-nightMix*.55-duskMix*.55;
waterTime.value=t;for(let i=0;i<wp.count;i++){const x=originals[i*3],z=originals[i*3+2];wp.setY(i,wave(x,z,t));}wp.needsUpdate=true;wg.computeVertexNormals();
const pos=route(t),next=route(t+.12),heading=Math.atan2(next.x-pos.x,next.z-pos.z);const dx=Math.sin(heading),dz=Math.cos(heading);ship.position.set(pos.x,wave(pos.x,pos.z,t)+.05,pos.z);ship.rotation.set((wave(pos.x-dx*.6,pos.z-dz*.6,t)-wave(pos.x+dx*.6,pos.z+dz*.6,t))*.42,heading,(wave(pos.x+dz*.3,pos.z-dx*.3,t)-wave(pos.x-dz*.3,pos.z+dx*.3,t))*.45);flag.rotation.y=Math.sin(t*4)*.12;
wakeClock+=dt;if(wakeClock>.1){emitWake(t);wakeClock=0;}for(const f of foam){const age=t-f.born;if(age>8){f.p.visible=false;continue;}f.p.position.x+=f.dx*dt*.065;f.p.position.z+=f.dz*dt*.065;f.p.position.y=.035+wave(f.p.position.x,f.p.position.z,t);const size=(.10+Math.min(age,3)*.035)*Math.max(.1,1-age/9);f.p.scale.set(size*(1+age*.25),.025,size*.8);f.p.material.opacity=Math.max(0,.8*(1-age/8));}
birds.forEach(({g,wings,phase},i)=>{const a=t*.18+phase;g.position.set(pos.x*.34+Math.sin(a)*(1.4+i*.25),2.5+i*.34+Math.sin(t*.7+phase)*.25-rainMix*.5,pos.z*.25+Math.cos(a)*(1+i*.25));g.rotation.y=a+Math.PI/2;g.rotation.z=Math.sin(a)*.1;wings[0].rotation.z=Math.sin(t*2.4+phase)*.18;wings[1].rotation.z=-Math.sin(t*2.4+phase)*.18;g.scale.setScalar(1-nightMix*.2);});
clouds.forEach((c,i)=>{c.scale.setScalar(Math.max(.001,1-nightMix)*(1+rainMix*.35));c.position.y=4.4+i*.3+Math.sin(t*.22+i)*.08;c.position.x=(i===0?-3.7:i===1?3.6:.2)+Math.sin(t*.045+i)*.3;});moonGroup.scale.setScalar(Math.max(.001,nightMix));moonGroup.rotation.y=Math.sin(t*.12)*.1;
const lampMix=Math.max(nightMix,duskMix*.7,rainMix*.5);
glass.color.lerp(tint.setHex(lampMix>.3?0xffd68b:0x418fa5),blend);glass.emissive.setHex(0xffb642);glass.emissiveIntensity=lampMix*1.2;lampMat.emissiveIntensity=lampMix*2;shipLight.intensity=lampMix*3.5;
rainMat.opacity=Math.min(.48,rainMix*.6);rainGeo.setDrawRange(0,Math.floor(150+rainMix*950)*2);rain.visible=rainMix>.005;for(let i=0;i<rainCount;i++){const r=rainMeta[i];r.y-=dt*r.speed*(.7+rainMix*.9);if(r.y<.1)r.y=5.2;const k=i*6;rainArray[k]=r.x;rainArray[k+1]=r.y;rainArray[k+2]=r.z;rainArray[k+3]=r.x-.025-rainMix*.12;rainArray[k+4]=r.y+.12+rainMix*.18;rainArray[k+5]=r.z;}rainGeo.attributes.position.needsUpdate=true;
 ripples.forEach(r=>{const a=(t*.65+r.userData.phase)%1;r.scale.setScalar(.2+a*1.5);r.material.opacity=rainMix*(1-a)*.4;r.position.y=.025+wave(r.position.x,r.position.z,t);});ambience.tick();
controls.update();renderer.render(scene,camera);
}
requestAnimationFrame(frame);document.querySelector('#loading').hidden=true;
}
