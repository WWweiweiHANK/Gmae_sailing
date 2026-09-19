import * as THREE from 'three';
import {drawBadge,shipName} from './ship-customization.mjs';
import {colorCatalog,COLOR_PARTS} from './color-catalog.mjs';

export function createShowcaseCamera(camera,controls){
 const saved={position:camera.position.clone(),target:controls.target.clone(),enabled:controls.enabled};
 // Drain any old OrbitControls inertia so returning cannot drift away from the saved view.
 const damping=controls.enableDamping;controls.enableDamping=false;controls.update();controls.enableDamping=damping;controls.enabled=false;
 const direction=saved.position.clone().sub(saved.target).normalize();direction.y=.28;direction.normalize();
 const theta=Math.atan2(direction.x,direction.z),phi=Math.acos(direction.y);
 const focus=new THREE.Vector3(),destination=new THREE.Vector3(),look=new THREE.Vector3(),up=new THREE.Vector3();
 function restore(){camera.position.copy(saved.position);controls.target.copy(saved.target);camera.lookAt(controls.target);controls.enabled=saved.enabled;}
 camera.position.copy(saved.position);controls.target.copy(saved.target);camera.lookAt(controls.target);
 return {restore,update(ship,available,yaw,pitch,blend){
  focus.copy(ship.position);focus.y+=1;
  const halfFov=Math.tan(THREE.MathUtils.degToRad(camera.fov/2));
  const distance=Math.max(1.9/(halfFov*available),1.8/(halfFov*camera.aspect));
  destination.setFromSphericalCoords(distance,THREE.MathUtils.clamp(phi+pitch,.25,1.30),theta+yaw);
  up.set(0,1,0).addScaledVector(destination,-destination.y/destination.lengthSq()).normalize();
  look.copy(focus).addScaledVector(up,-distance*halfFov*(1-available)*.7);
  destination.add(look);camera.position.lerpVectors(saved.position,destination,blend);controls.target.lerpVectors(saved.target,look,blend);camera.lookAt(controls.target);
 }};
}

