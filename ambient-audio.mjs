// Locally synthesized ambience: no downloads, tracking, or microphone access.
export function ambientMix(weather) {
  if(weather==='rainy') return {sea:.19,rain:.38,gull:.015};
  if(weather==='night') return {sea:.15,rain:0,gull:.012};
  return {sea:.24,rain:0,gull:.065};
}
function randomGenerator(seed){return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
export function gullSamples(sampleRate,seed=1){
  const length=Math.round(sampleRate*1.7),data=new Float32Array(length),random=randomGenerator(seed);let phase=0,breath=0;
  for(let i=0;i<length;i++){
    const t=i/sampleRate;const start=t<.72?0:.91;const duration=t<.72?.66:.69;const u=(t-start)/duration;
    if(u<=0||u>=1)continue;
    const freq=760+440*Math.sin(Math.PI*Math.min(1,u*1.65))*(1-u*.35)+14*Math.sin(t*73);
    phase+=2*Math.PI*freq/sampleRate;breath=.65*breath+(random()*2-1)*.35;
    const envelope=Math.sin(Math.PI*u)**1.65;
    data[i]=envelope*(.38*Math.sin(phase)+.19*Math.sin(phase*2+.5)+.09*Math.sin(phase*3)+breath*.11)*(1+.055*Math.sin(t*157));
  }
  return data;
}
export function createAmbientAudio(onStateChange=()=>{}){
  let context,master,sea,rain,gull,seaFilter,enabled=false,visible=true,weather='sunny',nextCall=0,lastTick=-1,suspendTimer;
  function smooth(param,value,seconds=.7){param.setTargetAtTime(value,context.currentTime,seconds);}
  function initialize(){
    const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Audio)throw new Error('浏览器不支持环境音');
    context=new Audio();context.addEventListener('statechange',()=>{if(visible&&enabled&&(context.state==='suspended'||context.state==='interrupted'||context.state==='closed')){enabled=false;onStateChange(false);}});master=context.createGain();master.gain.value=0;
    const limiter=context.createDynamicsCompressor();limiter.threshold.value=-12;limiter.knee.value=12;limiter.ratio.value=4;limiter.attack.value=.015;limiter.release.value=.3;master.connect(limiter).connect(context.destination);
    const buffer=context.createBuffer(2,context.sampleRate*18,context.sampleRate);
    for(let channel=0;channel<2;channel++){const data=buffer.getChannelData(channel);const random=randomGenerator(173+channel);let low=0;for(let i=0;i<data.length;i++){low=.96*low+.04*(random()*2-1);data[i]=low*2.8;}}
    const src=context.createBufferSource();src.buffer=buffer;src.loop=true;
    seaFilter=context.createBiquadFilter();seaFilter.type='lowpass';seaFilter.frequency.value=1100;seaFilter.Q.value=.3;
    const high=context.createBiquadFilter();high.type='highpass';high.frequency.value=65;
    sea=context.createGain();sea.gain.value=0;src.connect(high).connect(seaFilter).connect(sea).connect(master);src.start();
    const rainBuffer=context.createBuffer(2,context.sampleRate*13,context.sampleRate);
    for(let c=0;c<2;c++){const data=rainBuffer.getChannelData(c),rand=randomGenerator(c+89);let low=0;for(let i=0;i<data.length;i++){low=.55*low+.45*(rand()*2-1);data[i]=low*.65;}}
    const rainSource=context.createBufferSource();rainSource.buffer=rainBuffer;rainSource.loop=true;
    const rainFilter=context.createBiquadFilter();rainFilter.type='lowpass';rainFilter.frequency.value=5500;
    rain=context.createGain();rain.gain.value=0;rainSource.connect(rainFilter).connect(rain).connect(master);rainSource.start();
    gull=context.createGain();gull.gain.value=0;gull.connect(master);nextCall=context.currentTime+2.5;
  }
  function mix(){if(!context)return;const levels=ambientMix(weather);smooth(rain.gain,levels.rain);smooth(gull.gain,levels.gull);smooth(master.gain,enabled&&visible?.65:0,.15);}
  async function setEnabled(value){
    if(value&&!context)initialize();if(!context)return false;clearTimeout(suspendTimer);
    if(value){await context.resume();enabled=context.state==='running';nextCall=context.currentTime+2.5;}else enabled=false;
    mix();onStateChange(enabled);if(!enabled)suspendTimer=setTimeout(()=>{if(!enabled)void context.suspend();},800);return enabled;
  }
  function tick(){if(!context||!enabled||!visible||context.state!=='running')return;const t=context.currentTime;if(t-lastTick<.09)return;lastTick=t;
    const surge=.5+.5*Math.sin(t*.78+.5*Math.sin(t*.13));smooth(sea.gain,ambientMix(weather).sea*(.48+surge*.52),.23);smooth(seaFilter.frequency,650+surge*1400,.35);
    if(t>nextCall){const data=gullSamples(context.sampleRate,Math.floor(t*1000)),buffer=context.createBuffer(1,data.length,context.sampleRate);buffer.copyToChannel(data,0);const source=context.createBufferSource();source.buffer=buffer;const pan=context.createStereoPanner();pan.pan.value=Math.sin(t*.33)*.65;source.connect(pan).connect(gull);source.onended=()=>{source.disconnect();pan.disconnect();};source.start();nextCall=t+(weather==='sunny'?10:22)+Math.random()*10;}
  }
  async function setVisible(value){
    visible=value;if(!context||!enabled)return;clearTimeout(suspendTimer);
    if(!visible){mix();suspendTimer=setTimeout(()=>{if(!visible)void context.suspend();},800);return;}
    try{await context.resume();enabled=context.state==='running';}catch{enabled=false;}
    mix();onStateChange(enabled);
  }
  return {setEnabled,tick,setWeather(value){weather=value;mix();},setVisible,get enabled(){return enabled;}};
}
