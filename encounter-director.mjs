import {encounterCatalog,ENCOUNTER_PACING as DEFAULT,QUIET_JOURNAL_PACING as QUIET,sanitizeEncounters,souvenirIds} from './encounter-catalog.mjs';
export function createEncounterDirector({store,bus,shipName,intents=null,random=Math.random,now=()=>new Date(),config=DEFAULT}){
 const data=sanitizeEncounters(store.read()),state=data.encounterDirectorState,history=data.encounterHistory,slots=new Map();
 const range=a=>a[0]+random()*(a[1]-a[0]);let sinceSave=0,latestEnv=null,lastCompleted=null;
 for(const tier of ['ambient','special','wonder'])if(state.next[tier]===undefined)state.next[tier]=state.time+range(tier==='ambient'&&Object.keys(history).length<2?config.firstAmbient:config.windows[tier]);
 if(!state.nextQuietAt)state.nextQuietAt=state.time+range(QUIET.window);
 function limitWaits(){
  state.quietUntil=Math.min(state.quietUntil,state.time+config.quietAfterMajor[1]);state.wonderUntil=Math.min(state.wonderUntil,state.time+config.wonderGap);
  for(const e of encounterCatalog)if(state.cooldowns[e.id]!==undefined)state.cooldowns[e.id]=Math.min(state.cooldowns[e.id],state.time+e.cooldown*(config.cooldownScale??1));
  for(const tier of ['ambient','special','wonder'])state.next[tier]=Math.min(state.next[tier],state.time+config.windows[tier][1]);
 }
 if(config.cooldownScale<1)limitWaits();
 const persist=()=>store.save(data);
 function condition(e,env){return !!env&&e.conditions.time.includes(env.period)&&e.conditions.weather.includes(env.weather)&&!env.stormWarning&&(env.rain??0)<.7&&(env.period!=='night'||(env.night??1)>.8)&&(e.tier==='ambient'||(!(env.aurora>.05)&&(env.auroraDueIn??Infinity)>e.maxDuration+config.exitSeconds));}
 function reason(e,env,ignoreTiming=false,preview=false){
  if(!e)return 'invalid';if(preview)return null;if(!condition(e,env))return 'conditions';
  if(e.conditions.prerequisite&&!history[e.conditions.prerequisite]?.completedCount)return 'prerequisite';
  const slot=e.tier==='ambient'?'ambient':'major';if(slots.has(slot))return 'slot';
  // A single shared dolphin pod cannot simultaneously host both visitors.
  if([...slots.values()].some(a=>a.id.includes('dolphin')&&e.id.includes('dolphin')))return 'slot';
  if(ignoreTiming)return null;
  if(state.time<state.quietUntil)return 'quiet';if(e.tier==='wonder'&&state.time<state.wonderUntil)return 'cooldown';
  if(state.time<(state.cooldowns[e.id]??0))return 'cooldown';if(state.lastId===e.id)return 'repeat';if(state.lastCategory===e.category&&state.categoryStreak>=2)return 'category';return null;
 }
 function startEncounter(id,env=latestEnv,{ignoreTiming=false,preview=false,staged=false}={}){
  const e=encounterCatalog.find(e=>e.id===id),blocked=reason(e,env,ignoreTiming,preview||staged);if(blocked)return blocked;
  const slot=e.tier==='ambient'?'ambient':'major',duration=range([e.minDuration,e.maxDuration]);
  slots.set(slot,{id,slot,elapsed:0,duration,phase:'enter',seen:false,firstTime:false,seenCount:0,badgeUnlocked:false,souvenirUnlocked:false,startTime:now().toISOString(),weather:env.weather,timeOfDay:env.period,shipName:shipName(),seed:random(),persistentVisitorId:e.persistentVisitorId,preview,staged});
  if(preview)return 'started';
  state.lastId=id;state.categoryStreak=state.lastCategory===e.category?state.categoryStreak+1:1;state.lastCategory=e.category;state.cooldowns[id]=state.time+e.cooldown*(config.cooldownScale??1);
  state.next[e.tier]=state.time+range(config.windows[e.tier]);if(e.tier==='wonder')state.wonderUntil=state.time+config.wonderGap;
  persist();return 'started';
 }
 function unlockSouvenir(id){if(!souvenirIds.includes(id)||data.ownedSouvenirs.includes(id))return false;data.ownedSouvenirs.push(id);persist();return true;}
 function confirmVisible(id){
  const a=[...slots.values()].find(a=>a.id===id);if(!a||a.seen||a.interrupted)return false;
  if(a.preview){a.seen=true;return true;}
  const e=encounterCatalog.find(e=>e.id===id),old=history[id],at=now().toISOString();a.seen=true;a.firstTime=!old;a.seenCount=(old?.seenCount??0)+1;
  history[id]={firstSeenAt:old?.firstSeenAt??at,lastSeenAt:at,seenCount:a.seenCount,completedCount:old?.completedCount??0,persistentVisitorId:e.persistentVisitorId};state.lastSeenTime=state.time;persist();
  bus.emitWorldEvent('encounter_seen',{encounterId:id,startTime:a.startTime,firstTime:a.firstTime,seenCount:a.seenCount});return true;
 }
 function endEncounter(id,interrupted=false){
  const a=[...slots.values()].find(a=>a.id===id);if(!a)return false;slots.delete(a.slot);
  if(a.preview)return true;
  if(a.slot==='major')state.quietUntil=state.time+range(config.quietAfterMajor);
  if(a.seen){if(!interrupted){history[id].completedCount++;const reward=encounterCatalog.find(e=>e.id===id).souvenirReward;if(reward)a.souvenirUnlocked=unlockSouvenir(reward);}
   lastCompleted={encounterId:id,startTime:a.startTime,endTime:now().toISOString(),weather:a.weather,timeOfDay:a.timeOfDay,shipName:a.shipName,firstTime:a.firstTime,seenCount:a.seenCount,souvenirUnlocked:a.souvenirUnlocked,badgeUnlocked:a.badgeUnlocked,persistentVisitorId:a.persistentVisitorId,interrupted,logTemplate:encounterCatalog.find(e=>e.id===id).logTemplate};
   if(!interrupted)Object.assign(lastCompleted,intents?.respond(lastCompleted));
   bus.emitWorldEvent(interrupted?'encounter_interrupted':'encounter_completed',lastCompleted);
  }persist();return true;
 }
 function schedule(tier,env){
  state.next[tier]=state.time+range(config.windows[tier]);
  let bag=state.bags[tier];if(!bag.length)bag=state.bags[tier]=[...encounterCatalog.filter(e=>e.tier===tier).map(e=>e.id),null];
  const candidates=bag.map(id=>encounterCatalog.find(e=>e.id===id)??null).filter(e=>!e||!reason(e,env));
  if(!candidates.length)return;
  const pity=Math.min(.18,(state.time-state.lastSeenTime)/7200*.18),chance=Math.min(.92,config.chance[tier]+pity);
  if(random()>chance)return;
  const modifiers=intents?.modifiers()??{};
  const weight=e=>e?e.weight*(modifiers[e.id]??1)*(state.lastCategory===e.category ? .3 : 1)*(e.repeatPolicy==='diminish'&&history[e.id]?.seenCount ? .25 : 1):1.5;
  let draw=random()*candidates.reduce((n,e)=>n+weight(e),0),selected=candidates.at(-1);
  for(const e of candidates){draw-=weight(e);if(draw<=0){selected=e;break;}}
  state.bags[tier]=bag.filter(id=>id!==(selected?.id??null));if(selected)startEncounter(selected.id,env);
 }
 function stageEncounter(id,env=latestEnv,preview=false){if(!encounterCatalog.some(e=>e.id===id))return 'invalid';for(const a of [...slots.values()])endEncounter(a.id,true);return startEncounter(id,env,{preview,staged:true});}
 return {startEncounter,endEncounter,confirmVisible,unlockSouvenir,save:persist,stageEncounter,
  previewEncounter:(id,env)=>stageEncounter(id,env,true),
  setPacing(next){config=next;for(const tier of ['ambient','special','wonder'])state.next[tier]=state.time+range(config.windows[tier]);limitWaits();persist();},
  active:()=>[...slots.values()].map(a=>({...a})),snapshot:()=>({...structuredClone(data),activeEncounterSlots:[...slots.values()].map(a=>({...a})),lastCompleted}),
  advance(dt,env,running=true){latestEnv=env;if(!running||!Number.isFinite(dt)||dt<=0||dt>30)return;state.time+=dt;sinceSave+=dt;
   for(const a of [...slots.values()]){a.elapsed+=dt;const e=encounterCatalog.find(e=>e.id===a.id);
    if(!a.preview&&!a.staged&&!a.interrupted&&!condition(e,env)){a.interrupted=true;a.exitAt=a.elapsed;}
    a.phase=a.interrupted||a.elapsed>a.duration-4?'exit':a.elapsed<4?'enter':'play';
    if(a.interrupted?a.elapsed-a.exitAt>=config.exitSeconds:a.elapsed>=a.duration)endEncounter(a.id,!!a.interrupted);
   }
   if(state.time>=state.nextQuietAt){
    state.nextQuietAt=state.time+range(QUIET.window);const at=now(),date=`${at.getFullYear()}-${String(at.getMonth()+1).padStart(2,'0')}-${String(at.getDate()).padStart(2,'0')}`;
    if(!slots.size&&!env.stormWarning&&env.weather!=='storm'&&state.time-state.lastSeenTime>=QUIET.silence&&state.lastQuietDate!==date&&random()<QUIET.chance){
     state.lastQuietDate=date;state.quietCount++;bus.emitWorldEvent('encounter_completed',{encounterId:'quiet_day',startTime:at.toISOString(),endTime:at.toISOString(),weather:env.weather,timeOfDay:env.period,shipName:shipName(),firstTime:state.quietCount===1,seenCount:state.quietCount,badgeUnlocked:false,souvenirUnlocked:false});persist();
    }
   }
   for(const tier of ['wonder','special','ambient'])if(state.time>=state.next[tier])schedule(tier,env);
   if(sinceSave>=25){sinceSave=0;persist();}
  }
 };
}
