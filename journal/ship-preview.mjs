import * as THREE from 'three';

// Transform copies own no GPU resources. Geometry, materials and name textures stay shared.
export function clonePreviewShip(ship){
 const copy=ship.clone(true);copy.position.set(0,0,0);copy.rotation.set(0,0,0);copy.scale.setScalar(1);
 copy.traverse(o=>{o.castShadow=false;o.receiveShadow=false;if(o.isLight)o.visible=false;});return copy;
}
export function createShipPreview(renderer,ship){
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(32,1,.1,30);
 const hemi=new THREE.HemisphereLight(0xf3faff,0x72858b,2.8),sun=new THREE.DirectionalLight(0xfff2d8,3);sun.position.set(-3,5,4);scene.add(hemi,sun);
 const size=320,target=new THREE.WebGLRenderTarget(size,size,{depthBuffer:true});target.texture.colorSpace=THREE.SRGBColorSpace;
 const pixels=new Uint8Array(size*size*4),frame=new ImageData(size,size),clear=new THREE.Color();let copy=null,canvas=null,last=0,yaw=.65,pitch=.37,drag=null;
 function rebuild(){if(copy)scene.remove(copy);copy=clonePreviewShip(ship);scene.add(copy);}
 function bind(next){canvas=next;if(!next)return;next.width=next.height=size;next.tabIndex=0;next.setAttribute('aria-label','小船记录模型，拖动或使用方向键旋转');
  next.onpointerdown=e=>{if(e.button!==0)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY};next.setPointerCapture(e.pointerId);};
  next.onpointermove=e=>{if(!drag||drag.id!==e.pointerId)return;yaw-=(e.clientX-drag.x)*.012;pitch=THREE.MathUtils.clamp(pitch+(e.clientY-drag.y)*.008,.12,.8);drag.x=e.clientX;drag.y=e.clientY;};
  next.onpointerup=next.onpointercancel=()=>{drag=null;};
  next.onkeydown=e=>{if(!e.key.startsWith('Arrow'))return;e.preventDefault();e.stopPropagation();yaw+=e.key==='ArrowLeft'?.15:e.key==='ArrowRight'?-.15:0;pitch=THREE.MathUtils.clamp(pitch+(e.key==='ArrowUp'?.08:e.key==='ArrowDown'?-.08:0),.12,.8);};
 }
 rebuild();
 return {rebuild,bind,render(now){if(!canvas?.isConnected||now-last<1000/15)return;last=now;camera.position.set(Math.sin(yaw)*6.4,1+Math.sin(pitch)*6.4,Math.cos(yaw)*6.4);camera.lookAt(0,1,0);
  const previous=renderer.getRenderTarget(),alpha=renderer.getClearAlpha(),auto=renderer.shadowMap.autoUpdate;renderer.getClearColor(clear);renderer.shadowMap.autoUpdate=false;
  try{renderer.setRenderTarget(target);renderer.setClearColor(0,0);renderer.clear();renderer.render(scene,camera);renderer.readRenderTargetPixels(target,0,0,size,size,pixels);
   for(let y=0;y<size;y++)frame.data.set(pixels.subarray(y*size*4,(y+1)*size*4),(size-y-1)*size*4);canvas.getContext('2d').putImageData(frame,0,0);
  }finally{renderer.setRenderTarget(previous);renderer.setClearColor(clear,alpha);renderer.shadowMap.autoUpdate=auto;}
 },dispose(){bind(null);target.dispose();scene.clear();},snapshot:()=>({yaw,pitch,size,active:!!canvas?.isConnected})};
}
