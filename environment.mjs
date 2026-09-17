import {ENVIRONMENT as C} from './environment-config.mjs';
const clamp=x=>Math.max(0,Math.min(1,x));
const ease=x=>{x=clamp(x);return x*x*(3-2*x);};
const rain={clear:0,overcast:0,drizzle:.32,storm:1};
const shade={clear:0,overcast:.4,drizzle:.58,storm:1};
const night={day:0,dusk:0,night:1,dawn:.12};
export function createEnvironment(random=Math.random,initial={}){
 const range=a=>a[0]+random()*(a[1]-a[0]);
 let time=0,period=initial.period||'day',weather=initial.weather||'clear',fromPeriod=period;
 let periodAt=-100,weatherAt=-100,periodTransition=18,weatherTransition=18,oldRain=rain[weather],oldShade=shade[weather];
 let periodDue=range(C.periodDuration[period]),weatherDue=range(C.weatherDuration[weather]),lastStorm=weather==='storm'?0:-Infinity;
 let auroraAt=Infinity,eligible=false;
 const choose=()=>{const choices=Object.entries(C.transitions[weather]).filter(([key])=>key!=='storm'||time-lastStorm>=C.stormCooldown);let x=random()*choices.reduce((s,[,w])=>s+w,0);for(const [key,weight] of choices){x-=weight;if(x<0)return key;}return choices.at(-1)[0];};
 let nextWeather=choose();if(initial.fixed){periodDue=Infinity;weatherDue=Infinity;}
 function updateAurora(){const suitable=period==='night'&&(weather==='clear'||weather==='overcast');if(suitable&&!eligible)auroraAt=random()<C.auroraChance?time+range(C.auroraDelay):Infinity;if(!suitable)auroraAt=Infinity;eligible=suitable;}
 updateAurora();if(initial.aurora)auroraAt=0;
 function snapshot(){const p=ease((time-periodAt)/periodTransition),w=ease((time-weatherAt)/weatherTransition);return {
  worldTime:time,period,fromPeriod,periodBlend:p,weather,nextWeather,weatherAge:time-weatherAt,
  night:night[fromPeriod]+(night[period]-night[fromPeriod])*p,
  rain:oldRain+(rain[weather]-oldRain)*w,shade:oldShade+(shade[weather]-oldShade)*w,
  stormWarning:nextWeather==='storm'&&time>=weatherDue-C.stormWarning,
  transitionDuration:weatherTransition,auroraAt,auroraAllowed:eligible,
  nextPeriodIn:periodDue-time,nextWeatherIn:weatherDue-time
 };}
 return {snapshot,advance(dt){
  if(!Number.isFinite(dt)||dt<=0)return;
  const end=time+dt;
  while(Math.min(periodDue,weatherDue)<=end+1e-8){
   time=Math.min(periodDue,weatherDue);const before=snapshot();
   if(periodDue<=time+1e-8){fromPeriod=period;period=C.periods[(C.periods.indexOf(period)+1)%4];periodAt=time;periodTransition=range(C.transition);periodDue=time+range(C.periodDuration[period]);}
   if(weatherDue<=time+1e-8){oldRain=before.rain;oldShade=before.shade;weather=nextWeather;weatherAt=time;weatherTransition=range(C.transition);if(weather==='storm')lastStorm=time;weatherDue=time+range(C.weatherDuration[weather]);nextWeather=choose();}
   updateAurora();
  }
  time=end;
 }};
}
