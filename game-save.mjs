import {sanitizeEncounters} from './encounter-catalog.mjs';
import {sanitizeJournal} from './journal/journal-store.mjs';
import {sanitizeShip,SHIP_STORAGE_KEY} from './ship-customization.mjs';
import {sanitizeSailing} from './sailing.mjs';
import {colorCatalog,ownedColorIds,COLOR_PARTS} from './color-catalog.mjs';
import {badgeId,sanitizeBadges,sanitizeBadgeProgress} from './badges.mjs';
export const GAME_SAVE_KEY='tiny-tides-game-v1';
export function createGameSave(storage,{key=GAME_SAVE_KEY,onError=()=>{},migrateLegacy=true}={}){
 let loaded,legacy,readOnly=false,isNew=false;
 try{
  const raw=storage.getItem(key);isNew=raw===null;loaded=raw?JSON.parse(raw):null;
  if(loaded&&![1,2,3,4,5,6,7].includes(loaded.version)){readOnly=true;onError('存档版本不兼容，已保护原存档；本次修改不会保存。');}
  if(!loaded&&migrateLegacy)legacy=JSON.parse(storage.getItem(SHIP_STORAGE_KEY)||'null');
 }catch{readOnly=true;onError('无法读取本机存档，已保护原数据；本次修改不会保存。');}
 const shipCustomization=sanitizeShip(loaded?.shipCustomization??legacy);
 const equipped=colorCatalog.filter(color=>Object.keys(COLOR_PARTS).some(key=>shipCustomization[key]===color.value)).map(color=>color.id);
 const ownedBadges=sanitizeBadges(loaded?.ownedBadges);
 // Only an explicitly equipped legacy badge is retained; its historical date is unknown.
 const legacyBadge=badgeId((loaded?.shipCustomization??legacy)?.equippedBadge);
 if((legacy||loaded?.version<3)&&legacyBadge&&!ownedBadges.some(b=>b.badgeId===legacyBadge))ownedBadges.push({badgeId:legacyBadge,unlockedAt:null,sourceEventId:'legacy_equipped'});
 function normalize(value){
  const records=sanitizeBadges(value.ownedBadges),ship=sanitizeShip(value.shipCustomization);
  if(ship.equippedBadge&&!records.some(b=>b.badgeId===ship.equippedBadge))ship.equippedBadge=null;
  return {...sanitizeEncounters(value),...sanitizeJournal(value),version:7,shipCustomization:ship,sailingData:sanitizeSailing(value.sailingData),ownedColors:ownedColorIds(value.ownedColors),colorHintSeen:value.colorHintSeen===true,ownedBadges:records,
   seenBadgeNotifications:[...new Set((Array.isArray(value.seenBadgeNotifications)?value.seenBadgeNotifications:[]).filter(id=>records.some(b=>b.badgeId===id)))],badgeProgress:sanitizeBadgeProgress(value.badgeProgress)};
 }
 let gameSave=normalize({...loaded,shipCustomization,ownedColors:[...(Array.isArray(loaded?.ownedColors)?loaded.ownedColors:[]),...equipped],ownedBadges});
 const read=()=>structuredClone(gameSave);
 function save(patch,atomic=false){
  const next=normalize({...gameSave,...patch});if(!atomic)gameSave=next;
  if(readOnly)return false;
  try{storage.setItem(key,JSON.stringify(next));gameSave=next;return true;}
  catch{onError('本机保存失败，当前进度仍保留在本次运行中。');return false;}
 }
 if(legacy||loaded?.version<7)save({});
 return {read,save,commit:patch=>save(patch,true),isNew};
}
