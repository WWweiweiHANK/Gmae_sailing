import { test } from 'node:test';
import assert from 'node:assert/strict';
let model = {};
try { model = await import('./motion.mjs'); } catch {}
let sound = {};
try { sound = await import('./ambient-audio.mjs'); } catch {}
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
test('synthesized gull calls have audible, bounded samples and silent endpoints', () => {
  assert.equal(typeof sound.gullSamples,'function','gull synthesis is not implemented');
  const data=sound.gullSamples(22050,42);let energy=0,peak=0;
  for(const v of data){assert.ok(Number.isFinite(v));energy+=v*v;peak=Math.max(peak,Math.abs(v));}
  assert.ok(Math.sqrt(energy/data.length)>.02);assert.ok(peak<1);assert.ok(Math.abs(data[0])<.0001);assert.ok(Math.abs(data.at(-1))<.0001);
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
