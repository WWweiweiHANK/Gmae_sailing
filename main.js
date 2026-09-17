import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { route, seaHeight, updateGullVisibility } from './motion.mjs';
import { createAmbientAudio } from './ambient-audio.mjs';
import { createVoyageEffects } from './scene-effects.mjs';
import { auroraColorGLSL } from './aurora.mjs';

import {createEnvironment} from './environment.mjs';
import {drawingSize,createFrameClock} from './render-budget.mjs';
import {connectDesktop} from './desktop-bridge.mjs';
import {createWake} from './wake-pool.mjs';
import {seaVertexGLSL} from './water-shader.mjs';
import {createPerformanceMonitor} from './performance-monitor.mjs';
const canvas = document.querySelector('#scene');
function showError(text) { document.querySelector('#loading').hidden=true;const el=document.querySelector('#error');el.hidden=false;el.textContent=text; }
start().catch(error=>{console.error(error);showError('场景未能启动，请检查 WebGL 2 / WebView2。托盘仍可退出或重置。');});
async function start() {
const scene=new THREE.Scene();
let nativeState={editing:false,paused:false,visible:true,minimized:false,settings:{fps:30,wave:1,sound:false,camera:null}},bridge;
let waveTarget=2.2;const waveStrength={value:waveTarget};
const soundButton=document.querySelector('#sound'),waveSlider=document.querySelector('#wave-size');
const ambience=createAmbientAudio(active=>{soundButton.textContent=active?'静音':'听海';soundButton.setAttribute('aria-pressed',String(active));});
const qa=typeof __QA__!=='undefined'&&__QA__;
const query=new URLSearchParams(location.search),scenario=qa?query.get('scenario'):null;
const initial=scenario==='storm'?{weather:'storm'}:scenario==='aurora'?{period:'night',aurora:true}:{};
const environment=createEnvironment(Math.random,{...initial,fixed:qa});
const clock=createFrameClock();let timer=0,raf=0,contextLost=false;
let savedCameraApplied=false,lastNativeSound=false,saveTimer=0;
const renderer = new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,premultipliedAlpha:true,powerPreference:'low-power'});
renderer.setClearColor(0x000000,0);renderer.setPixelRatio(1);
let buffer;function resizeBuffer(){buffer=drawingSize(innerWidth,innerHeight,devicePixelRatio,nativeState.settings.fps);renderer.setSize(buffer.width,buffer.height,false);}
resizeBuffer();const monitor=createPerformanceMonitor(renderer);
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
const camera=new THREE.PerspectiveCamera(36,innerWidth/innerHeight,.1,150);
const controls=new OrbitControls(camera,canvas);controls.enableDamping=true;controls.dampingFactor=.12;controls.enablePan=false;
controls.minPolarAngle=.25;controls.maxPolarAngle=1.30;controls.target.set(0,2.35,0);
function fitCamera(){const fov=Math.min(camera.fov*Math.PI/360,Math.atan(Math.tan(camera.fov*Math.PI/360)*camera.aspect));controls.minDistance=8.2/Math.sin(fov)*1.06;controls.maxDistance=controls.minDistance*1.45;const distance=camera.position.distanceTo(controls.target);if(distance<controls.minDistance)camera.position.sub(controls.target).setLength(controls.minDistance).add(controls.target);}
function resetView(){controls.target.set(0,2.35,0);camera.position.set(13,16,18);fitCamera();camera.position.sub(controls.target).setLength(controls.minDistance*1.02).add(controls.target);controls.update();}resetView();
document.querySelector('#reset').addEventListener('click',()=>{resetView();saveView();});
const hemi=new THREE.HemisphereLight(0xe8f9ff,0x859ba9,2.3);scene.add(hemi);
const sun=new THREE.DirectionalLight(0xfff4df,3.2);sun.position.set(-5,12,6);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-10;sun.shadow.camera.right=10;sun.shadow.camera.top=10;sun.shadow.camera.bottom=-10;sun.shadow.normalBias=.04;sun.shadow.bias=-.0003;sun.shadow.radius=4;scene.add(sun);
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
const n=64,m=48,vertices=[],indices=[];
for(let j=0;j<=m;j++)for(let i=0;i<=n;i++){let u=i/n*2-1,v=j/m*2-1;const d=(Math.abs(u)**4.65+Math.abs(v)**4.65)**(1/4.65);const f=d?Math.max(Math.abs(u),Math.abs(v))/d:1;vertices.push(u*f*5.8,0,v*f*4.45);}
for(let j=0;j<m;j++)for(let i=0;i<n;i++){const a=j*(n+1)+i;indices.push(a,a+n+1,a+1,a+1,a+n+1,a+n+2);}
const wg=new THREE.BufferGeometry();wg.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));wg.setIndex(indices);

