import {encounterCatalog,souvenirIds} from '../encounter-catalog.mjs';
import {journalTemplateCatalog,journalText,periodNames,weatherNames} from './journal-templates.mjs';
const date=v=>typeof v==='string'&&Number.isFinite(Date.parse(v));
export function sanitizeJournal(value={}){
 const ids=new Set(),journalEntries=[];
 for(const e of Array.isArray(value.journalEntries)?value.journalEntries:[]){
  if(!e||typeof e.id!=='string'||ids.has(e.id)||!Object.hasOwn(journalTemplateCatalog,e.encounterId)||!date(e.timestamp)||typeof e.body!=='string'||typeof e.title!=='string')continue;
  ids.add(e.id);journalEntries.push({id:e.id.slice(0,180),timestamp:e.timestamp,date:typeof e.date==='string'?e.date.slice(0,10):e.timestamp.slice(0,10),timeOfDay:periodNames[e.timeOfDay]?e.timeOfDay:'day',weather:weatherNames[e.weather]?e.weather:'clear',encounterId:e.encounterId,title:e.title.slice(0,80),body:e.body.slice(0,1200),shipName:typeof e.shipName==='string'?e.shipName.slice(0,40):'小雨号',firstTime:e.firstTime===true,seenCount:Number.isSafeInteger(e.seenCount)&&e.seenCount>0?e.seenCount:1,badgeUnlocked:['dolphin','whale'].includes(e.badgeUnlocked)?e.badgeUnlocked:null,souvenirUnlocked:souvenirIds.includes(e.souvenirUnlocked)?e.souvenirUnlocked:null});
 }
 const read=value.journalState?.readCount;
 return {journalEntries,journalState:{opened:value.journalState?.opened===true,readCount:Number.isSafeInteger(read)?Math.max(0,Math.min(read,journalEntries.length)):0}};
}
export function createJournal({store,bus}){
 const data=sanitizeJournal(store.read()),listeners=new Set(),ids=new Set(data.journalEntries.map(e=>e.id));
 const save=()=>store.save(data),changed=()=>{save();for(const fn of listeners)fn();};
 bus.subscribe((type,event)=>{
  if(type!=='encounter_completed'||event.interrupted||event.preview||!date(event.startTime)||!date(event.endTime)||typeof event.shipName!=='string'||!Number.isSafeInteger(event.seenCount)||event.seenCount<1||!Object.hasOwn(periodNames,event.timeOfDay)||!Object.hasOwn(weatherNames,event.weather))return;
  const text=journalText(event);if(!text)return;
  const id=event.encounterId+':'+event.startTime;if(ids.has(id))return;ids.add(id);
  const e=encounterCatalog.find(e=>e.id===event.encounterId),at=new Date(event.endTime);
  data.journalEntries.push({id,timestamp:event.endTime,date:`${at.getFullYear()}-${String(at.getMonth()+1).padStart(2,'0')}-${String(at.getDate()).padStart(2,'0')}`,timeOfDay:event.timeOfDay,weather:event.weather,encounterId:event.encounterId,...text,shipName:event.shipName,firstTime:event.firstTime,seenCount:event.seenCount,badgeUnlocked:event.badgeUnlocked?e?.badgeReward??null:null,souvenirUnlocked:event.souvenirUnlocked?e?.souvenirReward??null:null});changed();
 });
 return {save,entries:()=>data.journalEntries.slice(),unread:()=>data.journalEntries.length-data.journalState.readCount,subscribe(fn){listeners.add(fn);return ()=>listeners.delete(fn);},
  open(){const {opened,readCount}=data.journalState,length=data.journalEntries.length,index=!opened?0:readCount<length?readCount:Math.max(0,length-1);data.journalState={opened:true,readCount:length};changed();return Math.floor(index/2)*2;}
 };
}
