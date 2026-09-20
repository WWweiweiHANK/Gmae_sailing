import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {boatSkin} from './boat-skins.mjs';

// One moving root, one material set and pooled primitives. Only skin-specific hull/cabin
// surfaces are replaced and disposed; the nameplate, light and encounter anchors survive.
export function createBoatModel(initial='classic'){
 const ship=new THREE.Group();ship.name='sailing-boat';
 const mounts=Object.fromEntries(['flag','deck','chimney','lifering','nameplate','charm','roof'].map(slot=>{const group=new THREE.Group();group.name='mount-'+slot;ship.add(group);return [slot,group];}));
 const material=color=>new THREE.MeshStandardMaterial({color,roughness:.88,flatShading:true});
 const materials=Object.fromEntries(['hull','keel','roof','cabin','chimney','cap','rail','stripe'].map(key=>[key,material('#ffffff')]));
 materials.deck=material('#fff3d7');materials.front=material('#fff2d4');materials.ring=material('#6e9db9');materials.glass=material('#91b7cc');materials.warm=material('#f7df9c');materials.port=material('#18374b');materials.lamp=material('#ffdf94');materials.lamp.emissive.set('#ffc366');materials.glass.emissive.set('#ffcb81');materials.warm.emissive.set('#ffd792');materials.warm.emissiveIntensity=.13;
 const primitives={box:new RoundedBoxGeometry(1,1,1,1,.035),cylinder:new THREE.CylinderGeometry(1,1,1,8),port:new THREE.CylinderGeometry(1,1,1,12),ring:new THREE.TorusGeometry(.12,.032,6,16)};
 const shipLight=new THREE.PointLight(0xffc67f,0,4,2);shipLight.position.set(0,1.25,.6);ship.add(shipLight);
 let body=null,skinId=null,unique=[];
 function add(geometry,mat,x=0,y=0,z=0,sx=1,sy=1,sz=1){const mesh=new THREE.Mesh(geometry,mat);mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);mesh.castShadow=true;mesh.receiveShadow=true;body.add(mesh);return mesh;}
 const box=(w,h,d,mat,x,y,z)=>add(primitives.box,mat,x,y,z,w,h,d);
 function rod(a,b,r,mat){const v=new THREE.Vector3(...b).sub(new THREE.Vector3(...a));const mesh=add(primitives.cylinder,mat,...new THREE.Vector3(...a).add(new THREE.Vector3(...b)).multiplyScalar(.5).toArray(),r,v.length(),r);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());return mesh;}
 function ringGeometry(outline,levels){
  const vertices=[],indices=[],count=outline.length;
  for(const [y,scale] of levels)for(const [x,z] of outline)vertices.push(x*scale,y,z*scale);
  for(let row=0;row<levels.length-1;row++)for(let i=0;i<count;i++){const a=row*count+i,b=row*count+(i+1)%count;indices.push(a,b,a+count,b,b+count,a+count);}
  const center=vertices.length/3;vertices.push(0,levels.at(-1)[0],0);for(let i=0;i<count;i++)indices.push(center,(levels.length-1)*count+i,(levels.length-1)*count+(i+1)%count);
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();unique.push(g);return g;
 }
 function cabin(w,h,d,y,z,slope=0,side=materials.cabin){
  const back=z-d/2,front=z+d/2,top=front-slope;
  const g=new THREE.BufferGeometry(),v=[-w/2,y,back,w/2,y,back,w/2,y,front,-w/2,y,front,-w/2,y+h,back,w/2,y+h,back,w/2,y+h,top,-w/2,y+h,top];
  g.setAttribute('position',new THREE.Float32BufferAttribute(v,3));g.setIndex([0,4,1,1,4,5,1,5,2,2,5,6,2,6,3,3,6,7,3,7,0,0,7,4,4,7,5,5,7,6]);g.computeVertexNormals();unique.push(g);
  if(slope)add(g,side);else{const rounded=new RoundedBoxGeometry(w,h,d,1,.018);unique.push(rounded);add(rounded,side,0,y+h/2,z);}
  // Cream forward wall with framed blue windows; lean follows the actual cabin face.
  const angle=-Math.atan2(slope,h),length=Math.hypot(h,slope),face=box(w-.014,length,.018,materials.front,0,y+h/2,front-slope/2+.012);face.rotation.x=angle;
  for(const x of [-w*.245,w*.245]){const frame=box(w*.37,h*.50,.024,materials.deck,x,y+h*.58,front-slope*.58+.024);frame.rotation.x=angle;const pane=box(w*.31,h*.40,.026,materials.glass,x,y+h*.58,front-slope*.58+.038);pane.rotation.x=angle;}
  const upper=side===materials.front,positions=upper?[.19,.50,.81]:[.19,.81];
  for(const sideSign of [-1,1])for(const t of positions){const depth=d*(upper?.23:.22)*(slope&&t>.7?.80:1),height=h*(upper?.50:.46);box(.024,height+.036,depth+.037,materials.deck,sideSign*(w/2+.011),y+h*.55,back+d*t);box(.027,height,depth,materials.glass,sideSign*(w/2+.025),y+h*.55,back+d*t);}
  return {top:y+h,front:top};
 }
 function setSkin(id){
  const s=boatSkin(id);if(!s)return false;if(skinId===id)return true;
  if(body){ship.remove(body);for(const geometry of unique)geometry.dispose();}unique=[];body=new THREE.Group();body.name='boat-body';ship.add(body);skinId=id;
  for(const key of ['hull','keel','roof','cabin','chimney','cap','rail','stripe'])materials[key].color.set(s[key]);
  const w=s.width*1.06,round=['rounded','gentle','wide'].includes(s.form),square=s.form==='square';
  const outline=round?[[-w*.67,-1.13],[-w*.94,-.91],[-w,-.50],[-w,.40],[-w*.90,.82],[-w*.58,1.11],[-w*.22,1.23],[w*.22,1.23],[w*.58,1.11],[w*.90,.82],[w,.40],[w,-.50],[w*.94,-.91],[w*.67,-1.13]]:
   [[-w*.73,-1.14],[-w*.94,-.95],[-w,-.64],[-w,.50],[-w*(square?.96:.83),.95],[-w*(square?.76:.40),1.25],[w*(square?.76:.40),1.25],[w*(square?.96:.83),.95],[w,.50],[w,-.64],[w*.94,-.95],[w*.73,-1.14]];
  add(ringGeometry(outline,[[-.13,.72],[.015,.85],[.125,.925]]),materials.keel);
  add(ringGeometry(outline,[[.125,.925],[.55,1]]),materials.hull);
  add(ringGeometry(outline,[[.55,1.005],[.572,1.005]]),materials.stripe);
  add(ringGeometry(outline,[[.572,1],[.605,1.002],[.62,.992]]),materials.deck);
  const slope=['speedy','explorer','light'].includes(s.form)?.16:0,cw=w*(s.form==='wide'?1.46:1.32),cd=s.form==='speedy'?1.12:1.18,cz=-.16,ch=s.cabinHeight*.90;
  const lower=cabin(cw,ch,cd,.62,cz,slope);
  const roofOutline=[[-cw/2-.07,-cd/2-.06],[-cw/2-.10,-cd/2+.04],[-cw/2-.10,cd/2-.04-slope],[-cw/2-.02,cd/2+.08-slope],[cw/2+.02,cd/2+.08-slope],[cw/2+.10,cd/2-.04-slope],[cw/2+.10,-cd/2+.04],[cw/2+.07,-cd/2-.06]];
  add(ringGeometry(roofOutline,[[lower.top,.97],[lower.top+.018,1],[lower.top+.067,1],[lower.top+.09,.97]]),materials.roof,0,0,cz);
  let highest=lower.top+.09;
  if(s.upper){const uw=cw*(s.form==='wide'?.83:.82),ud=s.form==='wide'?.86:.88,upper=cabin(uw,s.upper*.90,ud,highest,cz+.04,s.form==='wide'?.13:0,materials.front);const r=[[-uw/2-.07,-ud/2-.04],[-uw/2-.10,-ud/2],[-uw/2-.10,ud/2],[-uw/2-.06,ud/2+.06],[uw/2+.06,ud/2+.06],[uw/2+.10,ud/2],[uw/2+.10,-ud/2],[uw/2+.07,-ud/2-.04]];add(ringGeometry(r,[[upper.top,.98],[upper.top+.017,1],[upper.top+.053,1],[upper.top+.075,.97]]),materials.roof,0,0,cz+.04);highest=upper.top+.075;}
  const funnelBase=s.upper?lower.top-.045:.87;
  box(cw*.60,funnelBase-.62-.025,.45,materials.cabin,0,(funnelBase+.62-.025)/2,-.94);box(cw*.70,.05,.51,materials.roof,0,funnelBase-.025,-.94);
  // Stable local mounting frames: +Z is the bow. Deck and roof have independent
  // 0.42 x 0.42 footprints, clear of the cabin, mast, funnel and nameplate.
  mounts.flag.position.set(-cw*.28,highest,.23);
  mounts.deck.position.set(0,.625,.89);
  mounts.chimney.position.set(0,funnelBase,-.94);mounts.chimney.scale.y=(highest+.15-funnelBase)/.68;
  mounts.lifering.position.set(0,.62+ch*.49,-.16);
  mounts.lifering.userData.sideOffset=cw/2+.05;
  mounts.nameplate.position.set(0,.318,-.04);
  mounts.nameplate.userData.sideOffset=w*.968+.022;
  mounts.charm.position.set(-w-.085,.82,-.91);mounts.charm.rotation.y=-Math.PI/2;
  mounts.roof.position.set(.10,highest,-.23);
  for(const slot of ['lifering','nameplate'])for(const child of mounts[slot].children)if(child.userData.side)child.position.x=child.userData.side*mounts[slot].userData.sideOffset;
  // A continuous, raised rail follows each hull outline, including the curved bow.
  const railing=outline.map(([x,z])=>[x*.94,.82,z*.95]);for(let i=0;i<railing.length;i++){rod(railing[i],railing[(i+1)%railing.length],.018,materials.rail);rod([railing[i][0],.62,railing[i][2]],railing[i],.014,materials.rail);}
  for(const sign of [-1,1]){
   for(let i=0;i<4;i++){const z=-.56+i*.30;const rim=add(primitives.port,materials.ring,sign*(w*.99+.004),.49,z,.037,.024,.037);rim.rotation.z=Math.PI/2;const glass=add(primitives.port,materials.port,sign*(w*.99+.018),.49,z,.027,.026,.027);glass.rotation.z=Math.PI/2;}
   const anchor=add(primitives.ring,materials.rail,sign*w*.79,.44,.94,.36,.36,.36);anchor.rotation.y=sign*Math.PI*.36;
  }
  ship.userData.skinId=id;
  return true;
 }
 setSkin(initial);
 return {ship,mounts,materials,shipLight,setSkin,get skinId(){return skinId;}};
}
