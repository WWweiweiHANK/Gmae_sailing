export function route(time) {
  const a = time * Math.PI / 60;
  return { x: 3.25 * Math.sin(a), z: 2.05 * Math.sin(2 * a + 0.45) };
}
export const WEATHER_ORDER=['sunny','rainy','storm','dusk','night'];
export function chooseWeather(state, weather) {
  if (WEATHER_ORDER.includes(weather)){state.weather=weather;state.elapsed=0;}
}
export function advanceWeather(state,dt){
  state.elapsed=(state.elapsed||0)+dt;
  if(state.elapsed<60-1e-8)return false;
  const steps=Math.floor((state.elapsed+1e-8)/60);
  const next=(WEATHER_ORDER.indexOf(state.weather)+steps)%WEATHER_ORDER.length;
  state.weather=WEATHER_ORDER[next];state.elapsed=Math.max(0,state.elapsed-steps*60);return true;
}
export function weatherEvents(weather,random=Math.random){
  return {dolphinsAt:weather==='sunny'?8+random()*10:Infinity,
    lightningAt:weather==='storm'?8+random()*12:weather==='rainy'&&random()<.25?30+random()*15:Infinity,
    auroraAt:weather==='night'&&random()<.45?22+random()*12:Infinity};
}
export function dolphinPose(u,lane=0){
  u=Math.max(0,Math.min(1,u));
  const dive=Math.min(1,u/.13,(1-u)/.16);
  return {x:-4.9+9.8*u,z:1.9+lane*.43+.22*Math.sin(u*Math.PI*2),y:-.7+Math.max(0,dive)*(.9+.4*Math.sin(u*Math.PI*6))};
}
export function seaHeight(x, z, time, rain = 0) {
  const edge = Math.max(0, Math.min(1, (1 - (Math.abs(x)/5.8)**4.65 - (Math.abs(z)/4.45)**4.65) * 5));
  const p=x*.7+z*1.65-time*1.05;
  const swell=.14*Math.sin(p)+.035*Math.sin(2*p-.4);
  const crossing=.055*Math.sin(x*1.6-z*.65-time*.72);
  const ripple=.014*Math.sin(x*4.2+z*2.8-time*1.7);
  return (swell+crossing+ripple)*edge*(1+rain*1.4);
}