wg.computeVertexNormals();const waterMat=new THREE.MeshLambertMaterial({color:0x367f99});const waterTime={value:15};const waterRain={value:0};const auroraGlow={value:0};
waterMat.onBeforeCompile=shader=>{shader.uniforms.uRain=waterRain;shader.uniforms.uWaveStrength=waveStrength;shader.uniforms.uSeaTime=waterTime;shader.uniforms.uAuroraGlow=auroraGlow;shader.vertexShader=seaVertexGLSL+'\nvarying vec3 vSeaPosition;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <beginnormal_vertex>','#include <beginnormal_vertex>\nobjectNormal=normalize(vec3(seaHeightAt(position.xz-vec2(.03,0.))-seaHeightAt(position.xz+vec2(.03,0.)),.06,seaHeightAt(position.xz-vec2(0.,.03))-seaHeightAt(position.xz+vec2(0.,.03))));');shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.y=seaHeightAt(position.xz);vSeaPosition=transformed;');shader.fragmentShader='uniform float uWaveStrength;\nuniform float uSeaTime;\nuniform float uAuroraGlow;\nvarying vec3 vSeaPosition;\n'+auroraColorGLSL+'\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
  vec2 sea=vSeaPosition.xz;
  float phase=sea.x*.55+sea.y*1.15-uSeaTime*.46;
  float swellTone=.98+.085*sin(phase)+.025*sin(sea.x*1.05-sea.y*.55-uSeaTime*.31);
  float flow=.009*sin(sea.x*2.1+sea.y*1.8-uSeaTime*.58);
  diffuseColor.rgb*=.98+(swellTone-.98+flow)*min(uWaveStrength,3.);
