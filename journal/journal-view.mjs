import {periodNames,weatherNames,souvenirNames} from './journal-templates.mjs';
import {drawBadge} from '../ship-customization.mjs';
import {badgeCatalog} from '../badges.mjs';
const drawings={
 underwater_fish_school:'M5 17q9-10 18 0-9 10-18 0m18 0 6-5v10zM10 10q5-4 10-1M8 25q5 3 11 0',
 dolphin_companion:'M3 24q3-17 19-12l7 5-7 1q-9-4-12 6l-4 5-1-5zm10-11 3-7 4 6m-6 8 2 6 4-8',
 pink_dolphin:'M3 24q3-17 19-12l7 5-7 1q-9-4-12 6l-4 5-1-5zm10-11 3-7 4 6m-6 8 2 6 4-8',
 giant_whale_shadow:'M3 20q11-12 27 0M7 23q10-6 18 0M5 28h22',
 giant_whale_surface:'M16 28V17Q5 19 3 8q10-1 13 7Q21 5 30 8q-1 11-14 9M4 28q6-3 12 0t12 0',
 massive_bird_migration:'M2 13q5-5 10 0 4-5 9 0M11 22q5-5 10 0 4-5 9 0M18 7q3-3 6 0 3-3 6 0',
 bioluminescent_sea:'M2 18q5-4 10 0t10 0t10 0M2 25q5-4 10 0t10 0t10 0M10 4v7m-3-3h6M23 8v6m-3-3h6',
 meteor_shower:'M23 4 9 18m18-8L14 23M8 21l1 3 3 1-3 1-1 3-1-3-3-1 3-1zm13-3-3 3',
 polar_bear_ice:'M3 25l9-5 15 2 4 5-14 4zm6-5v-7l4-5 9 2 4 5v7M13 9l-2-4 5 1m6 5 4-4 1 6M14 20v-5m8 6v-5',
 fog_lighthouse:'M11 28l3-17h7l3 17M12 11V7l5-4 6 4v4zm3 7h6M4 9H1m29 0h-5M3 29h27',
 quiet_day:'M3 22q5-4 10 0t10 0t8 0M6 28q5-4 10 0t10 0M10 15a7 7 0 0 1 14 0M17 2v3M5 7l3 3m18 0 3-3'
};
function illustration(id){
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 34 34');svg.classList.add('journal-illustration');svg.setAttribute('aria-hidden','true');
 const path=document.createElementNS(svg.namespaceURI,'path');path.setAttribute('d',drawings[id]??drawings.quiet_day);svg.append(path);return svg;
}
function text(tag,style,content){const el=document.createElement(tag);el.className=style;el.textContent=content;return el;}
function renderPage(page,entry,number,empty){
 page.replaceChildren();page.classList.toggle('journal-empty',!entry);
 if(entry){const [,month,day]=entry.date.split('-');page.append(text('p','journal-date',`${Number(month)} 月 ${Number(day)} 日 · ${periodNames[entry.timeOfDay]} · ${weatherNames[entry.weather]}`),illustration(entry.encounterId),text('h2','',entry.title),text('p','journal-prose',entry.body));
  if(entry.souvenirUnlocked)page.append(text('p','journal-keepsake','留下了：'+souvenirNames[entry.souvenirUnlocked]));
 }else page.append(text('p','journal-date','A LITTLE SEA / A LONG WAY'),illustration('quiet_day'),text('h2','',empty?'故事，刚刚开始':'下一段航程'),text('p','journal-prose',empty?'海水轻轻起伏，小船慢慢向前。\n\n今后遇见的风景，会在这里留下几行字。':'还没有写下的这一页，\n留给下一次相遇。'));
 page.append(text('span','journal-folio',String(number).padStart(2,'0')));
}
export function createJournalView({journal,customization,canOpen,onMode}){
 const overlay=document.querySelector('#journal'),book=overlay.querySelector('.journal-book'),spread=overlay.querySelector('.book-spread'),left=overlay.querySelector('.left-page'),right=overlay.querySelector('.right-page'),flip=overlay.querySelector('.flip-page');
 const front=flip.querySelector('.page-front'),back=flip.querySelector('.page-back'),entry=document.querySelector('#journal-open'),closeButton=document.querySelector('#journal-close');
 const prev=[...overlay.querySelectorAll('#journal-prev,.journal-prev')],next=[...overlay.querySelectorAll('#journal-next,.journal-next')];
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),panel=document.querySelector('#ship-panel'),shipClose=document.querySelector('#ship-close');
 let phase='closed',index=0,entries=[],turning=false,timer=0,turnTimer=0,wheelUntil=0,blend=0;
 function indicator(){const count=journal.unread();document.querySelector('#journal-unread').hidden=!count;entry.setAttribute('aria-label',count?`航海日志，${count} 条新记录`:'翻开航海日志');}
 function refreshCover(){
  document.querySelector('#journal-cover-name').textContent=customization.data.name;document.querySelector('#journal-cover-year').textContent=(journal.entries()[0]?.date.slice(0,4)??new Date().getFullYear())+' —';
  const badge=document.querySelector('#journal-cover-badge'),ctx=badge.getContext('2d'),icon=badgeCatalog.find(b=>b.id===customization.data.equippedBadge)?.icon;ctx.clearRect(0,0,80,80);badge.hidden=!icon;if(icon)drawBadge(ctx,icon,40,40,72);
 }
 function layout(){
  const w=book.offsetWidth,h=book.offsetHeight;if(!w||!h)return;
  const bottom=panel.getBoundingClientRect().top,height=Math.min(106,Math.max(58,(bottom-110)*.22)),width=height*.74,left=Math.max(22,(innerWidth-900)/2),top=bottom-height-26;
  book.style.setProperty('--dock-x',(left+width-book.offsetLeft-w)+'px');book.style.setProperty('--dock-y',(top-book.offsetTop)+'px');book.style.setProperty('--dock-sx',width/(w/2+3));book.style.setProperty('--dock-sy',height/(h+8));
  overlay.style.setProperty('--dock-label-x',left+'px');overlay.style.setProperty('--dock-label-y',(top+height+7)+'px');
 }
 window.addEventListener('resize',layout);
 function navigation(){const locked=phase!=='open'||turning;prev.forEach(b=>b.disabled=locked||index===0);next.forEach(b=>b.disabled=locked||index+2>=entries.length);document.querySelector('#journal-page-number').textContent=entries.length?`${index+1} — ${Math.min(index+2,entries.length)} / ${entries.length}`:'等待第一段故事';}
 function render(){renderPage(left,entries[index],index+1,!entries.length);renderPage(right,entries[index+1],index+2,!entries.length);navigation();}
 function inert(enabled){for(const el of [panel,document.querySelector('.ship-heading'),document.querySelector('.mileage-block'),shipClose,entry])el.inert=enabled;}
 function open(){
  if(phase!=='closed'||!canOpen())return;index=journal.open();entries=journal.entries();phase='opening';wheelUntil=0;inert(true);onMode(true);
  layout();refreshCover();document.body.dataset.journal='true';overlay.classList.remove('is-closing');overlay.classList.add('is-opening');
  render();void book.offsetWidth;overlay.classList.add('is-open');closeButton.focus();
  timer=setTimeout(()=>{phase='open';overlay.classList.remove('is-opening');navigation();},reduced.matches?100:1150);
 }
 function finishClose(restoreFocus){clearTimeout(timer);clearTimeout(turnTimer);turning=false;phase='closed';blend=0;flip.hidden=true;flip.className='flip-page';spread.classList.remove('turning');overlay.classList.remove('is-open','is-opening','is-closing');document.body.dataset.journal='false';inert(false);onMode(false);layout();if(restoreFocus)entry.focus();}
 function close(immediate=false){
  if(phase==='closed')return;if(immediate){finishClose(false);return;}if(phase==='closing')return;
  clearTimeout(timer);clearTimeout(turnTimer);turning=false;flip.hidden=true;spread.classList.remove('turning');render();phase='closing';overlay.classList.remove('is-opening');overlay.classList.add('is-closing');navigation();
  document.body.dataset.journal='false';timer=setTimeout(()=>finishClose(true),reduced.matches?100:900);
 }
 function turn(direction){
  const target=index+direction*2;if(phase!=='open'||turning||target<0||target>=entries.length)return;
  turning=true;navigation();const forward=direction>0;
  renderPage(front,entries[index+(forward?1:0)],index+(forward?2:1),false);renderPage(back,entries[target+(forward?0:1)],target+(forward?1:2),false);
  renderPage(forward?right:left,entries[target+(forward?1:0)],target+(forward?2:1),false);
  flip.className='flip-page';flip.hidden=false;void flip.offsetWidth;flip.classList.add(forward?'next':'prev');spread.classList.add('turning');
  turnTimer=setTimeout(()=>{index=target;turning=false;flip.hidden=true;flip.className='flip-page';spread.classList.remove('turning');render();},reduced.matches?100:780);
 }
 entry.addEventListener('click',open);closeButton.addEventListener('click',()=>close());prev.forEach(b=>b.addEventListener('click',()=>turn(-1)));next.forEach(b=>b.addEventListener('click',()=>turn(1)));
 book.addEventListener('wheel',e=>{e.preventDefault();e.stopPropagation();const now=performance.now();if(phase!=='open'||turning||now<wheelUntil||Math.abs(e.deltaY)<4)return;wheelUntil=now+950;turn(Math.sign(e.deltaY));},{passive:false});
 journal.subscribe(()=>{indicator();if(phase==='closed')return;entries=journal.entries();if(!turning)render();});indicator();refreshCover();
 return {close,refreshCover,layout,get busy(){return phase!=='closed';},get blend(){return blend*blend*(3-2*blend);},
  update(dt){const target=phase==='closed'||phase==='closing'?0:1;blend=Math.max(0,Math.min(1,blend+(target?1:-1)*dt/(reduced.matches?.1:target?1:.78)));},
  handleKey(e){if(phase==='closed')return false;if(['Escape','Tab','ArrowLeft','ArrowRight','PageUp','PageDown','Home','End'].includes(e.key)){e.preventDefault();e.stopImmediatePropagation();
    if(e.key==='Escape')close();else if(e.key==='Tab'){const focusable=[closeButton,...overlay.querySelectorAll('.journal-navigation button:not(:disabled)')],at=focusable.indexOf(document.activeElement);focusable[(at+(e.shiftKey?-1:1)+focusable.length)%focusable.length].focus();}
    else if(e.key==='ArrowLeft'||e.key==='PageUp')turn(-1);else if(e.key==='ArrowRight'||e.key==='PageDown')turn(1);
    else if(!turning&&phase==='open'){index=e.key==='Home'?0:Math.floor(Math.max(0,entries.length-1)/2)*2;render();}
   }return true;}
 };
}
