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
import {createShipCustomization} from './ship-customization.mjs';
import {JournalBookController} from './journal/journal-book.mjs';
import {createSailing,sailingConfig} from './sailing.mjs';
import {createGameSave,GAME_SAVE_KEY} from './game-save.mjs';
import {createBoatSkins} from './boat-skins.mjs';
import {createAccessoryEquipment} from './boat-accessories.mjs';
import accessorySheet from './assets/boat-accessories.png';
import {createBoatModel} from './boat-model.mjs';
import {createBadges,createWorldEventBus,createVisualEventTracker} from './badges.mjs';
import {createEncounterDirector} from './encounter-director.mjs';
import {encounterCatalog,ENCOUNTER_PACING} from './encounter-catalog.mjs';
import {createEncounterVisuals,encounterBioGLSL} from './encounter-visuals.mjs';
import {createJournal} from './journal/journal-store.mjs';
import {createVoyageIntentManager} from './voyage-intents.mjs';
const canvas = document.querySelector('#scene');
function showError(text) { document.querySelector('#loading').hidden=true;const el=document.querySelector('#error');el.hidden=false;el.textContent=text; }
start().catch(error=>{console.error(error);showError('场景未能启动，请检查 WebGL 2 / WebView2。托盘仍可退出或重置。');});
async function start() {
const scene=new THREE.Scene();
let nativeState={editing:false,paused:false,visible:true,minimized:false,settings:{fps:30,wave:1,sound:true,camera:null}},bridge;
let waveTarget=2.2;const waveStrength={value:waveTarget};
const soundButton=document.querySelector('#sound'),waveSlider=document.querySelector('#wave-size');
const ambience=createAmbientAudio(active=>{soundButton.textContent=active?'静音':'听海';soundButton.setAttribute('aria-pressed',String(active));});
const qa=typeof __QA__!=='undefined'&&__QA__;
const query=new URLSearchParams(location.search),scenario=qa?query.get('scenario'):null;
const encounterQA=qa?encounterCatalog.find(e=>e.id===query.get('encounterPreview')):null;
const initial=encounterQA?{period:encounterQA.conditions.time[0],weather:encounterQA.conditions.weather[0],disableAurora:true}:scenario==='storm'?{weather:'storm'}:scenario==='aurora'?{period:'night',aurora:true}:['day','dusk','night','dawn'].includes(scenario)?{period:scenario,disableAurora:true}:{};
let intents=null;
const environment=createEnvironment(Math.random,{...initial,fixed:qa,intentWeight:()=>intents?.modifiers().aurora??1});
const clock=createFrameClock();let timer=0,raf=0,contextLost=false;
let savedCameraApplied=false,lastNativeSound=null,saveTimer=0;
let badges=null,encounterDirector=null,renderedNight=false;
const worldEventBus=createWorldEventBus(),trackVisualEvents=createVisualEventTracker(worldEventBus.emitWorldEvent);
let journalBook=null,travelTime=15,pageSuspended=false,saveError='';
const development=typeof __DEV__!=='undefined'&&__DEV__,fastSailing=typeof __DEV__!=='undefined'&&__DEV__&&query.get('sailingDebug')==='fast';
const fastEncounters=typeof __DEV__!=='undefined'&&__DEV__&&query.get('encounterDebug')==='fast';
const store=createGameSave({getItem:key=>localStorage.getItem(key),setItem:(key,value)=>localStorage.setItem(key,value)},
 {key:fastEncounters?'tiny-tides-encounters-debug-v1':fastSailing?'tiny-tides-game-debug-v1':GAME_SAVE_KEY,migrateLegacy:!fastSailing&&!fastEncounters,onError:message=>{saveError=message;document.querySelector('#ship-notice').textContent=message;console.warn(message);}});
let sailing;
intents=createVoyageIntentManager({store,total:()=>sailing?.snapshot().totalSailingSeconds??store.read().sailingData.totalSailingSeconds});
const journal=createJournal({store,bus:worldEventBus,intents});
sailing=createSailing({initial:store.read().sailingData,config:sailingConfig(development,fastSailing),onSave:sailingData=>{
 badges?.advance(renderedNight);intents.save();encounterDirector?.save();const saved=store.save({sailingData,...(badges?{badgeProgress:badges.progress()}:{})});if(saved)saveError='';if(journalBook?.busy)refreshBalance();
 if(development)console.debug('[航行值]',{...sailingData,isSailingActive:isSailingActive(),debugFast:fastSailing});return saved;
}});
const debugPoints=typeof __DEV__!=='undefined'&&__DEV__&&fastSailing?Number(query.get('debugPoints')):0;
if(store.isNew&&Number.isSafeInteger(debugPoints)&&debugPoints>0&&debugPoints<=10000)sailing.addSailingPoints(debugPoints);
function refreshBalance(){journalBook?.refreshBalance();}
const renderer = new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,premultipliedAlpha:true,powerPreference:'low-power'});
renderer.setClearColor(0x000000,0);renderer.setPixelRatio(1);
let buffer;function resizeBuffer(){buffer=drawingSize(innerWidth,innerHeight,devicePixelRatio,nativeState.settings.fps);renderer.setSize(buffer.width,buffer.height,false);}
resizeBuffer();const monitor=createPerformanceMonitor(renderer);
renderer.info.autoReset=false;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
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
const white=mat(0xfffcf2);
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
waterMat.onBeforeCompile=shader=>{shader.uniforms.uRain=waterRain;shader.uniforms.uWaveStrength=waveStrength;shader.uniforms.uSeaTime=waterTime;shader.uniforms.uAuroraGlow=auroraGlow;shader.uniforms.uBio=encounterVisuals.bio;shader.uniforms.uBioBoat=encounterVisuals.boat;shader.vertexShader=seaVertexGLSL+'\nvarying vec3 vSeaPosition;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <beginnormal_vertex>','#include <beginnormal_vertex>\nobjectNormal=normalize(vec3(seaHeightAt(position.xz-vec2(.03,0.))-seaHeightAt(position.xz+vec2(.03,0.)),.06,seaHeightAt(position.xz-vec2(0.,.03))-seaHeightAt(position.xz+vec2(0.,.03))));');shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.y=seaHeightAt(position.xz);vSeaPosition=transformed;');shader.fragmentShader='uniform float uWaveStrength;\nuniform float uSeaTime;\nuniform float uAuroraGlow;\nvarying vec3 vSeaPosition;\n'+auroraColorGLSL+'\n'+encounterBioGLSL+'\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
  vec2 sea=vSeaPosition.xz;
  float phase=sea.x*.55+sea.y*1.15-uSeaTime*.46;
  float swellTone=.98+.085*sin(phase)+.025*sin(sea.x*1.05-sea.y*.55-uSeaTime*.31);
  float flow=.009*sin(sea.x*2.1+sea.y*1.8-uSeaTime*.58);
  diffuseColor.rgb*=.98+(swellTone-.98+flow)*min(uWaveStrength,3.);
