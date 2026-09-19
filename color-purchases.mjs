import {colorCatalog,COLOR_PARTS} from './color-catalog.mjs';
export function createColorPurchases({store,sailing,customization}){
 const owns=id=>store.read().ownedColors.includes(id);
 const valid=(id,part)=>Object.hasOwn(COLOR_PARTS,part)&&colorCatalog.find(color=>color.id===id);
 function equip(id,part){
  const color=valid(id,part);if(!color)return 'invalid';if(!owns(id))return 'locked';
  const patch={[part]:color.value};
  if(!store.commit({shipCustomization:{...customization.data,...patch},sailingData:sailing.snapshot()}))return 'save-failed';
  customization.update(patch,{save:false});return 'equipped';
 }
 return {owns,equip,balance:()=>sailing.snapshot().points,
  takeHint(){if(store.read().colorHintSeen)return false;store.save({colorHintSeen:true});return true;},
  purchase(id,part){
   const color=valid(id,part);if(!color)return 'invalid';if(owns(id))return equip(id,part);
   if(!sailing.canAffordSailingPoints(color.price))return 'insufficient';
   const patch={[part]:color.value};
   const saved=sailing.spendSailingPoints(color.price,sailingData=>store.commit({sailingData,ownedColors:[...store.read().ownedColors,id],shipCustomization:{...customization.data,...patch}}));
   if(!saved)return 'save-failed';customization.update(patch,{save:false});return 'unlocked';
  }
 };
}
