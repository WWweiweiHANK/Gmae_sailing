import { test } from 'node:test';
import assert from 'node:assert/strict';
let model = {};
try { model = await import('./motion.mjs'); } catch {}
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
