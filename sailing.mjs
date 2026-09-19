export function sailingConfig(development=false,fast=false){
 return {intervalSeconds:development&&fast?5:60,autoSaveSeconds:25,maxGapSeconds:30};
}
const validAmount=value=>Number.isSafeInteger(value)&&value>0;
const seconds=value=>typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=Number.MAX_SAFE_INTEGER?value:0;
export function sanitizeSailing(value={}){
 value=value&&typeof value==='object'?value:{};
 return {points:Number.isSafeInteger(value.points)&&value.points>=0?value.points:0,
  accumulatedSeconds:seconds(value.accumulatedSeconds)<60?seconds(value.accumulatedSeconds):0,
  totalSailingSeconds:seconds(value.totalSailingSeconds)};
}
export function createSailing({initial,config=sailingConfig(),onSave=()=>true}={}){
 const data=sanitizeSailing(initial);let previous=null,previousWall=null,active=false,unsavedSeconds=0;
 const snapshot=()=>({...data});
 // Retain in-memory progress after failed writes; retry on the next save boundary, not every frame.
 function flush(){unsavedSeconds=0;return onSave(snapshot())!==false;}
 function tick(now,nextActive,wall=Date.now()){
  const elapsed=(now-previous)/1000,wallElapsed=(wall-previousWall)/1000;
  const stopped=active&&!nextActive;let earned=false;
  // Credit the previous state through this event. Wall time only detects sleep on clocks that stop with the OS.
  if(previous!==null&&active&&Number.isFinite(elapsed)&&elapsed>=0&&elapsed<=config.maxGapSeconds&&Number.isFinite(wallElapsed)&&wallElapsed>=0&&wallElapsed<=config.maxGapSeconds){
   data.totalSailingSeconds+=elapsed;data.accumulatedSeconds+=elapsed;unsavedSeconds+=elapsed;
   const count=Math.floor((data.accumulatedSeconds+1e-9)/config.intervalSeconds);
   if(count){data.points=Math.min(Number.MAX_SAFE_INTEGER,data.points+count);data.accumulatedSeconds=Math.max(0,data.accumulatedSeconds-count*config.intervalSeconds);earned=true;}
  }
  previous=now;previousWall=wall;active=Boolean(nextActive);
  if(earned||stopped||unsavedSeconds+1e-9>=config.autoSaveSeconds)flush();
 }
 const canAffordSailingPoints=amount=>validAmount(amount)&&data.points>=amount;
 return {tick,snapshot,flush,canAffordSailingPoints,
  addSailingPoints(amount){if(!validAmount(amount)||!Number.isSafeInteger(data.points+amount))return false;data.points+=amount;flush();return true;},
  spendSailingPoints(amount){if(!canAffordSailingPoints(amount))return false;data.points-=amount;flush();return true;}
 };
}
