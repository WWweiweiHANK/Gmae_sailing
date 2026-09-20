import p0 from '../assets/journal/pencil-0.wav';
import p1 from '../assets/journal/pencil-1.wav';
import p2 from '../assets/journal/pencil-2.wav';
import p3 from '../assets/journal/pencil-3.wav';
import p4 from '../assets/journal/pencil-4.wav';
import page from '../assets/journal/page.wav';
import close from '../assets/journal/close.wav';
export const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
export function PencilAudioController(allowed){
 const strokes=[p0,p1,p2,p3,p4].map(src=>new Audio(src)),paper=new Audio(page),shut=new Audio(close);let timer=0,running=false;
 function play(audio,volume){if(!allowed())return;audio.currentTime=0;audio.volume=volume;audio.playbackRate=.9+Math.random()*.2;audio.play().catch(error=>{if(error.name!=='AbortError')console.warn('手账声音未能播放',error);});}
 function stroke(){if(!running)return;if(allowed())play(strokes[Math.floor(Math.random()*strokes.length)],.32+Math.random()*.06);timer=setTimeout(stroke,210+Math.random()*170);}
 function stop(){running=false;clearTimeout(timer);strokes.forEach(a=>a.pause());}
 return {startStroke(){stop();running=true;stroke();},pauseStroke:stop,resumeStroke(){if(!running){running=true;stroke();}},stopStroke:stop,paper(kind){play(kind==='close'?shut:paper,.55);},sync(){if(!allowed()){strokes.forEach(a=>a.pause());paper.pause();shut.pause();}},dispose(){stop();for(const a of [...strokes,paper,shut]){a.pause();a.removeAttribute('src');a.load();}}};
}
export function createWritingAnimator(pencil,audio,reduced){
 function point(x,y){pencil.removeAttribute('hidden');pencil.style.left=x+'px';pencil.style.top=y+'px';}
 return {async writeText(node,value){node.textContent='';const text=document.createTextNode('');node.append(text);const range=document.createRange();let lastY=null;audio.startStroke();
  for(const char of Array.from(value)){text.appendData(char);range.setStart(text,Math.max(0,text.length-char.length));range.setEnd(text,text.length);const r=range.getBoundingClientRect();point(r.right,r.bottom-3);const pause=/[，。！？；、…]/u.test(char),line=lastY!==null&&Math.abs(r.bottom-lastY)>4;lastY=r.bottom;if(pause||line)audio.pauseStroke();await wait(reduced.matches?1:line?120:pause?80+Math.random()*80:30+Math.random()*35);if(pause||line)audio.resumeStroke();}
  audio.stopStroke();await wait(reduced.matches?20:350+Math.random()*250);pencil.setAttribute('hidden','');
 },async draw(svg){
  const paths=[...svg.querySelectorAll('path')];for(const path of paths){const length=path.getTotalLength();path.style.strokeDasharray=length;path.style.strokeDashoffset=length;}
  audio.startStroke();for(const path of paths){const length=path.getTotalLength(),duration=(reduced.matches?100:1800)/paths.length,start=performance.now();
   await new Promise(resolve=>{function frame(now){const t=Math.min(1,(now-start)/duration);path.style.strokeDashoffset=length*(1-t);const p=path.getPointAtLength(length*t),matrix=path.getScreenCTM();if(matrix){const screen=new DOMPoint(p.x,p.y).matrixTransform(matrix);point(screen.x,screen.y);}if(t<1)requestAnimationFrame(frame);else resolve();}requestAnimationFrame(frame);});
  }audio.stopStroke();pencil.setAttribute('hidden','');
 }};
}
