import seaURL from './audio/sea.mp3';
import rainURL from './audio/rain.mp3';
import gullURL from './audio/gull.mp3';
import thunderURL from './audio/thunder.mp3';
import { ambientMix } from './audio-mix.mjs';

// Licensed field recordings are bundled into the standalone HTML. See SOUND_CREDITS.md.
export function createAmbientAudio(onStateChange=()=>{}){
  let context,master,buses,buffers,loading,enabled=false,visible=!document.hidden;
  let weather='sunny',volume=.22,nextCall=0,suspendTimer;
  const loops=[],shots=new Set();
  function clearShots(){for(const shot of shots)try{shot.stop();}catch{}shots.clear();}
  const smooth=(param,value,seconds=.65)=>param.setTargetAtTime(value,context.currentTime,seconds);
  function mix(){
    if(!context)return;
    const levels=ambientMix(weather);
    for(const name of ['sea','rain','gull'])smooth(buses[name].gain,levels[name]);
    smooth(buses.thunder.gain,['rainy','storm'].includes(weather)?.32:0,.5);
    smooth(master.gain,enabled&&visible?volume:0,.18);
  }
  function initialize(){
    const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;
    if(!Audio)throw new Error('浏览器不支持环境音');
    context=new Audio();master=context.createGain();master.gain.value=0;
    const limiter=context.createDynamicsCompressor();limiter.threshold.value=-18;limiter.knee.value=12;limiter.ratio.value=6;limiter.attack.value=.02;limiter.release.value=.4;
    master.connect(limiter).connect(context.destination);buses={};
    for(const name of ['sea','rain','gull','thunder']){buses[name]=context.createGain();buses[name].gain.value=0;buses[name].connect(master);}
    context.addEventListener('statechange',()=>{if(visible&&enabled&&context.state!=='running'){enabled=false;onStateChange(false);}});
  }
  async function load(){
    if(buffers)return;
    if(!loading)loading=Promise.all(Object.entries({sea:seaURL,rain:rainURL,gull:gullURL,thunder:thunderURL}).map(async([name,url])=>[name,await context.decodeAudioData(await (await fetch(url)).arrayBuffer())])).then(entries=>{
      buffers=Object.fromEntries(entries);for(const name of ['sea','rain'])loops.push({name,next:context.currentTime});
    }).catch(error=>{loading=null;throw error;});
    await loading;
  }
  function scheduleLoop(loop){
    const at=Math.max(context.currentTime,loop.next),duration=buffers[loop.name].duration,fade=1.5;
    const source=context.createBufferSource(),gain=context.createGain();source.buffer=buffers[loop.name];
    gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(1,at+fade);
    gain.gain.setValueAtTime(1,at+duration-fade);gain.gain.linearRampToValueAtTime(0,at+duration);
    source.connect(gain).connect(buses[loop.name]);source.onended=()=>{source.disconnect();gain.disconnect();};source.start(at);
    loop.next=at+duration-fade;
  }
  function oneShot(name,delay=0){
    if(!enabled||!visible||!buffers||context.state!=='running')return;
    const source=context.createBufferSource(),pan=context.createStereoPanner();source.buffer=buffers[name];pan.pan.value=(Math.random()-.5)*.55;
    source.connect(pan).connect(buses[name]);shots.add(source);source.onended=()=>{shots.delete(source);source.disconnect();pan.disconnect();};source.start(context.currentTime+delay);
  }
  async function setEnabled(value){
    clearTimeout(suspendTimer);
    if(!value){enabled=false;clearShots();mix();onStateChange(false);if(context)suspendTimer=setTimeout(()=>{if(!enabled)void context.suspend();},1000);return false;}
    if(!context)initialize();
    try{await context.resume();await load();enabled=context.state==='running';nextCall=context.currentTime+8+Math.random()*8;mix();onStateChange(enabled);tick();if(!visible)void setVisible(false);return enabled;}
    catch(error){enabled=false;mix();onStateChange(false);void context.suspend();throw error;}
  }
  function tick(){
    if(!enabled||!visible||!buffers||context.state!=='running')return;
    const t=context.currentTime;for(const loop of loops)if(loop.next<t+.3)scheduleLoop(loop);
    if(t>=nextCall){if(ambientMix(weather).gull>0)oneShot('gull');nextCall=t+26+Math.random()*24;}
  }
  async function setVisible(value){
    visible=value;if(!context||!enabled)return;clearTimeout(suspendTimer);
    if(!visible){clearShots();mix();suspendTimer=setTimeout(()=>{if(!visible)void context.suspend();},1000);return;}
    try{await context.resume();enabled=context.state==='running';}catch{enabled=false;}
    mix();onStateChange(enabled);
  }
  return {setEnabled,setVisible,tick,
    setWeather(value){weather=value;clearShots();mix();},
    setVolume(value){volume=Math.max(0,Math.min(1,value));mix();},
    thunder(){oneShot('thunder',1.4+Math.random()*.8);},
    get enabled(){return enabled;},get loaded(){return buffers?Object.keys(buffers):[];}
  };
}
