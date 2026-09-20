import {encounterCatalog} from './encounter-catalog.mjs';
export const voyageIntentCatalog=[
 {id:'free_sailing',name:'随海而行',journalText:'不追什么，让船继续随海慢慢走。',hintText:'不必总去寻找什么。',icon:'wave',encounterWeightModifiers:{},possibleResponses:[],currentText:'最近，我们没有特别寻找什么。'},
 {id:'follow_deep_creature',name:'追随深海踪迹',journalText:'沿着那个影子离开的方向继续航行。',hintText:'更深的海。',icon:'whale',encounterWeightModifiers:{giant_whale_shadow:2,giant_whale_surface:2.5,underwater_fish_school:1.4},possibleResponses:['giant_whale_surface'],currentText:'现在，我们正沿着深海的踪迹航行。'},
 {id:'follow_migration',name:'跟随迁徙鸟群',journalText:'跟着那些鸟飞去的方向看看。',hintText:'它们似乎正朝更冷的地方飞。',icon:'feather',encounterWeightModifiers:{massive_bird_migration:2,polar_bear_ice:1.8},possibleResponses:['massive_bird_migration','polar_bear_ice'],currentText:'最近，我们顺着鸟群飞去的方向。'},
 {id:'follow_light',name:'寻找远处的灯光',journalText:'朝着那束灯光出现的方向继续。',hintText:'雾的另一边好像还有什么。',icon:'light',encounterWeightModifiers:{fog_lighthouse:2.3,bioluminescent_sea:1.4},possibleResponses:['fog_lighthouse','bioluminescent_sea'],currentText:'最近，我们在留意雾里的灯光。'},
 {id:'seek_night_wonders',name:'等待星夜',journalText:'等夜再深一些，也许还能看见什么。',hintText:'夜还没有完全安静下来。',icon:'meteor',encounterWeightModifiers:{meteor_shower:2.2,bioluminescent_sea:2,aurora:1.5},possibleResponses:['meteor_shower','bioluminescent_sea'],currentText:'现在，我们正等着夜里的微光。'},
 {id:'follow_cold_current',name:'顺着寒冷海流',journalText:'顺着越来越冷的海水继续走。',hintText:'海水正在变冷。',icon:'ice',encounterWeightModifiers:{polar_bear_ice:2.5,massive_bird_migration:1.4,fog_lighthouse:1.3},possibleResponses:['polar_bear_ice'],currentText:'最近，我们沿着微凉的海流。'},
 {id:'follow_pink_visitor',name:'等待熟悉的来客',journalText:'以后如果再看到它，就跟着它一会儿。',hintText:'也许它还记得这艘船。',icon:'dolphin',encounterWeightModifiers:{pink_dolphin:2},possibleResponses:['pink_dolphin'],currentText:'最近，我们留意着那抹熟悉的粉色。'}
].map(e=>({durationMin:1200,durationMax:2700,followupIntentIds:['free_sailing'],...e}));
export const intentById=id=>voyageIntentCatalog.find(e=>e.id===id);
export function intentOptions(entry){const e=encounterCatalog.find(e=>e.id===entry?.encounterId);return e?.canCreateIntent&&(entry.seenCount??1)>=(e.intentMinSeen??1)?e.intentOptions.map(intentById).filter(Boolean):[];}
const date=v=>typeof v==='string'&&Number.isFinite(Date.parse(v))?v:null;
const finite=v=>Number.isFinite(v)&&v>=0&&v<=Number.MAX_SAFE_INTEGER?v:0;
const free=()=>({currentIntentId:'free_sailing',sourceEncounterId:null,sourceJournalEntryId:null,startedAt:null,activeElapsedSeconds:0,targetDurationSeconds:0,responseCount:0,allowOverride:true});
export function sanitizeVoyageIntents(value={}){
 const clean=s=>{if(!s||!intentById(s.currentIntentId))return free();return {...free(),currentIntentId:s.currentIntentId,sourceEncounterId:encounterCatalog.some(e=>e.id===s.sourceEncounterId)?s.sourceEncounterId:null,sourceJournalEntryId:typeof s.sourceJournalEntryId==='string'?s.sourceJournalEntryId.slice(0,180):null,startedAt:date(s.startedAt),activeElapsedSeconds:finite(s.activeElapsedSeconds),targetDurationSeconds:Math.min(intentById(s.currentIntentId).durationMax,finite(s.targetDurationSeconds)),responseCount:Math.floor(finite(s.responseCount))};};
 return {voyageIntentState:clean(value.voyageIntentState),voyageIntentHistory:(Array.isArray(value.voyageIntentHistory)?value.voyageIntentHistory:[]).filter(s=>s&&intentById(s.currentIntentId)&&['completed','expired','replaced'].includes(s.endedReason)).map(s=>({...clean(s),endedReason:s.endedReason,endedAt:date(s.endedAt)}))};
}
export function createVoyageIntentManager({store,total=()=>0,random=Math.random,now=()=>new Date()}){
 let {voyageIntentState:state,voyageIntentHistory:history}=sanitizeVoyageIntents(store.read()),baseline=total();
 const patch=()=>({voyageIntentState:state,voyageIntentHistory:history});
 function finish(reason){history.push({...state,endedReason:reason,endedAt:now().toISOString()});state=free();}
 function sync(){const current=total(),delta=Math.max(0,current-baseline);baseline=current;if(!state.startedAt)return;state.activeElapsedSeconds+=delta;if(state.activeElapsedSeconds>=state.targetDurationSeconds){finish('expired');store.save(patch());}}
 function setIntent(id,context={},debug=false){
  const intent=intentById(id);if(!intent)return 'invalid';sync();
  const entries=store.read().journalEntries,entry=entries.find(e=>e.id===context.sourceJournalEntryId);
  if(!debug){if(!entry||entry.encounterId!==context.sourceEncounterId||!intentOptions(entry).some(e=>e.id===id))return 'invalid';if(entry.selectedIntentId)return 'already-selected';}
  const at=date(context.selectedAt)??now().toISOString(),next={...free(),currentIntentId:id,sourceEncounterId:entry?.encounterId??null,sourceJournalEntryId:entry?.id??null,startedAt:at,targetDurationSeconds:intent.durationMin+Math.max(0,Math.min(1,random()))*(intent.durationMax-intent.durationMin)};
  const nextHistory=state.startedAt?[...history,{...state,endedReason:'replaced',endedAt:at}]:history;
  if(entry)Object.assign(entry,{selectedIntentId:id,selectedIntentText:intent.journalText,selectedIntentAt:at,read:true});
  if(!store.commit({voyageIntentState:next,voyageIntentHistory:nextHistory,...(entry?{journalEntries:entries}:{})}))return 'save-failed';
  state=next;history=nextHistory;baseline=total();return 'selected';
 }
 return {setIntent,snapshot(){sync();return structuredClone(state);},save(){sync();return store.save(patch());},
  modifiers(){sync();const definition=intentById(state.currentIntentId),fade=Math.min(1,Math.max(0,(state.targetDurationSeconds-state.activeElapsedSeconds)/120));return Object.fromEntries(Object.entries(definition.encounterWeightModifiers).map(([id,weight])=>[id,1+(weight-1)*fade]));},
  respond(event){
   if(event.preview||event.interrupted)return {};sync();if(!state.startedAt)return {};
   const definition=intentById(state.currentIntentId),source=encounterCatalog.find(e=>e.id===state.sourceEncounterId);
   const responses=state.currentIntentId==='free_sailing'?[source?.followup,source?.id]:definition.possibleResponses;
   if(!responses.includes(event.encounterId))return {};
   const response={intentResponse:true,respondedToIntentId:state.currentIntentId,respondedToJournalEntryId:state.sourceJournalEntryId};state.responseCount++;finish('completed');store.save(patch());return response;
  },
  currentText(){sync();return intentById(state.currentIntentId).currentText;}
 };
}
