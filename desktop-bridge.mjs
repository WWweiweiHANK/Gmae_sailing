import {isTauri,invoke} from '@tauri-apps/api/core';
import {listen} from '@tauri-apps/api/event';
export async function connectDesktop(onState,onReset,onDiagnostics,onExit){
 const native=isTauri();
 let state={editing:!native,paused:false,visible:true,minimized:false,settings:{fps:30,wave:1,sound:false,camera:null,topmost:true}};
 const update=next=>{state=next;onState(next);};
 if(native){
  await listen('pet-state',event=>update(event.payload));
  await listen('reset-camera',onReset);
  await listen('export-diagnostics',()=>invoke('write_diagnostics',{report:onDiagnostics()}).catch(console.warn));
  await listen('save-before-exit',()=>{onExit();void invoke('finish_exit').catch(console.warn);});
  update(await invoke('pet_state'));
  // Native hide/minimize does not consistently dispatch document.visibilitychange in every WebView2 release.
  setInterval(()=>invoke('pet_state').then(update).catch(console.warn),1000);
 }else update(state);
 return {
  native,
  action:async id=>{
   if(native)return invoke('pet_action',{id});
   state={...state,settings:{...state.settings}};
   if(id==='edit'||id==='lock')state.editing=id==='edit';
   if(id==='pause')state.paused=!state.paused;
   if(id==='sound')state.settings.sound=!state.settings.sound;
   if(id==='fps20'||id==='fps30')state.settings.fps=id==='fps20'?20:30;
   if(id==='reset')onReset();
   update({...state});
  },
  drag:()=>native?invoke('drag_pet'):Promise.resolve(),
  pointer:()=>invoke('ship_pointer'),
  hover:hit=>invoke('ship_hover',{hit}),
  save:async(camera,wave)=>{
   if(native)return invoke('save_view',{camera,wave});
   try{localStorage.setItem('tiny-tides-view',JSON.stringify({camera,wave}));}catch{}
  },
  diagnostics:report=>native?invoke('write_diagnostics',{report}):Promise.resolve()
 };
}
