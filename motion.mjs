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
export function weatherEvents(weather,random=Math.random,firstNight=false){
  return {dolphinsAt:weather==='sunny'?8+random()*10:Infinity,
    lightningAt:weather==='storm'?8+random()*12:weather==='rainy'&&random()<.25?30+random()*15:Infinity,
    auroraAt:weather==='night'?(firstNight?3.5:random()<.45?22+random()*12:Infinity):Infinity};
}
export function dolphinPose(u,lane=0){
  u=Math.max(0,Math.min(1,u));
  const edge=Math.max(0,Math.min(1,u/.16,(1-u)/.19));
  const dive=edge*edge*(3-2*edge);
  return {x:-4.3+8.6*u,z:1.65+lane*.47+.23*Math.sin(u*Math.PI*2),y:-.85+dive*(1.06+.25*Math.sin(u*Math.PI*4+lane*.45))};
}
export function updateGullVisibility(group,weather,index,dt){
  const absent=weather==='storm'||weather==='night';
  const target=absent?0:weather==='rainy'||weather==='dusk'?(index<2?1:0):1;
  const old=group.userData.fade??1;
  const fade=absent?0:old+(target-old)*(1-Math.exp(-dt*2.2));
  group.userData.fade=fade;group.visible=fade>.005;
  group.traverse(part=>{if(part.isMesh)part.material.opacity=fade;});
}
export function seaHeight(x, z, time, rain = 0) {
  const rim = Math.max(0, Math.min(1, (1 - (Math.abs(x)/5.8)**4.65 - (Math.abs(z)/4.45)**4.65) * 4));
  const edge=rim*rim*(3-2*rim);
  const p=x*.55+z*1.15-time*.46;
  const swell=.075*Math.sin(p)+.012*Math.sin(2*p-.4);
  const crossing=.026*Math.sin(x*1.05-z*.55-time*.31);
  const ripple=.006*Math.sin(x*2.1+z*1.8-time*.58);
  return (swell+crossing+ripple)*edge*(1+rain*.35);
}