export function createShipShowcase({canvas,camera,controls,ship,customization,colors,badges,onColorChange,onEnter,onLeave}){
 const dialog=document.querySelector('#my-ship'),panel=document.querySelector('#ship-panel');
 const notice=document.querySelector('#ship-notice'),nameInput=document.querySelector('#ship-name');
 const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();
 let phase='sailing',progress=0,view=null,yaw=0,pitch=0,vYaw=0,vPitch=0,drag=null,pressed=null,previousFocus=null;
 const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const tabs=[...dialog.querySelectorAll('[role=tab]')];
 function tab(id){if(id!=='badges')acknowledgeBadges();dismissPurchase();for(const button of tabs){const active=button.dataset.tab===id;button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1;document.querySelector('#ship-'+button.dataset.tab).hidden=!active;}if(id==='badges'){refreshBadges();acknowledgeBadges();}}
 tabs.forEach((button,i)=>{button.addEventListener('click',()=>tab(button.dataset.tab));button.addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();const next=tabs[(i+(e.key==='ArrowRight'?1:2))%3];tab(next.dataset.tab);next.focus();}});});
 let selectedPart='hullColor',pending=null,noticeTimer=0;
 const colorButtons=new Map(),partButtons=new Map(),confirm=document.querySelector('#color-confirm'),hint=document.querySelector('#color-hint');
 function dismissPurchase(){pending=null;confirm.hidden=true;hint.hidden=false;}
 function feedback(message,temporary=false){clearTimeout(noticeTimer);notice.textContent=message;if(temporary)noticeTimer=setTimeout(()=>{if(notice.textContent===message)notice.textContent='';},1800);}
 function finishColor(result,color){
  onColorChange();refresh();
  if(result==='insufficient'){feedback(`航行值不足 · 需要 ≋ ${color.price}，当前 ≋ ${colors.balance()}`,true);return;}
  if(result==='save-failed'){feedback('未能保存，尚未扣除航行值，请稍后重试。');return;}
  feedback(result==='unlocked'?`已解锁${color.name}，全船都可以使用`:'已装备'+color.name);dismissPurchase();colorButtons.get(color.id).focus();
  if(result==='unlocked'&&!reduceMotion)colorButtons.get(color.id).animate([{backgroundColor:'#c9e6d6'},{backgroundColor:'#edf4ed'}],{duration:350});
 }
 for(const [key,label] of Object.entries(COLOR_PARTS)){
  const button=document.createElement('button');button.type='button';button.textContent=label;button.setAttribute('aria-label','选择'+label+'颜色');
  button.addEventListener('click',()=>{selectedPart=key;dismissPurchase();refresh();});document.querySelector('#color-parts').append(button);partButtons.set(key,button);
 }
 for(const color of colorCatalog){
  const button=document.createElement('button');button.type='button';button.className='color-card';button.style.setProperty('--swatch',color.value);
  const swatch=document.createElement('span');swatch.className='color-dot';swatch.setAttribute('aria-hidden','true');
  const name=document.createElement('span');name.textContent=color.name;const status=document.createElement('small');button.append(swatch,name,status);
  button.addEventListener('click',()=>{if(colors.owns(color.id)){finishColor(colors.equip(color.id,selectedPart),color);return;}
   pending={color,part:selectedPart};hint.hidden=true;confirm.hidden=false;document.querySelector('#color-question').textContent=`解锁${color.name}？ ≋ ${color.price}`;document.querySelector('#color-unlock').focus();});
  document.querySelector('#color-options').append(button);colorButtons.set(color.id,button);
 }
 document.querySelector('#color-cancel').addEventListener('click',()=>{const id=pending?.color.id;dismissPurchase();if(id)colorButtons.get(id).focus();});
 document.querySelector('#color-unlock').addEventListener('click',()=>{if(!pending)return;const {color,part}=pending;finishColor(colors.purchase(color.id,part),color);});
 let selectedBadge=null;
 const badgeButtons=new Map(),badgePanel=document.querySelector('#ship-badges'),badgeDetail=document.querySelector('#badge-detail');
 function acknowledgeBadges(){if(!badgePanel.hidden)badges.markSeen(badges.views().filter(b=>b.owned).map(b=>b.id));}
 for(const item of [{id:null},...badges.views()]){
  const button=document.createElement('button');button.type='button';button.className='ship-badge';
  const icon=document.createElement('canvas');icon.width=80;icon.height=80;icon.setAttribute('aria-hidden','true');
  const label=document.createElement('span'),status=document.createElement('small');button.append(icon,label,status);
  button.addEventListener('click',()=>{selectedBadge=item.id;const view=badges.views().find(b=>b.id===item.id);
   if(item.id===null||view.owned){const result=badges.equip(item.id);if(result==='save-failed')feedback('未能保存徽章，请稍后重试。');else{badges.markSeen(item.id?[item.id]:[]);feedback(item.id?'已佩戴这枚航行印记':'已取下徽章');}}
   refreshBadges();
  });document.querySelector('#ship-badge-options').append(button);badgeButtons.set(item.id,{button,icon,label,status,drawn:null});
 }
 function refreshBadges(){
  const views=[{id:null,name:'无徽章',owned:true,icon:null},...badges.views()];
  for(const view of views){const {button,icon,label,status}=badgeButtons.get(view.id),current=customization.data.equippedBadge===view.id;
   label.textContent=view.name;status.textContent=current?'已佩戴':view.isNew?'NEW':view.owned?'已拥有':view.icon?'未解锁':'尚未发现';status.className=view.isNew&&!current?'badge-new':'';
   button.setAttribute('aria-pressed',String(current));button.setAttribute('aria-label',view.name+' · '+status.textContent);button.classList.toggle('badge-locked',!view.owned);
   icon.hidden=!view.icon;if(view.icon&&badgeButtons.get(view.id).drawn!==view.icon){const ctx=icon.getContext('2d');ctx.clearRect(0,0,80,80);drawBadge(ctx,view.icon,40,40,72);badgeButtons.get(view.id).drawn=view.icon;}
  }
  const view=views.find(b=>b.id===selectedBadge);
  if(!selectedBadge){badgeDetail.textContent='徽章来自航行中的相遇，不消耗航行值。';return;}
  if(!view.owned){badgeDetail.textContent=view.icon?(view.night?'星光下累计航行':'累计航行')+' '+Math.floor(view.progress/60)+' / '+Math.ceil(view.required/60)+' 分钟':'尚未发现';return;}
  badgeDetail.textContent=view.name+' · '+(view.unlockedAt?new Date(view.unlockedAt).toLocaleDateString()+' 获得':'旧版保留 · 日期未记录')+'\n'+view.description;
 }
 document.querySelector('#ship-name-form').addEventListener('submit',e=>{e.preventDefault();const name=shipName(nameInput.value);if(!name){notice.textContent='给小船取一个名字吧。';nameInput.focus();return;}
  customization.update({name});if(name!==nameInput.value.trim())notice.textContent='船名已按铭牌宽度缩短并保存。';nameInput.value=name;refresh();});
 function refresh(){
  for(const [part,button] of partButtons)button.setAttribute('aria-pressed',String(part===selectedPart));
  for(const color of colorCatalog){const button=colorButtons.get(color.id),current=customization.data[selectedPart]===color.value,status=current?'✓ 当前':colors.owns(color.id)?'已拥有':`≋ ${color.price}`;button.querySelector('small').textContent=status;button.setAttribute('aria-pressed',String(current));button.setAttribute('aria-label',`${color.name} · ${current?'当前':colors.owns(color.id)?'已拥有':color.price+' 航行值'}`);}
  refreshBadges();document.querySelector('#ship-title-name').textContent=customization.data.name;
 }
 function hit(x,y){if(x<0||y<0||x>innerWidth||y>innerHeight)return false;pointer.set(x/innerWidth*2-1,1-y/innerHeight*2);ship.updateWorldMatrix(true,true);camera.updateMatrixWorld();ray.setFromCamera(pointer,camera);return ray.intersectObject(ship,true).length>0;}
 function open(){if(phase!=='sailing')return;previousFocus=document.activeElement;yaw=0;pitch=0;vYaw=0;vPitch=0;phase='opening';progress=0;view=createShowcaseCamera(camera,controls);document.body.dataset.showcase='true';dialog.hidden=false;dialog.classList.remove('leaving');nameInput.value=customization.data.name;notice.textContent='外观与航行进度会自动保存在本机';onEnter();hint.textContent=colors.takeHint()?'航行会慢慢积累航行值，可以用来解锁新的颜色。':'解锁一次，船体、船顶和装饰线都可使用。';tab('colors');refresh();document.querySelector('#ship-close').focus();}
 function close(){if(phase==='sailing'||phase==='closing')return;acknowledgeBadges();dismissPurchase();clearTimeout(noticeTimer);phase='closing';drag=null;pressed=null;vYaw=0;vPitch=0;dialog.classList.add('leaving');}
 document.querySelector('#ship-close').addEventListener('click',close);
 document.addEventListener('keydown',e=>{
  if(phase==='sailing'){if(document.activeElement===canvas&&(e.key==='Enter'||e.key===' ')){e.preventDefault();open();}return;}
  if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();if(pending){const id=pending.color.id;dismissPurchase();colorButtons.get(id).focus();}else close();return;}
  if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)&&document.activeElement===canvas){e.preventDefault();yaw+=(e.key==='ArrowLeft'?.15:e.key==='ArrowRight'?-.15:0);pitch=THREE.MathUtils.clamp(pitch+(e.key==='ArrowUp'?.08:e.key==='ArrowDown'?-.08:0),-1,.04);}
  if(e.key==='Tab'){const focusable=[canvas,...dialog.querySelectorAll('button:not(:disabled),input')].filter(el=>el.tabIndex>=0&&el.getClientRects().length);const index=focusable.indexOf(document.activeElement);e.preventDefault();focusable[(index+(e.shiftKey?-1:1)+focusable.length)%focusable.length].focus();}
 },true);
 canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;if(phase!=='sailing'){
   e.stopImmediatePropagation();if(phase==='open'){drag={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);canvas.focus();}return;}
  pressed={id:e.pointerId,x:e.clientX,y:e.clientY,moved:false,hit:hit(e.clientX,e.clientY)};
 },true);
 canvas.addEventListener('pointermove',e=>{
  if(pressed&&Math.hypot(e.clientX-pressed.x,e.clientY-pressed.y)>6)pressed.moved=true;
  if(drag&&drag.id===e.pointerId){e.stopImmediatePropagation();const dx=e.clientX-drag.x,dy=e.clientY-drag.y;yaw-=dx*.009;pitch=THREE.MathUtils.clamp(pitch-dy*.005,-1,.04);vYaw=-dx*.009*12;vPitch=-dy*.005*12;drag.x=e.clientX;drag.y=e.clientY;}
  canvas.style.cursor=phase==='open'?(drag?'grabbing':'grab'):phase==='sailing'&&hit(e.clientX,e.clientY)?'pointer':'default';
 },true);
 canvas.addEventListener('pointerup',e=>{if(drag?.id===e.pointerId){drag=null;if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);}if(pressed?.id===e.pointerId){const click=pressed.hit&&!pressed.moved&&hit(e.clientX,e.clientY);pressed=null;if(click)open();}},true);
 for(const event of ['pointercancel','lostpointercapture'])canvas.addEventListener(event,()=>{drag=null;pressed=null;vYaw=0;vPitch=0;});
 window.addEventListener('blur',()=>{drag=null;pressed=null;vYaw=0;vPitch=0;});
 refresh();
 return {open,close,hit,refreshBadges(){if(phase!=='sailing'&&!badgePanel.hidden)refreshBadges();},get busy(){return phase!=='sailing';},get inspecting(){return phase==='open';},get blend(){return progress*progress*(3-2*progress);},snapshot:()=>({phase,progress,yaw,pitch}),
  update(dt){
   if(phase==='sailing')return;
   const step=dt/(reduceMotion?.12:.85);progress=THREE.MathUtils.clamp(progress+(phase==='closing'?-step:step),0,1);
   const blend=progress*progress*(3-2*progress);
   if(!drag){yaw+=vYaw*dt;pitch=THREE.MathUtils.clamp(pitch+vPitch*dt,-1,.04);vYaw*=Math.exp(-dt*7);vPitch*=Math.exp(-dt*7);}
   const available=Math.max(.3,1-panel.getBoundingClientRect().height/innerHeight-.1);
   view.update(ship,available,yaw,pitch,blend);
   if(phase==='opening'&&progress===1)phase='open';
   if(phase==='closing'&&progress===0){view.restore();phase='sailing';dialog.hidden=true;document.body.dataset.showcase='false';onLeave();(previousFocus?.isConnected?previousFocus:canvas).focus();}
  }
 };
}
