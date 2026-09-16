// Audio is unlocked synchronously by the user's gesture, before the boat enters.
export function createDeparture(enableAudio){
  let pending,started=false,audioReady=false,age=0;
  return {
    launch(){
      if(pending)return pending;
      pending=(async()=>{
        try{audioReady=Boolean(await enableAudio());}catch{audioReady=false;}
        started=true;
      })();
      return pending;
    },
    advance(dt){if(started)age+=dt;},
    shipScale(reducedMotion=false){
      if(!started||age<.45)return 0;
      if(reducedMotion)return 1;
      const p=Math.min(1,(age-.45)/1.8);
      return p===1?1:1-Math.exp(-6*p)*Math.cos(9*p);
    },
    get started(){return started;},get audioReady(){return audioReady;},get age(){return age;}
  };
}
