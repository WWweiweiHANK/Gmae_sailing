import {sanitizeShip,SHIP_STORAGE_KEY} from './ship-customization.mjs';
import {sanitizeSailing} from './sailing.mjs';
import {colorCatalog,ownedColorIds,COLOR_PARTS} from './color-catalog.mjs';
export const GAME_SAVE_KEY='tiny-tides-game-v1';
export function createGameSave(storage,{key=GAME_SAVE_KEY,onError=()=>{},migrateLegacy=true}={}){
 let loaded,legacy,readOnly=false,isNew=false;
 try{
  const raw=storage.getItem(key);isNew=raw===null;loaded=raw?JSON.parse(raw):null;
  if(loaded&&![1,2].includes(loaded.version)){readOnly=true;onError('存档版本不兼容，已保护原存档；本次修改不会保存。');}
  if(!loaded&&migrateLegacy)legacy=JSON.parse(storage.getItem(SHIP_STORAGE_KEY)||'null');
 }catch{readOnly=true;onError('无法读取本机存档，已保护原数据；本次修改不会保存。');}
 const shipCustomization=sanitizeShip(loaded?.shipCustomization??legacy);
 const equipped=colorCatalog.filter(color=>Object.keys(COLOR_PARTS).some(key=>shipCustomization[key]===color.value)).map(color=>color.id);
 let gameSave={version:2,shipCustomization,sailingData:sanitizeSailing(loaded?.sailingData),ownedColors:ownedColorIds([...(Array.isArray(loaded?.ownedColors)?loaded.ownedColors:[]),...equipped]),colorHintSeen:loaded?.colorHintSeen===true};
 const read=()=>({...gameSave,shipCustomization:{...gameSave.shipCustomization},sailingData:{...gameSave.sailingData},ownedColors:[...gameSave.ownedColors]});
 function save(patch,atomic=false){
  const next={version:2,shipCustomization:sanitizeShip(patch.shipCustomization??gameSave.shipCustomization),sailingData:sanitizeSailing(patch.sailingData??gameSave.sailingData),ownedColors:ownedColorIds(patch.ownedColors??gameSave.ownedColors),colorHintSeen:patch.colorHintSeen??gameSave.colorHintSeen};
  if(!atomic)gameSave=next;
  if(readOnly)return false;
  try{storage.setItem(key,JSON.stringify(next));gameSave=next;return true;}
  catch{onError('本机保存失败，当前进度仍保留在本次运行中。');return false;}
 }
 if(legacy||loaded?.version===1)save({});
 return {read,save,commit:patch=>save(patch,true),isNew};
}
