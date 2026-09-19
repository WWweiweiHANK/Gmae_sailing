import {sanitizeShip,SHIP_STORAGE_KEY} from './ship-customization.mjs';
import {sanitizeSailing} from './sailing.mjs';
export const GAME_SAVE_KEY='tiny-tides-game-v1';
export function createGameSave(storage,{key=GAME_SAVE_KEY,onError=()=>{}}={}){
 let loaded,legacy,readOnly=false;
 try{
  const raw=storage.getItem(key);loaded=raw?JSON.parse(raw):null;
  if(loaded&&loaded.version!==1){readOnly=true;onError('存档版本不兼容，已保护原存档；本次修改不会保存。');}
  if(!loaded)legacy=JSON.parse(storage.getItem(SHIP_STORAGE_KEY)||'null');
 }catch{readOnly=true;onError('无法读取本机存档，已保护原数据；本次修改不会保存。');}
 let gameSave={version:1,shipCustomization:sanitizeShip(loaded?.shipCustomization??legacy),sailingData:sanitizeSailing(loaded?.sailingData)};
 const read=()=>({version:1,shipCustomization:{...gameSave.shipCustomization},sailingData:{...gameSave.sailingData}});
 function save(patch){
  gameSave={version:1,shipCustomization:sanitizeShip(patch.shipCustomization??gameSave.shipCustomization),sailingData:sanitizeSailing(patch.sailingData??gameSave.sailingData)};
  if(readOnly)return false;
  try{storage.setItem(key,JSON.stringify(gameSave));return true;}
  catch{onError('本机保存失败，当前进度仍保留在本次运行中。');return false;}
 }
 if(legacy)save({});
 return {read,save};
}