`);shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance+=auroraWaterLight(vSeaPosition,uSeaTime)*uAuroraGlow;\ntotalEmissiveRadiance+=encounterBiolight(vSeaPosition,uSeaTime);');};
const water=mesh(wg,waterMat);water.castShadow=false;
const boat=createBoatModel(store.read().shipCustomization.skinId),ship=boat.ship;scene.add(ship);
boat.setSize();
const {hull:hullMat,roof:roofMat,stripe:stripeMat}=boat.materials;
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
const wake=createWake(scene,200,ship.scale.x);
const encounterVisuals=createEncounterVisuals({scene,ship,dolphinPod:effects.dolphinPod,waterTime,waterRain,waveStrength});
const wakeWhite=new THREE.Color(0xf4ffff),wakeGlow=new THREE.Color(0x68e9cb);
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
const events={dolphinsAt:Infinity,auroraAt:Infinity,lightningAt:Infinity};let lastStorm=false;
const tint=new THREE.Color(),otherTint=new THREE.Color();
function paint(material,from,to,mix,shade=0){material.color.copy(tint.setHex(from).lerp(otherTint.setHex(to),mix)).multiplyScalar(1-shade*.28);}
function wave(x,z,t){return seaHeight(x,z,t,rainMix,waveStrength.value);}
function cameraRecord(){return {position:camera.position.toArray(),target:controls.target.toArray()};}
function saveView(){if(!nativeState.editing||journalBook?.busy)return;clearTimeout(saveTimer);saveTimer=setTimeout(()=>{if(!journalBook?.busy)void bridge?.save(cameraRecord(),waveTarget/2.2).catch(console.warn);},300);}
function restoreView(record){if(!record||!Array.isArray(record.position)||!Array.isArray(record.target)||[...record.position,...record.target].length!==6||![...record.position,...record.target].every(Number.isFinite))return;
 camera.position.fromArray(record.position);controls.target.set(0,2.35,0);fitCamera();controls.update();}
controls.addEventListener('change',saveView);
waveSlider.addEventListener('input',()=>{waveTarget=Number(waveSlider.value)*.022;document.querySelector('#wave-value').value=waveSlider.value+'%';saveView();});
function active(){return !pageSuspended&&!contextLost&&(!nativeState.paused||journalBook?.busy)&&nativeState.visible&&!nativeState.minimized&&(bridge?.native||!document.hidden);}
function isSailingActive(){return Boolean(active()&&!nativeState.paused);}
let previousActive=false;
function syncScheduler(){journalBook?.update();sailing.tick(performance.now(),isSailingActive());const run=active();if(run===previousActive)return;previousActive=run;clock.reset();monitor.resetInterval();void ambience.setVisible(run);cancelAnimationFrame(raf);clearTimeout(timer);if(run)raf=requestAnimationFrame(frame);}
function showNative(next){const oldFps=nativeState.settings.fps,oldWave=nativeState.settings.wave,wasInspecting=nativeState.inspecting;nativeState=next;
 if(wasInspecting&&!next.inspecting&&journalBook?.busy)journalBook.close();
 document.body.dataset.editing=String(next.editing);controls.enabled=next.editing&&!journalBook?.busy;
 if(next.settings.wave!==oldWave){waveTarget=next.settings.wave*2.2;waveSlider.value=String(next.settings.wave*100);document.querySelector('#wave-value').value=waveSlider.value+'%';}
 if(!savedCameraApplied){restoreView(next.settings.camera);savedCameraApplied=true;}
 if(oldFps!==next.settings.fps)resizeBuffer();
 if(next.settings.sound!==lastNativeSound){lastNativeSound=next.settings.sound;ambience.setEnabled(next.settings.sound).catch(()=>{document.querySelector('#status').textContent='声音未能开启，请在编辑模式点击听海。';});}
 document.querySelector('#pause').textContent=next.paused?'继续':'暂停';document.querySelector('#fps').value=String(next.settings.fps);syncScheduler();
}
bridge=await connectDesktop(showNative,()=>{if(journalBook?.busy)journalBook.close();else{resetView();saveView();}},()=>report(),()=>{pageSuspended=true;syncScheduler();sailing.flush();});document.body.dataset.native=String(bridge.native);
const customization=createShipCustomization(ship,{hull:hullMat,roof:roofMat,stripe:stripeMat},message=>{document.querySelector('#ship-notice').textContent=message;},store.read().shipCustomization,
 shipCustomization=>store.save({shipCustomization,sailingData:sailing.snapshot()}),boat);
const skins=createBoatSkins({store,customization});
const accessories=createAccessoryEquipment({store,customization,preview:typeof __GM__!=='undefined'&&__GM__});
document.documentElement.style.setProperty('--accessory-sheet',`url("${accessorySheet}")`);
badges=createBadges({store,customization,bus:worldEventBus,total:()=>sailing.snapshot().totalSailingSeconds,config:typeof __DEV__!=='undefined'&&__DEV__&&fastSailing?{first_voyage:30,old_sailor:120,starry_night:10}:{},onChange:()=>journalBook?.refreshBadges()});
if(typeof __DEV__!=='undefined'&&__DEV__){window.debugUnlockBadge=id=>badges.unlockBadge(id,{sourceEventId:'debug'});window.emitWorldEvent=worldEventBus.emitWorldEvent;}
const debugPacing=()=>({...ENCOUNTER_PACING,windows:{ambient:[10,20],special:[20,40],wonder:[40,60]},firstAmbient:[10,15],quietAfterMajor:[5,8],wonderGap:45,cooldownScale:.01});
encounterDirector=createEncounterDirector({store,bus:worldEventBus,intents,shipName:()=>customization.data.name,config:fastEncounters?debugPacing():ENCOUNTER_PACING});
worldEventBus.subscribe(type=>{if(type==='encounter_completed')journalBook?.refreshAccessories();});
function encounterEnvironment(env){return {...env,aurora:effects.waterGlow.value,auroraDueIn:env.auroraAllowed?env.auroraAt-env.worldTime:Infinity};}
if(typeof __GM__!=='undefined'&&__GM__){
 const controls=document.querySelector('#gm-controls'),select=document.querySelector('#gm-event'),button=document.querySelector('#gm-trigger');controls.hidden=false;
 for(const encounter of encounterCatalog)select.add(new Option(encounter.name,encounter.id));
 button.addEventListener('click',()=>{const encounter=select.value==='random'?encounterCatalog[Math.floor(Math.random()*encounterCatalog.length)]:encounterCatalog.find(item=>item.id===select.value);if(!encounter)return;
  environment.stage({period:encounter.conditions.time[0],weather:encounter.conditions.weather[0]});const result=encounterDirector.stageEncounter(encounter.id,encounterEnvironment(environment.snapshot()));document.querySelector('#status').textContent=result==='started'?`GM：${encounter.name}已出现，结束后写入日志`:`GM：${encounter.name}未能出现`;
 });
}
if(typeof __DEV__!=='undefined'&&__DEV__){
 window.triggerEncounter=id=>encounterDirector.startEncounter(id,encounterEnvironment(environment.snapshot()),{ignoreTiming:true});
 let accelerated=fastEncounters;Object.defineProperty(window,'DEBUG_ENCOUNTER_SPEED',{get:()=>accelerated,set:value=>{accelerated=value===true;encounterDirector.setPacing(accelerated?debugPacing():ENCOUNTER_PACING);}});
}
journalBook=JournalBookController({renderer,controls,ship,store,sailing,audioAllowed:()=>nativeState.settings.sound&&ambience.enabled&&active(),customization,skins,accessories,badges,journal,intents,onEnter:()=>{clearTimeout(saveTimer);void bridge.action('inspect').catch(console.warn);syncScheduler();refreshBalance();if(saveError)document.querySelector('#ship-notice').textContent=saveError;},onLeave:()=>{controls.enabled=nativeState.editing;void bridge.action('inspect-end').catch(console.warn);syncScheduler();sailing.flush();}});
// Intent debug tools use the existing isolated encounter test save only.
if(typeof __DEV__!=='undefined'&&__DEV__&&fastEncounters){
 window.debugSetVoyageIntent=id=>intents.setIntent(id,{},true);
 window.debugClearVoyageIntent=()=>intents.setIntent('free_sailing',{},true);
 window.getCurrentVoyageIntentDebug=()=>({state:intents.snapshot(),modifiers:intents.modifiers()});
 window.debugOpenIntentJournal=id=>{
  if(!encounterCatalog.some(e=>e.id===id))return false;
  const count=journal.entries().filter(e=>e.encounterId===id).length+1,at=new Date().toISOString();
  worldEventBus.emitWorldEvent('encounter_completed',{encounterId:id,startTime:at,endTime:at,shipName:customization.data.name,weather:latestEnvironment.weather,timeOfDay:latestEnvironment.period,firstTime:count===1,seenCount:count});
  journalBook.openJournal(journal.entries().at(-1)?.id);return true;
 };
}
// Click-through windows receive no pointer events: poll only the native cursor and raycast this ship.
let pollingPointer=false;if(bridge.native)setInterval(async()=>{if(pollingPointer||journalBook.busy||nativeState.editing||!nativeState.visible||nativeState.minimized)return;pollingPointer=true;
 try{const point=await bridge.pointer();if(!journalBook.busy&&!nativeState.editing)await bridge.hover(journalBook.noteHit(...point));}catch(error){console.warn(error);}finally{pollingPointer=false;}
},100);
if(!bridge.native){try{const record=JSON.parse(localStorage.getItem('tiny-tides-view'));if(record){restoreView(record.camera);waveTarget=Math.max(0,Math.min(2,record.wave))*2.2;waveSlider.value=String(waveTarget/.022);document.querySelector('#wave-value').value=waveSlider.value+'%';}}catch{}}
soundButton.addEventListener('click',()=>{void ambience.setEnabled(!ambience.enabled).then(enabled=>{if(enabled!==nativeState.settings.sound)return bridge.action('sound');}).catch(console.warn);});
// Browsers may defer autoplay until a gesture; a deliberate mute must stay muted.
function resumeDefaultAudio(event){if(nativeState.settings.sound&&!ambience.enabled&&!soundButton.contains(event.target))void ambience.setEnabled(true).catch(console.warn);}
document.addEventListener('pointerdown',resumeDefaultAudio);
document.addEventListener('keydown',resumeDefaultAudio);
document.querySelector('#drag').addEventListener('pointerdown',event=>{if(event.button!==0)return;event.preventDefault();event.stopPropagation();void bridge.drag().catch(console.warn);});
document.querySelector('#lock').addEventListener('click',()=>bridge.action('lock'));
document.querySelector('#edit').addEventListener('click',()=>bridge.action('edit'));
document.querySelector('#pause').addEventListener('click',()=>bridge.action('pause'));
document.querySelector('#fps').addEventListener('change',event=>bridge.action('fps'+event.target.value));
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!journalBook.busy&&bridge.native&&nativeState.editing)void bridge.action('lock');});
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();if(!journalBook.busy)fitCamera();resizeBuffer();});
document.addEventListener('visibilitychange',syncScheduler);
window.addEventListener('beforeunload',()=>{sailing.tick(performance.now(),isSailingActive());sailing.flush();});
function suspendPage(){pageSuspended=true;syncScheduler();sailing.flush();}
function resumePage(){pageSuspended=false;syncScheduler();}
window.addEventListener('pagehide',suspendPage);window.addEventListener('pageshow',resumePage);
document.addEventListener('freeze',suspendPage);document.addEventListener('resume',resumePage);
canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();contextLost=true;syncScheduler();showError('图形上下文已暂停；恢复后自动继续。');});
canvas.addEventListener('webglcontextrestored',()=>{contextLost=false;document.querySelector('#error').hidden=true;syncScheduler();});
let latestEnvironment=environment.snapshot();
function report(){return {...monitor.report(),environment:latestEnvironment,boatSize:ship.scale.x,shipLighting:{point:boat.shipLight.intensity,lamp:boat.materials.lamp.emissiveIntensity,windows:boat.materials.glass.emissiveIntensity},encounters:encounterDirector?.snapshot(),voyageIntent:intents.snapshot(),paused:!active(),camera:cameraRecord(),audio:{requested:nativeState.settings.sound,playing:ambience.enabled,loaded:ambience.loaded},rendererCount:1,wakeCapacity:wake.capacity,alphaCorners:lastAlpha,shipCustomization:customization.data,ownedColors:store.read().ownedColors,ownedBadges:store.read().ownedBadges,badgeProgress:badges.progress(),seenBadgeNotifications:store.read().seenBadgeNotifications,journalBook:journalBook?.snapshot(),travelTime,sailingData:sailing.snapshot(),isSailingActive:isSailingActive(),sailingIntervalSeconds:sailingConfig(development,fastSailing).intervalSeconds};}
let lastAlpha=null,diagnosticAt=0,startupRecorded=false;
if(document.modelContext?.registerTool){document.modelContext.registerTool({name:'get_ocean_state',title:'查看桌宠状态与实测性能',description:'只读场景状态、帧率、CPU提交时间及资源数量。',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:report});}
if(typeof __DEV__!=='undefined'&&__DEV__&&fastSailing&&document.modelContext?.registerTool)document.modelContext.registerTool({name:'debug_badge_event',title:'测试存档：触发徽章事件',description:'仅独立开发存档可用；模拟体验事件或直接解锁徽章，正常存档和正式包没有此入口。',inputSchema:{type:'object',properties:{type:{type:'string'},badgeId:{type:'string'}},additionalProperties:false},execute:({type,badgeId})=>({result:badgeId?badges.unlockBadge(badgeId,{sourceEventId:'debug'}):worldEventBus.emitWorldEvent(type,{sourceEventId:'debug-event'}),ownedBadges:store.read().ownedBadges})});
if(typeof __DEV__!=='undefined'&&__DEV__&&fastEncounters&&document.modelContext?.registerTool)document.modelContext.registerTool({name:'debug_encounter',title:'独立测试存档：见闻演出',description:'仅独立开发存档。trigger 跳过等待，但遵守天气、前置与互斥；end 中断当前演出；pace 调整自动调度测试速度。',inputSchema:{type:'object',properties:{action:{type:'string',enum:['trigger','end','pace']},id:{type:'string'},fast:{type:'boolean'}},required:['action'],additionalProperties:false},execute:({action,id,fast})=>({result:action==='trigger'?window.triggerEncounter(id):action==='end'?encounterDirector.endEncounter(id,true):(window.DEBUG_ENCOUNTER_SPEED=fast===true),state:encounterDirector.snapshot()})});
if(qa){document.body.dataset.qa='true';document.querySelector('#qa-panel').hidden=false;document.querySelector('#wallpaper').addEventListener('change',e=>{document.body.dataset.wallpaper=e.target.value;});}
document.querySelector('#export').addEventListener('click',()=>{const data=report();void bridge.diagnostics(data);const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='tiny-tides-diagnostics.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
function frame(now){
 if(!active()){syncScheduler();return;}raf=requestAnimationFrame(frame);
 sailing.tick(performance.now(),isSailingActive());badges.advance(renderedNight);
 const dt=clock.tick(now,true,journalBook.busy?20:nativeState.settings.fps);if(!dt)return;const cpuStart=performance.now();
 const worldDt=nativeState.paused||dt>30?0:dt;state.time+=worldDt;environment.advance(worldDt);travelTime+=worldDt;const env=environment.snapshot();latestEnvironment=env;const t=state.time,from=periodPalettes[env.fromPeriod],pal=periodPalettes[env.period],mix=env.periodBlend;
 nightMix=env.night;rainMix=env.rain;duskMix=(env.fromPeriod==='dusk'?1:0)*(1-mix)+(env.period==='dusk'?1:0)*mix;
 waveStrength.value+=(waveTarget-waveStrength.value)*(1-Math.exp(-dt*3));
 const canDolphin=env.period==='day'&&env.weather==='clear';
 if(env.weather==='storm'&&!lastStorm)events.lightningAt=env.worldTime+8+Math.random()*16;
 lastStorm=env.weather==='storm';if(lastStorm&&env.worldTime>=events.lightningAt){effects.lightning();ambience.thunder();events.lightningAt=env.worldTime+18+Math.random()*28;}
 const effectWeather=canDolphin?'sunny':env.weather==='storm'?'storm':env.rain>.05?'rainy':'night';events.auroraAt=env.auroraAt;
 effects.update({time:t,elapsed:env.worldTime,weather:effectWeather,events,nightMix,dt,wave,auroraWeather:env.auroraAllowed?'night':'sunny',auroraElapsed:env.worldTime,managedDolphins:true});auroraGlow.value=effects.waterGlow.value;
 paint(waterMat,from.water,pal.water,mix,env.shade);

 sides.forEach((s,i)=>{paint(s,from.side[i],pal.side[i],mix,env.shade);s.emissive.setHSL(.47+.065*Math.sin(t*.075+i*.8),.62,.16);s.emissiveIntensity=auroraGlow.value*(i===0?.025:.12);});
 sun.color.copy(tint.setHex(from.light).lerp(otherTint.setHex(pal.light),mix));sun.position.set(-7,12-duskMix*8,6);
 sun.intensity=(from.sun+(pal.sun-from.sun)*mix)*(1-env.shade*.76);hemi.intensity=(from.hemi+(pal.hemi-from.hemi)*mix)*(1-env.shade*.15);fill.intensity=1.1-nightMix*.55-duskMix*.55;
 waterTime.value=t;waterRain.value=rainMix;
 const pos=route(travelTime),next=route(travelTime+.12),heading=Math.atan2(next.x-pos.x,next.z-pos.z);const dx=Math.sin(heading),dz=Math.cos(heading);ship.position.set(pos.x,wave(pos.x,pos.z,t)+.05,pos.z);ship.rotation.set((wave(pos.x-dx*.6,pos.z-dz*.6,t)-wave(pos.x+dx*.6,pos.z+dz*.6,t))*.42,heading,(wave(pos.x+dz*.3,pos.z-dx*.3,t)-wave(pos.x-dz*.3,pos.z+dx*.3,t))*.45);
 encounterDirector.advance(worldDt,encounterEnvironment(env),!nativeState.paused);encounterVisuals.update(encounterDirector.active(),t,wave);
 wake.mesh.material.color.lerpColors(wakeWhite,wakeGlow,encounterVisuals.bio.value);
 wake.update(t,worldDt,wave,travelTime,!nativeState.paused,ship.scale.x);journalBook.update(dt);customization.animate(dt,worldDt);
 birds.forEach(({g,wings,phase},i)=>{
  const mode=env.period==='night'||env.weather==='storm'?'night':env.weather==='clear'?'sunny':'rainy';if(env.stormWarning){g.userData.fade=(g.userData.fade??1)*Math.exp(-dt*1.5);g.traverse(p=>{if(p.isMesh)p.material.opacity=g.userData.fade;});g.visible=g.userData.fade>.005;}else updateGullVisibility(g,mode,i,dt);if(!g.visible)return;
  const a=t*.18+phase;g.position.set(pos.x*.34+Math.sin(a)*(1.4+i*.25),2.5+i*.34+Math.sin(t*.7+phase)*.25-rainMix*.15,pos.z*.25+Math.cos(a)*(1+i*.25));g.rotation.y=a+Math.PI/2;g.rotation.z=Math.sin(a)*.1;
  if(env.stormWarning){g.position.x+=Math.min(1.5,(1-g.userData.fade)*1.5);g.visible=g.userData.fade>.01;}
  wings[0].rotation.z=Math.sin(t*2.4+phase)*.18;wings[1].rotation.z=-Math.sin(t*2.4+phase)*.18;
 });
 moonGroup.scale.setScalar(Math.max(.001,nightMix*.56));moonGroup.rotation.y=Math.sin(t*.12)*.1;
 boat.updateLighting(env,t);
 rainMat.opacity=Math.min(.48,rainMix*.6);rainGeo.setDrawRange(0,Math.floor(150+rainMix*950)*2);rain.visible=rainMix>.005;
 if(rain.visible){for(let i=0;i<rainCount;i++){const r=rainMeta[i];r.y-=dt*r.speed*(.7+rainMix*.9);if(r.y<.1)r.y=.1+((r.y-.1)%5.1+5.1)%5.1;const k=i*6;rainArray[k]=r.x;rainArray[k+1]=r.y;rainArray[k+2]=r.z;rainArray[k+3]=r.x-.025-rainMix*.12;rainArray[k+4]=r.y+.12+rainMix*.18;rainArray[k+5]=r.z;}rainGeo.attributes.position.needsUpdate=true;}
 ripples.forEach(r=>{const a=(t*.65+r.userData.phase)%1;r.visible=rain.visible;if(!r.visible)return;r.scale.setScalar(.2+a*1.5);r.material.opacity=rainMix*(1-a)*.4;r.position.y=.025+wave(r.position.x,r.position.z,t);});
 ambience.setEnvironment({rain:rainMix,night:nightMix,gulls:!env.stormWarning&&env.period!=='night'&&env.weather==='clear'});ambience.tick();
 controls.dampingFactor=1-Math.exp(-dt*7.6);if(!journalBook.busy)controls.update();renderer.info.reset();renderer.render(scene,camera);journalBook.renderPreview(now);
 renderedNight=nightMix>.8;
 if(!nativeState.paused){for(const id of encounterVisuals.visibleIds())encounterDirector.confirmVisible(id);trackVisualEvents({aurora:effects.visibleEvents(t,wave).aurora,storm:env.weather==='storm'&&rain.visible&&rainMix>.75,sunset:env.period==='dusk'&&duskMix>.9&&env.shade<.5});}
 monitor.sample(now,performance.now()-cpuStart,env,buffer);
 if(bridge.native&&!startupRecorded&&monitor.report().last){startupRecorded=true;void bridge.diagnostics({...report(),native:true,windowState:nativeState}).catch(console.warn);}
 if(qa&&now-diagnosticAt>5000){diagnosticAt=now;const gl=renderer.getContext(),pixel=new Uint8Array(4);lastAlpha=[];for(const [x,y] of [[0,0],[buffer.width-1,0],[0,buffer.height-1],[buffer.width-1,buffer.height-1]]){gl.readPixels(x,y,1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);lastAlpha.push([...pixel]);}document.querySelector('#diagnostics').textContent=JSON.stringify(report(),null,2);}
}
document.querySelector('#loading').hidden=true;syncScheduler();
}
