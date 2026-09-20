import {encounterCatalog,souvenirIds} from '../encounter-catalog.mjs';
import {journalTemplateCatalog,journalText,periodNames,weatherNames} from './journal-templates.mjs';
import {intentById,intentOptions} from '../voyage-intents.mjs';
const date=v=>typeof v==='string'&&Number.isFinite(Date.parse(v));
export function journalNotice(entries){
 const notable=entries.filter(e=>!e.read&&encounterCatalog.some(c=>c.id===e.encounterId&&c.tier!=='ambient'));
 const clue=notable.find(e=>!e.selectedIntentId&&intentOptions(e).length),entry=clue??notable[0];
 return {kind:clue?'clue':entry?'record':'none',count:notable.length,entryId:entry?.id??null};
}
export function sanitizeJournal(value={}){
 const ids=new Set(),journalEntries=[];
 for(const e of Array.isArray(value.journalEntries)?value.journalEntries:[]){
  if(!e||typeof e.id!=='string'||ids.has(e.id)||!Object.hasOwn(journalTemplateCatalog,e.encounterId)||!date(e.timestamp)||typeof e.body!=='string'||typeof e.title!=='string')continue;
  const selected=intentOptions(e).some(i=>i.id===e.selectedIntentId)&&date(e.selectedIntentAt)?intentById(e.selectedIntentId):null;
  ids.add(e.id);journalEntries.push({read:typeof e.read==='boolean'?e.read:journalEntries.length<(value.journalState?.readCount??0),selectedIntentId:selected?.id??null,selectedIntentText:selected?(typeof e.selectedIntentText==='string'?e.selectedIntentText.slice(0,180):selected.journalText):null,selectedIntentAt:selected?e.selectedIntentAt:null,respondedToIntentId:intentById(e.respondedToIntentId)?.id??null,respondedToJournalEntryId:typeof e.respondedToJournalEntryId==='string'?e.respondedToJournalEntryId.slice(0,180):null,id:e.id.slice(0,180),timestamp:e.timestamp,date:typeof e.date==='string'?e.date.slice(0,10):e.timestamp.slice(0,10),timeOfDay:periodNames[e.timeOfDay]?e.timeOfDay:'day',weather:weatherNames[e.weather]?e.weather:'clear',encounterId:e.encounterId,title:e.title.slice(0,80),body:e.body.slice(0,1200),shipName:typeof e.shipName==='string'?e.shipName.slice(0,40):'小雨号',firstTime:e.firstTime===true,seenCount:Number.isSafeInteger(e.seenCount)&&e.seenCount>0?e.seenCount:1,badgeUnlocked:['dolphin','whale'].includes(e.badgeUnlocked)?e.badgeUnlocked:null,souvenirUnlocked:souvenirIds.includes(e.souvenirUnlocked)?e.souvenirUnlocked:null});
 }
 const read=value.journalState?.readCount;
 const ui=value.journalUiState??{},annotationKeys=new Set();
 const journalAnnotations=(Array.isArray(value.journalAnnotations)?value.journalAnnotations:[]).filter(a=>{
  if(!a||typeof a.slot!=='string'||typeof a.item!=='string'||typeof a.text!=='string'||!date(a.timestamp)||(a.sourceJournalEntryId&&!ids.has(a.sourceJournalEntryId)))return false;
  const key=[a.sourceJournalEntryId,a.slot,a.item].join(':');if(annotationKeys.has(key))return false;annotationKeys.add(key);return true;
 }).map(a=>({sourceJournalEntryId:a.sourceJournalEntryId??null,slot:a.slot.slice(0,40),item:a.item.slice(0,80),text:a.text.slice(0,160),timestamp:a.timestamp}));
 return {journalEntries,journalAnnotations,journalUiState:{lastOpenedPage:Number.isSafeInteger(ui.lastOpenedPage)?Math.max(0,ui.lastOpenedPage):0,lastOpenedSection:['voyage','objects'].includes(ui.lastOpenedSection)?ui.lastOpenedSection:'ship',unreadEntryIds:journalEntries.filter(e=>!e.read).map(e=>e.id)},journalState:{opened:value.journalState?.opened===true,readCount:Number.isSafeInteger(read)?Math.max(0,Math.min(read,journalEntries.length)):0}};
}
export function createJournal({store,bus,intents=null}){
 const data=sanitizeJournal(store.read()),listeners=new Set(),ids=new Set(data.journalEntries.map(e=>e.id));
 let revision=0;
 const save=()=>store.save(data),notify=()=>{for(const fn of listeners)fn();},changed=(layout=true)=>{if(layout)revision++;save();notify();};
 bus.subscribe((type,event)=>{
  if(type!=='encounter_completed'||event.interrupted||event.preview||!date(event.startTime)||!date(event.endTime)||typeof event.shipName!=='string'||!Number.isSafeInteger(event.seenCount)||event.seenCount<1||!Object.hasOwn(periodNames,event.timeOfDay)||!Object.hasOwn(weatherNames,event.weather))return;
  const text=journalText(event);if(!text)return;
  const id=event.encounterId+':'+event.startTime;if(ids.has(id))return;ids.add(id);
  const e=encounterCatalog.find(e=>e.id===event.encounterId),at=new Date(event.endTime);
  data.journalEntries.push({read:false,selectedIntentId:null,selectedIntentText:null,selectedIntentAt:null,respondedToIntentId:intentById(event.respondedToIntentId)?.id??null,respondedToJournalEntryId:event.respondedToJournalEntryId??null,id,timestamp:event.endTime,date:`${at.getFullYear()}-${String(at.getMonth()+1).padStart(2,'0')}-${String(at.getDate()).padStart(2,'0')}`,timeOfDay:event.timeOfDay,weather:event.weather,encounterId:event.encounterId,...text,shipName:event.shipName,firstTime:event.firstTime,seenCount:event.seenCount,badgeUnlocked:event.badgeUnlocked?e?.badgeReward??null:null,souvenirUnlocked:event.souvenirUnlocked?e?.souvenirReward??null:null});changed();
 });
 function markRead(index,includeClues=false){let touched=false;for(const entry of data.journalEntries.slice(index,index+2))if(!entry.read&&(includeClues||entry.selectedIntentId||!intentOptions(entry).length)){entry.read=true;touched=true;}if(touched){data.journalState.readCount=data.journalEntries.filter(e=>e.read).length;changed(false);}}
 return {get revision(){return revision;},save,markRead,notice:()=>journalNotice(data.journalEntries),entries:()=>structuredClone(data.journalEntries),unread:()=>data.journalEntries.filter(e=>!e.read).length,subscribe(fn){listeners.add(fn);return ()=>listeners.delete(fn);},
  ui:()=>structuredClone(data.journalUiState),annotations:()=>structuredClone(data.journalAnnotations),
  remember(page,section){data.journalUiState.lastOpenedPage=page;data.journalUiState.lastOpenedSection=section;save();},
  markReadIds(ids,includeClues=false){let touched=false;for(const e of data.journalEntries)if(ids.includes(e.id)&&!e.read&&(includeClues||e.selectedIntentId||!intentOptions(e).length)){e.read=true;touched=true;}if(touched){data.journalUiState.unreadEntryIds=data.journalEntries.filter(e=>!e.read).map(e=>e.id);changed(false);}},
  annotate(a){const next={...a,timestamp:new Date().toISOString()},at=data.journalAnnotations.findIndex(e=>e.sourceJournalEntryId===a.sourceJournalEntryId&&e.slot===a.slot&&e.item===a.item);if(at<0)data.journalAnnotations.push(next);else data.journalAnnotations[at]=next;changed();},
  selectIntent(id,intentId){const entry=data.journalEntries.find(e=>e.id===id);if(!entry)return 'invalid';const result=intents?.setIntent(intentId,{sourceEncounterId:entry.encounterId,sourceJournalEntryId:entry.id});
   if(result==='selected'){data.journalEntries=store.read().journalEntries;revision++;notify();}return result??'invalid';},
  open({latest=false,entryId=null}={}){const list=data.journalEntries,unread=list.map((e,i)=>!e.read?i:-1).filter(i=>i>=0);let index=entryId?list.findIndex(e=>e.id===entryId):-1;
   if(index<0)index=latest?(unread.at(-1)??Math.max(0,list.length-1)):!data.journalState.opened?0:unread[0]??Math.max(0,list.length-1);
   data.journalState.opened=true;changed(false);return Math.floor(index/2)*2;}
 };
}
