import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import * as THREE from 'three';
import { createVoyageEffects } from './scene-effects.mjs';
let model = {};
try { model = await import('./motion.mjs'); } catch {}
let sound = {};
try { sound = await import('./audio-mix.mjs'); } catch {}
let aurora = {};
try { aurora = await import('./aurora.mjs'); } catch {}
test('sea swells travel over time while the cut boundary remains sealed', () => {
  assert.equal(typeof model.seaHeight, 'function', 'ocean swells are not implemented');
  let lo=Infinity, hi=-Infinity;
  for(let t=0;t<30;t+=.1){const h=model.seaHeight(0,0,t);lo=Math.min(lo,h);hi=Math.max(hi,h);assert.ok(Math.abs(model.seaHeight(5.8,0,t))<1e-8);assert.ok(Math.abs(model.seaHeight(0,4.45,t))<1e-8);}
  assert.ok(hi-lo>.1, 'swells must visibly rise and fall');
  assert.ok(hi-lo<.28, 'miniature waves should remain low');
});
test('weather audio brings in rain and makes night quieter', () => {
  assert.equal(typeof sound.ambientMix,'function','weather audio is not implemented');
  const sun=sound.ambientMix('sunny'),rain=sound.ambientMix('rainy'),night=sound.ambientMix('night');
  assert.equal(sun.rain,0);assert.equal(night.rain,0);assert.ok(rain.rain>0);
  assert.ok(night.sea<sun.sea);assert.ok(night.gull<sun.gull);assert.ok(rain.gull<sun.gull);
});
test('a voyage cycles all five stages every 60 seconds without resetting ship time', () => {
  const s={time:47.25,weather:'sunny',elapsed:0};
  for(const expected of ['rainy','storm','dusk','night','sunny']){
    assert.equal(model.advanceWeather(s,59.9),false);
    assert.equal(model.advanceWeather(s,.1),true);
    assert.equal(s.weather,expected);assert.equal(s.time,47.25);
  }
  s.elapsed=40;model.chooseWeather(s,'night');assert.equal(s.elapsed,0);
});
test('dolphins remain inside the ocean and dive out of sight at the edge',()=>{
  for(let lane=0;lane<4;lane++)for(let u=0;u<=1;u+=.005){const p=model.dolphinPose(u,lane);assert.ok((Math.abs(p.x)/5.8)**4.65+(Math.abs(p.z)/4.45)**4.65<1);}
  assert.ok(model.dolphinPose(0,0).y<-.5);assert.ok(model.dolphinPose(1,0).y<-.5);
  assert.ok(model.dolphinPose(.5,0).y>.1);
});
test('frame-by-frame weather timing never skips a stage at fractional boundaries',()=>{
  for(const fps of [30,60,120,144]){
    const s={time:15,weather:'sunny',elapsed:0};let changes=0;
    for(let i=0;i<fps*300;i++)if(model.advanceWeather(s,1/fps))changes++;
    assert.equal(changes,5);assert.equal(s.weather,'sunny');assert.ok(s.elapsed<.001);
  }
});
test('storm waves stay gentle and aurora is delayed and probabilistic',()=>{
  for(let t=0;t<60;t+=.05){assert.ok(Math.abs(model.seaHeight(1,1,t,1))<.18);assert.ok(Math.abs(model.seaHeight(1,1,t+.016,1)-model.seaHeight(1,1,t,1))<.002);}
  const yes=model.weatherEvents('night',()=>.1),no=model.weatherEvents('night',()=>.9);
  assert.ok(yes.auroraAt>=20);assert.equal(no.auroraAt,Infinity);
  assert.ok(model.weatherEvents('storm',()=>.5).lightningAt>=8);
});
test('night effects remain over the model and do not turn with the camera',()=>{
  const scene=new THREE.Scene(),effects=createVoyageEffects(scene);
  effects.update({time:30,elapsed:40,weather:'night',events:{auroraAt:0,dolphinsAt:Infinity},nightMix:1,dt:1,wave:()=>0,cameraYaw:1.7});
  const sky=scene.children[0],bounds=new THREE.Box3().setFromObject(sky);
  assert.ok(bounds.min.x>=-5&&bounds.max.x<=5,'night sky must fit the model width');
  assert.ok(bounds.min.z>=-3.7&&bounds.max.z<=3.7,'night sky must fit the model depth');
  assert.ok(bounds.min.y>=2.7&&bounds.max.y<=7.2,'night sky must stay close above the ocean');
  assert.equal(sky.rotation.y,0,'the miniature sky must not track the camera');
});
test('first night guarantees a delayed aurora and its layers unfold before the water glows',()=>{
  const event=model.weatherEvents('night',()=>.99,true);assert.ok(event.auroraAt>=3&&event.auroraAt<=5);
  assert.equal(typeof aurora.auroraStage,'function');
  assert.deepEqual(aurora.auroraStage(0,event.auroraAt).layers,[0,0,0,0]);
  const early=aurora.auroraStage(6,event.auroraAt),late=aurora.auroraStage(22,event.auroraAt);
  assert.ok(early.layers[0]>early.layers[3]);assert.equal(early.water,0);
  assert.ok(late.layers.every(v=>v>.99));assert.ok(late.water>.99);
});
test('all four moving curtains stay inside the miniature footprint',()=>{
  assert.equal(typeof aurora.auroraPoint,'function');
  for(let layer=0;layer<4;layer++)for(let t=0;t<90;t+=3)for(let u=0;u<=1;u+=.04)for(const v of [0,.5,1]){
    const p=aurora.auroraPoint(layer,u,v,t);
    assert.ok((Math.abs(p.x)/5.8)**4.65+(Math.abs(p.z)/4.45)**4.65<1);
    assert.ok(p.y>2.7&&p.y<7.2);
  }
});
test('aurora illumination follows its entrance and fades away on leaving night',()=>{
  assert.equal(typeof aurora.createAurora,'function');
  const scene=new THREE.Scene(),show=aurora.createAurora(scene);
  const lights=[];scene.traverse(o=>{if(o.isPointLight)lights.push(o);});
  assert.ok(lights.length>=2);assert.equal(show.waterGlow.value,0);
  for(let i=0;i<1200;i++)show.update(i/60,i/60,'night',3.5,1/60);
  assert.ok(show.waterGlow.value>.8);assert.ok(lights.some(l=>l.intensity>1));
  for(let i=0;i<600;i++)show.update(20+i/60,i/60,'sunny',Infinity,1/60);
  assert.ok(show.waterGlow.value<.001);assert.ok(lights.every(l=>l.intensity<.01));
});
test('gulls vanish in storm and night, then return softly in sunshine',()=>{
  assert.equal(typeof model.updateGullVisibility,'function');
  const birds=Array.from({length:4},()=>{const g=new THREE.Group();g.add(new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshBasicMaterial({transparent:true})));return g;});
  for(const weather of ['storm','night'])for(const [i,bird] of birds.entries()){model.updateGullVisibility(bird,weather,i,.016);assert.equal(bird.visible,false);}
  for(const [i,bird] of birds.entries()){model.updateGullVisibility(bird,'sunny',i,.016);assert.equal(bird.visible,true);assert.ok(bird.children[0].material.opacity>0&&bird.children[0].material.opacity<.1);}
  for(let frame=0;frame<400;frame++)for(const [i,bird] of birds.entries())model.updateGullVisibility(bird,'rainy',i,.016);
  assert.equal(birds.filter(b=>b.visible).length,2);
});
test('the full looping route keeps the hull and wake inside the ocean boundary', () => {
  assert.equal(typeof model.route, 'function', 'route is not implemented');
  for (let t = 0; t <= 120; t += 0.02) {
    const { x, z } = model.route(t);
    assert.ok(Math.abs(x) < 4.4 && Math.abs(z) < 3.1);
  }
  const a = model.route(0), b = model.route(120);
  assert.ok(Math.hypot(a.x-b.x,a.z-b.z) < 0.0001, 'loop must join continuously');
});
test('weather selection preserves travel time and rejects unknown modes', () => {
  assert.equal(typeof model.chooseWeather, 'function', 'weather selection is not implemented');
  const state = { time: 47.25, weather: 'sunny' };
  model.chooseWeather(state, 'rainy');
  assert.equal(state.time, 47.25);
  assert.equal(state.weather, 'rainy');
  model.chooseWeather(state, 'night');
  assert.equal(state.time, 47.25);
  assert.equal(state.weather, 'night');
  model.chooseWeather(state, 'invalid');
  assert.equal(state.weather, 'night');
});
test('muting or hiding cancels pending thunder and audio can resume cleanly',async(t)=>{
  t.mock.timers.enable({apis:['setTimeout']});
  const sources=[];let context;
  const parameter=()=>({value:0,setTargetAtTime(){},setValueAtTime(){},linearRampToValueAtTime(){}});
  const node=()=>({connect(other){return other;},disconnect(){},gain:parameter(),pan:parameter()});
  class FakeAudio{
    constructor(){context=this;this.currentTime=0;this.state='suspended';}
    addEventListener(){}createGain(){return node();}createStereoPanner(){return node();}
    createDynamicsCompressor(){return {...node(),threshold:parameter(),knee:parameter(),ratio:parameter(),attack:parameter(),release:parameter()};}
    createBufferSource(){const source={...node(),start(at){this.startedAt=at;},stop(){this.stopped=true;}};sources.push(source);return source;}
    async decodeAudioData(){return {duration:42};}async resume(){this.state='running';}async suspend(){this.state='suspended';}
  }
  const oldAudio=globalThis.AudioContext,oldDocument=globalThis.document;
  globalThis.AudioContext=FakeAudio;globalThis.document={hidden:false};
  try{
    const result=await build({entryPoints:['ambient-audio.mjs'],bundle:true,format:'esm',write:false,loader:{'.mp3':'dataurl'}});
    const module=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
    const audio=module.createAmbientAudio();await audio.setEnabled(true);assert.deepEqual(audio.loaded,['sea','rain','gull','thunder']);
    audio.setWeather('storm');audio.thunder();const thunder=sources.at(-1);assert.ok(thunder.startedAt>=1.4);
    await audio.setEnabled(false);assert.equal(thunder.stopped,true);t.mock.timers.tick(1000);assert.equal(context.state,'suspended');
    await audio.setEnabled(true);assert.equal(audio.enabled,true);audio.thunder();const second=sources.at(-1);
    await audio.setVisible(false);assert.equal(second.stopped,true);t.mock.timers.tick(1000);assert.equal(context.state,'suspended');
    await audio.setVisible(true);assert.equal(context.state,'running');assert.equal(audio.enabled,true);
    await audio.setEnabled(false);
  }finally{globalThis.AudioContext=oldAudio;globalThis.document=oldDocument;}
});
