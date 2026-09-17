export const RENDER_LIMITS={30:{dpr:1.5,pixels:921600,maxSide:1280},20:{dpr:1,pixels:480000,maxSide:960}};
export function drawingSize(width,height,dpr=1,fps=30){
 const limit=RENDER_LIMITS[fps]||RENDER_LIMITS[30];
 const ratio=Math.min(dpr,limit.dpr,limit.maxSide/Math.max(width,height),Math.sqrt(limit.pixels/(width*height)));
 return {width:Math.max(1,Math.floor(width*ratio)),height:Math.max(1,Math.floor(height*ratio)),ratio};
}
export function createFrameClock(){
 let last=null,running=false;
 return {reset(){last=null;running=false;},tick(now,active,fps){
  if(!active){last=null;running=false;return 0;}
  if(!running||last===null){running=true;last=now;return 0;}
  const elapsed=now-last;if(elapsed<1000/fps-.5)return 0;
  last=now;return elapsed/1000;
 }};
}
