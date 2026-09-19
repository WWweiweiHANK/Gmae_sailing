import * as THREE from 'three';
import {SHIP_COLORS,SHIP_BADGES,drawBadge,shipName} from './ship-customization.mjs';

export function createShipShowcase({canvas,camera,controls,ship,customization,onEnter,onLeave}){
 const dialog=document.querySelector('#my-ship'),panel=document.querySelector('#ship-panel');
 const notice=document.querySelector('#ship-notice'),nameInput=document.querySelector('#ship-name');
 const ray=new THREE.Raycaster(),pointer=new THREE.Vector2(),center=new THREE.Vector3(0,1,0),rotatedCenter=new THREE.Vector3();
 const focus=new THREE.Vector3(),destination=new THREE.Vector3(),look=new THREE.Vector3(),up=new THREE.Vector3();
 let phase='sailing',progress=0,saved=null,heading=0,yaw=0,pitch=0,vYaw=0,vPitch=0,drag=null,pressed=null,previousFocus=null;
 const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const tabs=[...dialog.querySelectorAll('[role=tab]')];
 function tab(id){for(const button of tabs){const active=button.dataset.tab===id;button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1;document.querySelector('#ship-'+button.dataset.tab).hidden=!active;}}
 tabs.forEach((button,i)=>{button.addEventListener('click',()=>tab(button.dataset.tab));button.addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();const next=tabs[(i+(e.key==='ArrowRight'?1:2))%3];tab(next.dataset.tab);next.focus();}});});
 for(const [key,label] of [['hullColor','船体主色'],['roofColor','船顶颜色'],['stripeColor','装饰线']]){
  const row=document.createElement('fieldset'),legend=document.createElement('legend');legend.textContent=label;row.append(legend);
  for(const [name,color] of SHIP_COLORS){const button=document.createElement('button');button.type='button';button.className='ship-swatch';button.style.setProperty('--swatch',color);button.setAttribute('aria-label',`${label} · ${name}`);button.title=name;button.dataset.color=color;button.dataset.part=key;
   button.addEventListener('click',()=>{customization.update({[key]:color});refresh();});row.append(button);}
  document.querySelector('#ship-colors').append(row);
 }
 for(const badge of [{id:null,name:'不佩戴',unlocked:true},...SHIP_BADGES]){
  const button=document.createElement('button');button.type='button';button.className='ship-badge';button.dataset.badge=badge.id??'';button.disabled=!badge.unlocked;
  if(!badge.unlocked){button.textContent='？';button.setAttribute('aria-label','尚未解锁');}
  else{if(badge.id){const icon=document.createElement('canvas');icon.width=80;icon.height=80;icon.setAttribute('aria-hidden','true');drawBadge(icon.getContext('2d'),badge.id,40,40,72);button.append(icon);}const label=document.createElement('span');label.textContent=badge.name;button.append(label);button.addEventListener('click',()=>{customization.update({equippedBadge:badge.id});refresh();});}
  document.querySelector('#ship-badge-options').append(button);
 }
 document.querySelector('#ship-name-form').addEventListener('submit',e=>{e.preventDefault();const name=shipName(nameInput.value);if(!name){notice.textContent='给小船取一个名字吧。';nameInput.focus();return;}
  customization.update({name});if(name!==nameInput.value.trim())notice.textContent='船名已按铭牌宽度缩短并保存。';nameInput.value=name;refresh();});
 function refresh(){dialog.querySelectorAll('[data-part]').forEach(b=>b.setAttribute('aria-pressed',String(customization.data[b.dataset.part]===b.dataset.color)));dialog.querySelectorAll('[data-badge]').forEach(b=>b.setAttribute('aria-pressed',String((customization.data.equippedBadge??'')===b.dataset.badge)));document.querySelector('#ship-title-name').textContent=customization.data.name;}
 function hit(x,y){if(x<0||y<0||x>innerWidth||y>innerHeight)return false;pointer.set(x/innerWidth*2-1,1-y/innerHeight*2);ship.updateWorldMatrix(true,true);camera.updateMatrixWorld();ray.setFromCamera(pointer,camera);return ray.intersectObject(ship,true).length>0;}
 function open(){if(phase!=='sailing')return;previousFocus=document.activeElement;saved={position:camera.position.clone(),target:controls.target.clone(),enabled:controls.enabled};heading=ship.rotation.y;yaw=0;pitch=0;vYaw=0;vPitch=0;phase='opening';progress=0;controls.enabled=false;document.body.dataset.showcase='true';dialog.hidden=false;dialog.classList.remove('leaving');nameInput.value=customization.data.name;notice.textContent='外观与航行进度会自动保存在本机';onEnter();tab('colors');refresh();document.querySelector('#ship-close').focus();}
 function close(){if(phase==='sailing'||phase==='closing')return;phase='closing';drag=null;pressed=null;vYaw=0;vPitch=0;dialog.classList.add('leaving');}
 document.querySelector('#ship-close').addEventListener('click',close);
 document.addEventListener('keydown',e=>{
  if(phase==='sailing'){if(document.activeElement===canvas&&(e.key==='Enter'||e.key===' ')){e.preventDefault();open();}return;}
  if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();close();return;}
  if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)&&document.activeElement===canvas){e.preventDefault();yaw+=(e.key==='ArrowLeft'?-.15:e.key==='ArrowRight'?.15:0);pitch=THREE.MathUtils.clamp(pitch+(e.key==='ArrowUp'?-.08:e.key==='ArrowDown'?.08:0),-Math.PI/9,Math.PI/6);}
  if(e.key==='Tab'){const focusable=[canvas,...dialog.querySelectorAll('button:not(:disabled),input')].filter(el=>el.tabIndex>=0&&el.getClientRects().length);const index=focusable.indexOf(document.activeElement);e.preventDefault();focusable[(index+(e.shiftKey?-1:1)+focusable.length)%focusable.length].focus();}
 },true);
 canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;if(phase!=='sailing'){
   e.stopImmediatePropagation();if(phase==='open'&&hit(e.clientX,e.clientY)){drag={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);canvas.focus();}return;}
  pressed={id:e.pointerId,x:e.clientX,y:e.clientY,moved:false,hit:hit(e.clientX,e.clientY)};
 },true);
 canvas.addEventListener('pointermove',e=>{
  if(pressed&&Math.hypot(e.clientX-pressed.x,e.clientY-pressed.y)>6)pressed.moved=true;
  if(drag&&drag.id===e.pointerId){e.stopImmediatePropagation();const dx=e.clientX-drag.x,dy=e.clientY-drag.y;yaw+=dx*.009;pitch=THREE.MathUtils.clamp(pitch+dy*.005,-Math.PI/9,Math.PI/6);vYaw=dx*.009*12;vPitch=dy*.005*12;drag.x=e.clientX;drag.y=e.clientY;}
  canvas.style.cursor=phase==='open'?(drag?'grabbing':hit(e.clientX,e.clientY)?'grab':'default'):phase==='sailing'&&hit(e.clientX,e.clientY)?'pointer':'default';
 },true);
 canvas.addEventListener('pointerup',e=>{if(drag?.id===e.pointerId){drag=null;if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);}if(pressed?.id===e.pointerId){const click=pressed.hit&&!pressed.moved&&hit(e.clientX,e.clientY);pressed=null;if(click)open();}},true);
 for(const event of ['pointercancel','lostpointercapture'])canvas.addEventListener(event,()=>{drag=null;pressed=null;vYaw=0;vPitch=0;});
 window.addEventListener('blur',()=>{drag=null;pressed=null;vYaw=0;vPitch=0;});
 refresh();
 return {open,close,hit,get busy(){return phase!=='sailing';},get inspecting(){return phase==='open';},get blend(){return progress*progress*(3-2*progress);},snapshot:()=>({phase,progress,yaw,pitch}),
  update(dt){
   if(phase==='sailing')return;
   const step=dt/(reduceMotion?.12:.85);progress=THREE.MathUtils.clamp(progress+(phase==='closing'?-step:step),0,1);
   const blend=progress*progress*(3-2*progress);
   if(!drag){yaw+=vYaw*dt;pitch=THREE.MathUtils.clamp(pitch+vPitch*dt,-Math.PI/9,Math.PI/6);vYaw*=Math.exp(-dt*7);vPitch*=Math.exp(-dt*7);}
   if(phase==='closing'){yaw*=Math.exp(-dt*9);pitch*=Math.exp(-dt*9);}
   ship.rotation.y=heading+yaw*blend;ship.rotation.x+=pitch*blend;ship.rotation.order='YXZ';
   rotatedCenter.copy(center).applyQuaternion(ship.quaternion);ship.position.add(center).sub(rotatedCenter);
   focus.copy(ship.position).add(rotatedCenter);
   const available=Math.max(.3,1-panel.getBoundingClientRect().height/innerHeight-.1);
   const distance=Math.max(1.9/(Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*available),1.8/(Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*camera.aspect));
   destination.copy(saved.position).sub(saved.target).normalize();destination.y=.28;destination.normalize().multiplyScalar(distance);
   // Bias the focus above the panel without moving the ocean or cloning the ship.
   up.set(0,1,0);up.addScaledVector(destination,-up.dot(destination)/destination.lengthSq()).normalize();
   look.copy(focus).addScaledVector(up,-distance*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*(1-available)*.7);
   destination.add(look);camera.position.lerpVectors(saved.position,destination,blend);controls.target.lerpVectors(saved.target,look,blend);camera.lookAt(controls.target);
   if(phase==='opening'&&progress===1)phase='open';
   if(phase==='closing'&&progress===0){camera.position.copy(saved.position);controls.target.copy(saved.target);controls.enabled=saved.enabled;phase='sailing';dialog.hidden=true;document.body.dataset.showcase='false';ship.rotation.order='XYZ';onLeave();(previousFocus?.isConnected?previousFocus:canvas).focus();}
  }
 };
}
