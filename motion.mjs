export function route(time) {
  const a = time * Math.PI / 60;
  return { x: 3.25 * Math.sin(a), z: 2.05 * Math.sin(2 * a + 0.45) };
}
export function chooseWeather(state, weather) {
  if (['sunny', 'rainy', 'night'].includes(weather)) state.weather = weather;
}
export function seaHeight(x, z, time, rain = 0) {
  const edge = Math.max(0, Math.min(1, (1 - (Math.abs(x)/5.8)**4.65 - (Math.abs(z)/4.45)**4.65) * 5));
  const p=x*.7+z*1.65-time*1.05;
  const swell=.14*Math.sin(p)+.035*Math.sin(2*p-.4);
  const crossing=.055*Math.sin(x*1.6-z*.65-time*.72);
  const ripple=.014*Math.sin(x*4.2+z*2.8-time*1.7);
  return (swell+crossing+ripple)*edge*(1+rain*.2);
}
