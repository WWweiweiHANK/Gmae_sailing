import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
let model = {};
try { model = await import('./motion.mjs'); } catch {}
let sound = {};
try { sound = await import('./audio-mix.mjs'); } catch {}
test('sea swells travel over time while the cut boundary remains sealed', () => {
  assert.equal(typeof model.seaHeight, 'function', 'ocean swells are not implemented');
  let lo=Infinity, hi=-Infinity;
  for(let t=0;t<30;t+=.1){const h=model.seaHeight(0,0,t);lo=Math.min(lo,h);hi=Math.max(hi,h);assert.ok(Math.abs(model.seaHeight(5.8,0,t))<1e-8);assert.ok(Math.abs(model.seaHeight(0,4.45,t))<1e-8);}
  assert.ok(hi-lo>.2, 'swells must visibly rise and fall');
  assert.ok(hi-lo<.65, 'waves should remain gentle');
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
test('storm waves are visibly stronger and aurora is delayed and probabilistic',()=>{
  assert.ok(Math.abs(model.seaHeight(0,1,3,1))>Math.abs(model.seaHeight(0,1,3,0))*1.6);
  const yes=model.weatherEvents('night',()=>.1),no=model.weatherEvents('night',()=>.9);
  assert.ok(yes.auroraAt>=20);assert.equal(no.auroraAt,Infinity);
  assert.ok(model.weatherEvents('storm',()=>.5).lightningAt>=8);
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
