import * as THREE from 'three';
import {route} from './motion.mjs';
export function createWake(scene,capacity=200,initialScale=1){
 const material=new THREE.MeshBasicMaterial({color:0xf4ffff,transparent:true,depthWrite:false});
 const opacity=new THREE.InstancedBufferAttribute(new Float32Array(capacity),1);
 const geometry=new THREE.IcosahedronGeometry(1,0);geometry.setAttribute('instanceOpacity',opacity);
 material.onBeforeCompile=shader=>{
  shader.vertexShader='attribute float instanceOpacity;varying float wakeAlpha;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nwakeAlpha=instanceOpacity;');
  shader.fragmentShader='varying float wakeAlpha;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.a*=wakeAlpha;');
 };
 const mesh=new THREE.InstancedMesh(geometry,material,capacity);mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(mesh);
 const particles=Array.from({length:capacity},()=>({born:-999,x:0,z:0,dx:0,dz:0}));
 const dummy=new THREE.Object3D();let cursor=0,accumulator=0;
 function emit(t,travel=t,scale=1){const p=route(travel),q=route(travel+.08);const l=Math.hypot(q.x-p.x,q.z-p.z),dx=(q.x-p.x)/l,dz=(q.z-p.z)/l;
  for(const side of [-1,1]){const f=particles[cursor++%capacity];Object.assign(f,{born:t,x:p.x+(-dx*1.04+dz*side*.34)*scale,z:p.z+(-dz*1.04-dx*side*.34)*scale,dx:dz*side,dz:-dx*side,scale});}
 }
 for(let t=7;t<15;t+=.1)emit(t,t,initialScale);
 return {mesh,capacity,update(time,dt,wave,travel=time,emitting=true,scale=1){
  accumulator=emitting?Math.min(accumulator+dt,8):0;while(accumulator>=.1-1e-8){accumulator-=.1;emit(time-accumulator,travel-accumulator,scale);}
  particles.forEach((f,i)=>{const age=time-f.born;if(age<0||age>8){dummy.scale.setScalar(0);opacity.setX(i,0);}else{
   const x=f.x+f.dx*age*.065,z=f.z+f.dz*age*.065;const size=(.1+Math.min(age,3)*.035)*Math.max(.1,1-age/9);
   dummy.position.set(x,.035+wave(x,z,time),z);dummy.scale.set(size*(1+age*.25)*f.scale,.025,size*.8*f.scale);opacity.setX(i,.8*(1-age/8));
  }dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});mesh.instanceMatrix.needsUpdate=true;opacity.needsUpdate=true;
 }};
}
