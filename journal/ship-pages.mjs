import {drawBadge,shipName} from '../ship-customization.mjs';
import {boatSkinCatalog,skinThumbnail} from '../boat-skins.mjs';
import {accessoryCatalog,accessorySlots} from '../boat-accessories.mjs';
import {accessoryRewards} from '../accessory-rewards.mjs';
export function element(tag,className='',content=''){const el=document.createElement(tag);el.className=className;el.textContent=content;return el;}
export function createShipPages({store,sailing,customization,skins,accessories,badges,journal,intents,preview,changed}){
 let slot='charm';
 const note=message=>{document.querySelector('#ship-notice').textContent=message;};
 function annotate(slot,item,name,event){const source=journal.entries().find(e=>event&&e.encounterId===event);journal.annotate({sourceJournalEntryId:source?.id??null,slot,item:item??'none',text:item?`把${name}留在了船上。`:`取下了${name}。`});}
 function model(parent){const canvas=element('canvas','journal-ship-model');parent.append(canvas);preview.bind(canvas);return canvas;}
 function profile(parent){
  parent.append(element('p','journal-date','01 / OUR LITTLE BOAT'));
  const row=element('div','ship-name-line'),name=element('h2','',customization.data.name),edit=element('button','paper-pencil','✎');edit.type='button';edit.setAttribute('aria-label','编辑船名');row.append(name,edit);parent.append(row);
  const form=element('form','journal-name-form'),input=element('input'),save=element('button','','✓');input.id='ship-name';input.maxLength=40;input.autocomplete='off';input.setAttribute('aria-label','船名');save.type='submit';save.setAttribute('aria-label','保存船名');form.append(input,save);form.hidden=true;parent.append(form);
  function finish(commit){if(form.hidden)return;if(commit){const value=shipName(input.value);if(!value){note('给小船取一个名字吧。');input.focus();return;}if(!store.commit({shipCustomization:{...customization.data,name:value}})){note('船名未能保存，请重试。');return;}customization.update({name:value},{save:false});name.textContent=value;changed(false);}form.hidden=true;row.hidden=false;}
  edit.onclick=()=>{input.value=customization.data.name;row.hidden=true;form.hidden=false;input.focus();input.select();};form.onsubmit=e=>{e.preventDefault();finish(true);edit.focus();};
  input.onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();finish(false);edit.focus();}};
  form.onfocusout=()=>queueMicrotask(()=>{if(form.isConnected&&!form.contains(document.activeElement))finish(true);});
  const date=store.read().voyageStartedAt;parent.append(element('p','profile-line',`首次启航\n${date?new Date(date).toLocaleDateString('zh-CN').replaceAll('/','.'): '日期未记下'}`));
  const mileage=element('div','paper-mileage'),button=element('button','','≈ '+sailing.snapshot().points+' 海里'),info=element('aside','mileage-note','航海里程\n\n小船持续航行时，会慢慢累积航海里程。\n1 分钟航行 = 1 海里。\n\n九款整船皮肤可直接切换；纪念物随见闻获得。暂停、隐藏时不累计。');button.id='ship-balance';button.setAttribute('aria-expanded','false');info.hidden=true;button.onclick=()=>{info.hidden=!info.hidden;button.setAttribute('aria-expanded',String(!info.hidden));};mileage.append(button,info);parent.append(mileage);
  parent.append(element('p','profile-line','当前航行\n'+(intents.currentText()||'不追什么，随海慢慢走。')),element('p','profile-line',`记录见闻\n${journal.entries().length} 段相遇`));
 }
 function skinPage(parent){parent.append(element('p','journal-date','02 / A BOAT OF MY OWN'),element('h2','','船只改造记录'),element('p','paper-caption','九种模样，都可以陪我远航。'));
  const list=element('div','paper-skins');for(const skin of boatSkinCatalog){const button=element('button','paper-skin');button.type='button';button.dataset.skin=skin.id;button.innerHTML=skinThumbnail(skin);button.setAttribute('aria-label',skin.name);button.setAttribute('aria-pressed',String(customization.data.skinId===skin.id));button.title=skin.name+" · "+skin.description;button.onclick=()=>{if(customization.data.skinId===skin.id)return;if(skins.equip(skin.id)==='save-failed'){note('未能保存外观，请重试。');return;}annotate('skin',skin.id,skin.name);changed();};list.append(button);}parent.append(list);
 }
 function objects(parent){parent.append(element('h2','','随船物件'));model(parent).classList.add('compact');
  const label=element('label','object-location','装在 '),select=element('select');select.setAttribute('aria-label','装饰位置');for(const [id,name] of Object.entries(accessorySlots))select.add(new Option(name,id));select.add(new Option('航行徽章','badges'));select.value=slot;select.onchange=()=>{slot=select.value;changed(false,true);};label.append(select);parent.append(label);
  const list=element('div','paper-objects');parent.append(list);
  if(slot==='badges'){
   for(const item of [{id:null,name:'不佩戴',owned:true},...badges.views().filter(b=>b.owned)]){const button=element('button','paper-object'),icon=element('canvas');icon.width=icon.height=80;if(item.icon)drawBadge(icon.getContext('2d'),item.icon,40,40,72);button.append(icon);button.setAttribute('aria-label',item.name);button.title=item.name;button.dataset.badge=item.id??'none';button.setAttribute('aria-pressed',String(customization.data.equippedBadge===item.id));button.onclick=()=>{if(customization.data.equippedBadge===item.id)return;if(badges.equip(item.id)==='save-failed'){note('未能保存徽章，请重试。');return;}badges.markSeen(item.id?[item.id]:[]);annotate('badge',item.id,item.name);changed();};list.append(button);}
  }else{
   const items=accessoryCatalog.filter(i=>i.slots.includes(slot)&&accessories.status(i.id).available);if(slot!=='nameplate')items.unshift({id:null,name:'不安装'});
   for(const item of items){const button=element('button','paper-object'),icon=element('span','accessory-thumb');if(item.thumb)icon.style.backgroundPosition=`${-item.thumb[0]*.23}px ${-(item.thumb[1]+(slot==='charm'?15:0))*.23}px`;else{icon.classList.add('accessory-symbol');icon.textContent=item.id?.startsWith('plate')?'▱':item.id?'▥':'—';}
    button.append(icon);button.setAttribute('aria-label',item.name);button.title=item.name;button.dataset.accessory=item.id??'none';button.setAttribute('aria-pressed',String(customization.data.accessories[slot]===item.id));button.onclick=()=>{if(customization.data.accessories[slot]===item.id)return;const result=accessories.equip(slot,item.id);if(result==='save-failed'||result==='locked'){note('这件物品暂时未能安装。');return;}annotate(slot,item.id,item.name,accessoryRewards.find(r=>r.accessory===item.id)?.event);changed();};list.append(button);
   }
  }
  parent.append(element('p','paper-caption','留在船上的，是遇见过的风景。'));
 }
 return {render(index,parent){parent.classList.add('ship-paper');if(index===0)profile(parent);if(index===1){parent.append(element('p','journal-date','A SMALL BOAT / BIG MEMORIES'));model(parent);parent.append(element('p','model-name',customization.data.name),element('p','paper-caption','轻轻转一转，看看今天的小船。'));const latest=journal.annotations().filter(a=>!a.sourceJournalEntryId).at(-1);if(latest)parent.append(element('p','journal-annotation',new Date(latest.timestamp).toLocaleDateString()+' · '+latest.text));}if(index===2)skinPage(parent);if(index===3)objects(parent);},refreshBalance(){const button=document.querySelector('#ship-balance');if(button)button.textContent='≈ '+sailing.snapshot().points+' 海里';}};
}
