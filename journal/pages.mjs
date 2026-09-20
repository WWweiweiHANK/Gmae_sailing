import {periodNames,weatherNames,souvenirNames} from './journal-templates.mjs';
import {encounterCatalog} from '../encounter-catalog.mjs';
import {intentOptions,intentById} from '../voyage-intents.mjs';
import {illustration,sketches} from './doodles.mjs';
import {element} from './ship-pages.mjs';

export function renderBlock(block,choose){
 const {kind,entry,text}=block;let node;
 if(kind==='doodle'){node=illustration(entry.encounterId,entry.selectedIntentId?sketches[intentById(entry.selectedIntentId)?.icon]:null);node.style.height=block.height+'px';node.style.width=block.height+'px';node.style.marginLeft=block.align==='right'?'auto':block.align==='center'?'auto':'0';node.style.marginRight=block.align==='center'?'auto':'0';}
 else if(kind==='choice'){
  node=element('button','intent-sentence',block.option.journalText);node.type='button';node.dataset.intent=block.option.id;node.onclick=()=>choose?.(entry,block.option,node);node.append(element('span','choice-action','写下这句'));
  const hint=element('span','intent-margin',block.option.hintText),sketch=illustration('quiet_day',sketches[block.option.icon]);hint.prepend(sketch);node.append(hint);
 }else node=element(kind==='title'?'h2':'p',({date:'journal-date',body:'journal-prose',written:'intent-written',prompt:'intent-prompt',annotation:'journal-annotation',keepsake:'journal-keepsake'})[kind]??'',text);
 node.dataset.entry=entry?.id??'';node.dataset.kind=kind;if(block.key)node.dataset.block=block.key;return node;
}
// Both capacity and illustration placement use the rendered paper's actual line metrics.
export function paginateJournal(entries,annotations,measure){
 const capacity=measure.clientHeight,pages=[[]];let current=pages[0];measure.replaceChildren();
 const fits=node=>{measure.append(node);const okay=node.getBoundingClientRect().bottom-measure.getBoundingClientRect().top<=capacity;node.remove();return okay;};
 const next=()=>{if(!current.length)return;current=[];pages.push(current);measure.replaceChildren();};
 function put(block){
  let node=renderBlock(block);if(!fits(node)&&current.length)next();
  if(!fits(node)&&['body','written'].includes(block.kind)){
   const chars=Array.from(block.text);let offset=0;
   while(offset<chars.length){let lo=1,hi=chars.length-offset;while(lo<hi){const mid=Math.ceil((lo+hi)/2);node.textContent=chars.slice(offset,offset+mid).join('');if(fits(node))lo=mid;else hi=mid-1;}
    const fragment={...block,text:chars.slice(offset,offset+lo).join(''),key:block.key+'-'+offset};current.push(fragment);measure.append(renderBlock(fragment));offset+=lo;if(offset<chars.length)next();
   }return;
  }
  current.push(block);measure.append(node);
 }
 for(const entry of entries){
  const layout=encounterCatalog.find(e=>e.id===entry.encounterId)?.journalLayout??'normal';
  if(layout==='full_spread'||intentOptions(entry).length){next();if((pages.length-1)%2!==0){current.push({kind:'annotation',text:'这一页，留给海。'});next();}}
  const [,month,day]=entry.date.split('-');put({kind:'date',entry,text:`${+month} 月 ${+day} 日 · ${periodNames[entry.timeOfDay]} · ${weatherNames[entry.weather]}`});put({kind:'title',entry,text:entry.title});
  let part=0;for(const paragraph of entry.body.split(/\n+/).filter(Boolean))put({kind:'body',entry,text:paragraph,key:entry.id+'-body-'+part++});
  if(entry.souvenirUnlocked)put({kind:'keepsake',entry,text:'留下了：'+souvenirNames[entry.souvenirUnlocked]});
  if(entry.selectedIntentId)put({kind:'written',entry,text:entry.selectedIntentText,key:entry.id+'-written'});
  else if(intentOptions(entry).length){put({kind:'prompt',entry,text:'选一句，写进手账\n也可以先翻页，稍后再决定。'});for(const option of intentOptions(entry))put({kind:'choice',entry,option});}
  for(const a of annotations.filter(a=>a.sourceJournalEntryId===entry.id))put({kind:'annotation',entry,text:new Date(a.timestamp).toLocaleDateString('zh-CN')+' · '+a.text});
  if(layout==='full_spread'){next();put({kind:'date',entry,text:'记住这一次相遇'});}
  // Occupy remaining paper instead of covering text; important encounters can own a page.
  const last=measure.lastElementChild,remaining=capacity-(last?last.getBoundingClientRect().bottom-measure.getBoundingClientRect().top:0)-18;
  const wanted=layout==='full_spread'?capacity*.65:layout==='large_doodle'?150:80;
  if(remaining<54)next();
  put({kind:'doodle',entry,key:entry.id+'-doodle',height:Math.max(42,Math.min(wanted,remaining>=54?remaining:capacity*.65,measure.clientWidth-8)),align:pages.length%3===0?'center':pages.length%2?'right':'left'});
  current.at(-1).end=true;
  if(layout==='full_spread')next();
 }
 if(!pages.at(-1).length&&pages.length>1)pages.pop();
 if(!entries.length)pages[0]=[{kind:'title',text:'故事，刚刚开始'},{kind:'body',text:'海水轻轻起伏，小船慢慢向前。今后遇见的风景，会在这里留下几行字。'}];
 measure.replaceChildren();return pages;
}
