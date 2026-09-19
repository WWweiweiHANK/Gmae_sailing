// Experience badges never consume sailing points. Keep conditions in this catalog.
export const badgeCatalog=[
 {id:'dolphin',name:'海豚同行',icon:'dolphin',description:'一群海豚曾跃出海面，陪小船走过一程。',unlockType:'event',unlockCondition:'dolphin_seen',hiddenBeforeUnlock:true},
 {id:'whale',name:'远鲸',icon:'whale',description:'远方的鲸，留下了一次安静的相遇。',unlockType:'event',unlockCondition:'whale_seen',hiddenBeforeUnlock:true},
 {id:'aurora_night',name:'极光之夜',icon:'aurora',description:'那一夜，流动的极光照亮了小小的海。',unlockType:'event',unlockCondition:'aurora_started',hiddenBeforeUnlock:true},
 {id:'through_storm',name:'穿过风雨',icon:'storm',description:'小船曾在风雨中，继续向前。',unlockType:'event',unlockCondition:'storm_started',hiddenBeforeUnlock:true},
 {id:'golden_sea',name:'金色海面',icon:'sunset',description:'暮色把船和海面，轻轻染成了金色。',unlockType:'event',unlockCondition:'sunset_started',hiddenBeforeUnlock:true},
 {id:'starry_night',name:'星夜航行',icon:'stars',description:'在星光下，静静航行了十分钟。',unlockType:'night',unlockCondition:600,hiddenBeforeUnlock:false},
 {id:'first_voyage',name:'初次远航',icon:'sail',description:'小船已经累计航行了一小时。',unlockType:'total',unlockCondition:3600,hiddenBeforeUnlock:false},
 {id:'old_sailor',name:'老水手',icon:'anchor',description:'十小时的航程，慢慢成为熟悉的日常。',unlockType:'total',unlockCondition:36000,hiddenBeforeUnlock:false},
 {id:'sea_glass',name:'海玻璃',icon:'glass',description:'海浪送来了一小片温润的海玻璃。',unlockType:'event',unlockCondition:'sea_glass_found',hiddenBeforeUnlock:true},
 {id:'unknown_memory',name:'未写的见闻',icon:'compass',description:'属于小船的下一段故事。',unlockType:'future',unlockCondition:null,hiddenBeforeUnlock:true}
].map((badge,displayOrder)=>({...badge,displayOrder}));
export function badgeId(id){return id==='aurora'?'aurora_night':badgeCatalog.some(b=>b.id===id)?id:null;}
export function sanitizeBadges(records){
 const seen=new Set();return (Array.isArray(records)?records:[]).flatMap(record=>{
  const id=badgeId(record?.badgeId);if(!id||seen.has(id))return [];seen.add(id);
  const date=typeof record.unlockedAt==='string'?Date.parse(record.unlockedAt):NaN;
  return [{badgeId:id,unlockedAt:Number.isFinite(date)?new Date(date).toISOString():null,sourceEventId:typeof record.sourceEventId==='string'?record.sourceEventId.slice(0,160):null}];
 });
}
export function sanitizeBadgeProgress(value){return {nightSailingSeconds:Number.isFinite(value?.nightSailingSeconds)&&value.nightSailingSeconds>=0?value.nightSailingSeconds:0};}
export function createWorldEventBus(){
 const listeners=new Set(),allowed=new Set([...badgeCatalog.filter(b=>b.unlockType==='event').map(b=>b.unlockCondition),'sailing_milestone','encounter_seen','encounter_completed','encounter_interrupted']);
 return {subscribe(fn){listeners.add(fn);return ()=>listeners.delete(fn);},emitWorldEvent(type,data={}){if(!allowed.has(type))return false;for(const fn of listeners)fn(type,data&&typeof data==='object'?data:{});return true;}};
}
export function createVisualEventTracker(emit){
 let previous={};const types={aurora:'aurora_started',dolphin:'dolphin_seen',whale:'whale_seen',storm:'storm_started',sunset:'sunset_started'};
 return visible=>{for(const [key,type] of Object.entries(types))if(visible[key]&&!previous[key])emit(type);previous={...visible};};
}
export function createBadges({store,customization,bus,total,config={},onChange=()=>{}}){
 let previousTotal=total(),progress=sanitizeBadgeProgress(store.read().badgeProgress),retryAt=0,lastSecond=-1;
 const pending=new Map(),owns=id=>store.read().ownedBadges.some(b=>b.badgeId===id);
 const threshold=b=>config[b.id]??b.unlockCondition;
 function unlockBadge(id,context={}){
  if(!badgeCatalog.some(b=>b.id===id))return 'invalid';if(owns(id)){pending.delete(id);return 'owned';}
  const record=pending.get(id)??{badgeId:id,unlockedAt:new Date().toISOString(),sourceEventId:typeof context.sourceEventId==='string'?context.sourceEventId:context.type??null};
  if(!store.commit({ownedBadges:[...store.read().ownedBadges,record],badgeProgress:progress})){pending.set(id,record);return 'save-failed';}
  pending.delete(id);onChange();return 'unlocked';
 }
 bus.subscribe((type,data)=>{for(const b of badgeCatalog)if(b.unlockType==='event'&&b.unlockCondition===type)unlockBadge(b.id,{...data,type});});
 return {unlockBadge,progress:()=>({...progress}),
  advance(night){
   const current=total(),delta=Math.max(0,current-previousTotal);previousTotal=current;if(night)progress.nightSailingSeconds+=delta;
   if(pending.size&&Date.now()>=retryAt){retryAt=Date.now()+1000;for(const id of [...pending.keys()])unlockBadge(id);}
   if(Math.floor(current)===lastSecond)return;lastSecond=Math.floor(current);
   for(const b of badgeCatalog)if((b.unlockType==='total'||b.unlockType==='night')&&!owns(b.id)&&(b.unlockType==='total'?current:progress.nightSailingSeconds)>=threshold(b)){
    if(unlockBadge(b.id,{sourceEventId:'sailing_milestone:'+b.id})==='unlocked')bus.emitWorldEvent('sailing_milestone',{badgeId:b.id,totalSailingSeconds:current});
   }
   onChange();
  },
  views(){const saved=store.read();return badgeCatalog.map(b=>{const record=saved.ownedBadges.find(r=>r.badgeId===b.id);
   if(!record&&b.hiddenBeforeUnlock)return {id:b.id,name:'???',description:'尚未发现',icon:null,owned:false};
   return {id:b.id,name:b.name,description:b.description,icon:b.icon,owned:!!record,...(record?{...record,isNew:!saved.seenBadgeNotifications.includes(b.id)}:{progress:Math.min(threshold(b),b.unlockType==='total'?total():progress.nightSailingSeconds),required:threshold(b),night:b.unlockType==='night'})};
  });},
  markSeen(ids){const saved=store.read();const next=[...new Set([...saved.seenBadgeNotifications,...ids.filter(owns)])];if(next.length===saved.seenBadgeNotifications.length)return true;return store.commit({seenBadgeNotifications:next});},
  equip(id){if(id!==null&&!owns(id))return 'locked';const shipCustomization={...customization.data,equippedBadge:id};if(!store.commit({shipCustomization}))return 'save-failed';customization.update({equippedBadge:id},{save:false});onChange();return 'equipped';}
 };
}