`);shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance+=auroraWaterLight(vSeaPosition,uSeaTime)*uAuroraGlow;');};
const water=mesh(wg,waterMat);water.castShadow=false;
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
 g.traverse(part=>{if(part.isMesh){part.material=part.material.clone();part.material.transparent=true;part.castShadow=false;}});
 birds.push({g,wings,phase:i*1.8});
}
const moonGroup=new THREE.Group();moonGroup.position.set(-3.3,4.4,-2.6);scene.add(moonGroup);
const moonShape=new THREE.Shape();moonShape.moveTo(.18,.65);moonShape.bezierCurveTo(-.65,.65,-.88,-.4,-.13,-.68);moonShape.bezierCurveTo(.38,-.85,.81,-.42,.76,-.12);moonShape.bezierCurveTo(.1,-.45,-.22,.25,.18,.65);
const moon=mesh(new THREE.ExtrudeGeometry(moonShape,{depth:.14,bevelEnabled:true,bevelSize:.025,bevelThickness:.025,bevelSegments:1,curveSegments:15}),new THREE.MeshStandardMaterial({color:0xffefbc,emissive:0xffd487,emissiveIntensity:.8,roughness:.7}),moonGroup);moon.rotation.y=.45;
const effects=createVoyageEffects(scene);
const wake=createWake(scene);
const rainCount=1100,rainArray=new Float32Array(rainCount*6),rainMeta=[];for(let i=0;i<rainCount;i++){const x=(Math.random()-.5)*10,z=(Math.random()-.5)*7.3;rainMeta.push({x,z,y:Math.random()*5.2,speed:4+Math.random()*2});}
const rainGeo=new THREE.BufferGeometry();rainGeo.setAttribute('position',new THREE.BufferAttribute(rainArray,3));const rainMat=new THREE.LineBasicMaterial({color:0xd7f4ff,transparent:true,opacity:0,depthWrite:false});const rain=new THREE.LineSegments(rainGeo,rainMat);scene.add(rain);
const ripples=[];for(let i=0;i<24;i++){const r=mesh(new THREE.RingGeometry(.14,.16,18),new THREE.MeshBasicMaterial({color:0xcce7ee,transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false}));r.rotation.x=-Math.PI/2;r.position.set((Math.random()-.5)*9,.06,(Math.random()-.5)*6.8);r.castShadow=false;r.userData.phase=Math.random();ripples.push(r);}
const periodPalettes={
 day:{water:0x337e9b,side:[0xe8e5d9,0x245a78,0x327d94,0x4a9aa8],sun:2.25,hemi:2,light:0xfff5e2},
 dusk:{water:0x467e9a,side:[0xd5bca0,0x425568,0x557887,0x779396],sun:2.4,hemi:1.7,light:0xffc17c},
 night:{water:0x193b58,side:[0x697689,0x152e49,0x234866,0x37627c],sun:.65,hemi:1.1,light:0x9ebce9},
 dawn:{water:0x548c9c,side:[0xcac2b4,0x34556c,0x4a7d90,0x71a3af],sun:1.45,hemi:1.6,light:0xffd8c1}
};
const state={time:15};let nightMix=0,rainMix=0,duskMix=0;
const events={dolphinsAt:8+Math.random()*10,auroraAt:Infinity,lightningAt:Infinity};let dolphinEligible=false,lastStorm=false;
const tint=new THREE.Color(),otherTint=new THREE.Color();
function paint(material,from,to,mix,shade=0){material.color.copy(tint.setHex(from).lerp(otherTint.setHex(to),mix)).multiplyScalar(1-shade*.28);}
function wave(x,z,t){return seaHeight(x,z,t,rainMix,waveStrength.value);}
function cameraRecord(){return {position:camera.position.toArray(),target:controls.target.toArray()};}
function saveView(){if(!nativeState.editing)return;clearTimeout(saveTimer);saveTimer=setTimeout(()=>bridge?.save(cameraRecord(),waveTarget/2.2).catch(console.warn),300);}
function restoreView(record){if(!record||!Array.isArray(record.position)||!Array.isArray(record.target)||[...record.position,...record.target].length!==6||![...record.position,...record.target].every(Number.isFinite))return;
 camera.position.fromArray(record.position);controls.target.set(0,2.35,0);fitCamera();controls.update();}
controls.addEventListener('change',saveView);
waveSlider.addEventListener('input',()=>{waveTarget=Number(waveSlider.value)*.022;document.querySelector('#wave-value').value=waveSlider.value+'%';saveView();});
function active(){return !contextLost&&!nativeState.paused&&nativeState.visible&&!nativeState.minimized&&(bridge?.native||!document.hidden);}
let previousActive=false;
function syncScheduler(){const run=active();if(run===previousActive)return;previousActive=run;clock.reset();monitor.resetInterval();void ambience.setVisible(run);cancelAnimationFrame(raf);clearTimeout(timer);if(run)raf=requestAnimationFrame(frame);}
function showNative(next){const oldFps=nativeState.settings.fps,oldWave=nativeState.settings.wave;nativeState=next;
 document.body.dataset.editing=String(next.editing);controls.enabled=next.editing;
 if(next.settings.wave!==oldWave){waveTarget=next.settings.wave*2.2;waveSlider.value=String(next.settings.wave*100);document.querySelector('#wave-value').value=waveSlider.value+'%';}
 if(!savedCameraApplied){restoreView(next.settings.camera);savedCameraApplied=true;}
 if(oldFps!==next.settings.fps)resizeBuffer();
 if(next.settings.sound!==lastNativeSound){lastNativeSound=next.settings.sound;ambience.setEnabled(next.settings.sound).catch(()=>{document.querySelector('#status').textContent='声音未能开启，请在编辑模式点击听海。';});}
 document.querySelector('#pause').textContent=next.paused?'继续':'暂停';document.querySelector('#fps').value=String(next.settings.fps);syncScheduler();
}
bridge=await connectDesktop(showNative,()=>{resetView();saveView();},()=>report());document.body.dataset.native=String(bridge.native);
if(!bridge.native){try{const record=JSON.parse(localStorage.getItem('tiny-tides-view'));if(record){restoreView(record.camera);waveTarget=Math.max(0,Math.min(2,record.wave))*2.2;waveSlider.value=String(waveTarget/.022);document.querySelector('#wave-value').value=waveSlider.value+'%';}}catch{}}
soundButton.addEventListener('click',()=>{if(bridge.native){void ambience.setEnabled(!ambience.enabled).then(enabled=>{if(enabled!==nativeState.settings.sound)return bridge.action('sound');}).catch(console.warn);}else void bridge.action('sound');});
document.querySelector('#drag').addEventListener('pointerdown',event=>{if(event.button!==0)return;event.preventDefault();event.stopPropagation();void bridge.drag().catch(console.warn);});
document.querySelector('#lock').addEventListener('click',()=>bridge.action('lock'));
document.querySelector('#edit').addEventListener('click',()=>bridge.action('edit'));
document.querySelector('#pause').addEventListener('click',()=>bridge.action('pause'));
document.querySelector('#fps').addEventListener('change',event=>bridge.action('fps'+event.target.value));
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&bridge.native&&nativeState.editing)void bridge.action('lock');});
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();fitCamera();resizeBuffer();});
document.addEventListener('visibilitychange',syncScheduler);
canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();contextLost=true;syncScheduler();showError('图形上下文已暂停；恢复后自动继续。');});
canvas.addEventListener('webglcontextrestored',()=>{contextLost=false;document.querySelector('#error').hidden=true;syncScheduler();});
let latestEnvironment=environment.snapshot();
function report(){return {...monitor.report(),environment:latestEnvironment,paused:!active(),camera:cameraRecord(),rendererCount:1,wakeCapacity:wake.capacity,alphaCorners:lastAlpha};}
let lastAlpha=null,diagnosticAt=0;
if(document.modelContext?.registerTool){document.modelContext.registerTool({name:'get_ocean_state',title:'查看桌宠状态与实测性能',description:'只读场景状态、帧率、CPU提交时间及资源数量。',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:report});}
if(qa){document.body.dataset.qa='true';document.querySelector('#qa-panel').hidden=false;document.querySelector('#wallpaper').addEventListener('change',e=>{document.body.dataset.wallpaper=e.target.value;});}
document.querySelector('#export').addEventListener('click',()=>{const data=report();void bridge.diagnostics(data);const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='tiny-tides-diagnostics.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
function frame(now){
 if(!active()){syncScheduler();return;}raf=requestAnimationFrame(frame);
 const dt=clock.tick(now,true,nativeState.settings.fps);if(!dt)return;const cpuStart=performance.now();
 state.time+=dt;environment.advance(dt);const env=environment.snapshot();latestEnvironment=env;const t=state.time,from=periodPalettes[env.fromPeriod],pal=periodPalettes[env.period],mix=env.periodBlend;
 nightMix=env.night;rainMix=env.rain;duskMix=(env.fromPeriod==='dusk'?1:0)*(1-mix)+(env.period==='dusk'?1:0)*mix;
 waveStrength.value+=(waveTarget-waveStrength.value)*(1-Math.exp(-dt*3));
 const canDolphin=env.period==='day'&&env.weather==='clear';
 if(canDolphin&&!dolphinEligible)events.dolphinsAt=env.worldTime+8+Math.random()*10;
 if(canDolphin&&env.worldTime>events.dolphinsAt+14)events.dolphinsAt=env.worldTime+90+Math.random()*90;
 dolphinEligible=canDolphin;
 if(env.weather==='storm'&&!lastStorm)events.lightningAt=env.worldTime+8+Math.random()*16;
 lastStorm=env.weather==='storm';if(lastStorm&&env.worldTime>=events.lightningAt){effects.lightning();ambience.thunder();events.lightningAt=env.worldTime+18+Math.random()*28;}
 const effectWeather=canDolphin?'sunny':env.weather==='storm'?'storm':env.rain>.05?'rainy':'night';events.auroraAt=env.auroraAt;
 effects.update({time:t,elapsed:env.worldTime,weather:effectWeather,events,nightMix,dt,wave,auroraWeather:env.auroraAllowed?'night':'sunny',auroraElapsed:env.worldTime});auroraGlow.value=effects.waterGlow.value;
 paint(waterMat,from.water,pal.water,mix,env.shade);
 sides.forEach((s,i)=>{paint(s,from.side[i],pal.side[i],mix,env.shade);s.emissive.setHSL(.47+.065*Math.sin(t*.075+i*.8),.62,.16);s.emissiveIntensity=auroraGlow.value*(i===0?.025:.12);});
 sun.color.copy(tint.setHex(from.light).lerp(otherTint.setHex(pal.light),mix));sun.position.set(-7,12-duskMix*8,6);
 sun.intensity=(from.sun+(pal.sun-from.sun)*mix)*(1-env.shade*.76);hemi.intensity=(from.hemi+(pal.hemi-from.hemi)*mix)*(1-env.shade*.15);fill.intensity=1.1-nightMix*.55-duskMix*.55;
 waterTime.value=t;waterRain.value=rainMix;
 const pos=route(t),next=route(t+.12),heading=Math.atan2(next.x-pos.x,next.z-pos.z);const dx=Math.sin(heading),dz=Math.cos(heading);ship.position.set(pos.x,wave(pos.x,pos.z,t)+.05,pos.z);ship.rotation.set((wave(pos.x-dx*.6,pos.z-dz*.6,t)-wave(pos.x+dx*.6,pos.z+dz*.6,t))*.42,heading,(wave(pos.x+dz*.3,pos.z-dx*.3,t)-wave(pos.x-dz*.3,pos.z+dx*.3,t))*.45);flag.rotation.y=Math.sin(t*4)*.12;
 wake.update(t,dt,wave);
 birds.forEach(({g,wings,phase},i)=>{
  const mode=env.period==='night'||env.weather==='storm'?'night':env.weather==='clear'?'sunny':'rainy';if(env.stormWarning){g.userData.fade=(g.userData.fade??1)*Math.exp(-dt*1.5);g.traverse(p=>{if(p.isMesh)p.material.opacity=g.userData.fade;});g.visible=g.userData.fade>.005;}else updateGullVisibility(g,mode,i,dt);if(!g.visible)return;
  const a=t*.18+phase;g.position.set(pos.x*.34+Math.sin(a)*(1.4+i*.25),2.5+i*.34+Math.sin(t*.7+phase)*.25-rainMix*.15,pos.z*.25+Math.cos(a)*(1+i*.25));g.rotation.y=a+Math.PI/2;g.rotation.z=Math.sin(a)*.1;
  if(env.stormWarning){g.position.x+=Math.min(1.5,(1-g.userData.fade)*1.5);g.visible=g.userData.fade>.01;}
  wings[0].rotation.z=Math.sin(t*2.4+phase)*.18;wings[1].rotation.z=-Math.sin(t*2.4+phase)*.18;
 });
 moonGroup.scale.setScalar(Math.max(.001,nightMix*.56));moonGroup.rotation.y=Math.sin(t*.12)*.1;
 const lampMix=Math.max(nightMix,duskMix*.7,rainMix*.5);glass.color.lerp(tint.setHex(lampMix>.3?0xffd68b:0x418fa5),1-Math.exp(-dt*1.8));glass.emissive.setHex(0xffb642);glass.emissiveIntensity=lampMix*1.2;lampMat.emissiveIntensity=lampMix*2;shipLight.intensity=lampMix*3.5;
 rainMat.opacity=Math.min(.48,rainMix*.6);rainGeo.setDrawRange(0,Math.floor(150+rainMix*950)*2);rain.visible=rainMix>.005;
 if(rain.visible){for(let i=0;i<rainCount;i++){const r=rainMeta[i];r.y-=dt*r.speed*(.7+rainMix*.9);if(r.y<.1)r.y=.1+((r.y-.1)%5.1+5.1)%5.1;const k=i*6;rainArray[k]=r.x;rainArray[k+1]=r.y;rainArray[k+2]=r.z;rainArray[k+3]=r.x-.025-rainMix*.12;rainArray[k+4]=r.y+.12+rainMix*.18;rainArray[k+5]=r.z;}rainGeo.attributes.position.needsUpdate=true;}
 ripples.forEach(r=>{const a=(t*.65+r.userData.phase)%1;r.visible=rain.visible;if(!r.visible)return;r.scale.setScalar(.2+a*1.5);r.material.opacity=rainMix*(1-a)*.4;r.position.y=.025+wave(r.position.x,r.position.z,t);});
 ambience.setEnvironment({rain:rainMix,night:nightMix,gulls:!env.stormWarning&&env.period!=='night'&&env.weather==='clear'});ambience.tick();
 controls.dampingFactor=1-Math.exp(-dt*7.6);controls.update();renderer.render(scene,camera);
 monitor.sample(now,performance.now()-cpuStart,env,buffer);
 if(qa&&now-diagnosticAt>5000){diagnosticAt=now;const gl=renderer.getContext(),pixel=new Uint8Array(4);lastAlpha=[];for(const [x,y] of [[0,0],[buffer.width-1,0],[0,buffer.height-1],[buffer.width-1,buffer.height-1]]){gl.readPixels(x,y,1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);lastAlpha.push([...pixel]);}document.querySelector('#diagnostics').textContent=JSON.stringify(report(),null,2);}
}
document.querySelector('#loading').hidden=true;syncScheduler();
}
