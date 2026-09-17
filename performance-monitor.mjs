// CPU submission times are NOT GPU frame times. Storage is bounded for long runs.
export function createPerformanceMonitor(renderer){
 let start=0,frames=0,cpu=[],last=null,total=0;
 const history=[];
 return {sample(now,cost,environment,buffer){
  if(!start)start=now;
  frames++;total++;cpu.push(cost);
  if(now-start<5000)return;
  cpu.sort((a,b)=>a-b);
  last={timestamp:new Date().toISOString(),fps:frames*1000/(now-start),cpuMeanMs:cpu.reduce((s,x)=>s+x,0)/cpu.length,cpuP95Ms:cpu[Math.floor(cpu.length*.95)],
   calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,programs:renderer.info.programs?.length||0,
   buffer:[buffer.width,buffer.height],period:environment.period,weather:environment.weather,aurora:environment.auroraAllowed&&environment.worldTime>environment.auroraAt,
   jsHeapBytes:performance.memory?.usedJSHeapSize??null,totalFrames:total};
  history.push(last);if(history.length>360)history.shift();start=now;frames=0;cpu=[];
 },resetInterval(){start=0;frames=0;cpu=[];},report(){return {last,history:[...history],note:'fps is observed rendered frames; CPU excludes asynchronous GPU completion; JS heap excludes native/GPU memory.'};}};
}
