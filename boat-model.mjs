import * as THREE from 'three';
import {boatSkin} from './boat-skins.mjs';

// One moving root, one material set and pooled primitives. Only skin-specific hull/cabin
// surfaces are replaced and disposed; the nameplate, light and encounter anchors survive.
export function createBoatModel(initial='classic'){
 const ship=new THREE.Group();ship.name='sailing-boat';
 const mounts=Object.fromEntries(['flag','deck','chimney','lifering','nameplate','charm','roof'].map(slot=>{const group=new THREE.Group();group.name='mount-'+slot;ship.add(group);return [slot,group];}));
 const material=color=>new THREE.MeshStandardMaterial({color,roughness:.88,flatShading:true});
 const materials=Object.fromEntries(['hull','keel','roof','cabin','chimney','cap','rail','stripe'].map(key=>[key,material('#ffffff')]));
 materials.deck=material('#fff3d7');materials.front=material('#fff2d4');materials.ring=material('#6e9db9');materials.glass=material('#91b7cc');materials.warm=material('#f7df9c');materials.port=material('#18374b');materials.lamp=material('#ffdf94');materials.lamp.emissive.set('#ffc366');materials.glass.emissive.set('#ffcb81');materials.warm.emissive.set('#ffd792');materials.warm.emissiveIntensity=.13;
 const primitives={box:new THREE.BoxGeometry(1,1,1),cylinder:new THREE.CylinderGeometry(1,1,1,8),port:new THREE.CylinderGeometry(1,1,1,12),ring:new THREE.TorusGeometry(.12,.032,6,16),ball:new THREE.IcosahedronGeometry(1,2)};
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
  g.setAttribute('position',new THREE.Float32BufferAttribute(v,3));g.setIndex([0,4,1,1,4,5,1,5,2,2,5,6,2,6,3,3,6,7,3,7,0,0,7,4,4,7,5,5,7,6]);g.computeVertexNormals();unique.push(g);add(g,side);
  // Cream forward wall with framed blue windows; lean follows the actual cabin face.
  const angle=-Math.atan2(slope,h),length=Math.hypot(h,slope),face=box(w-.014,length,.018,materials.front,0,y+h/2,front-slope/2+.012);face.rotation.x=angle;
  for(const x of [-w*.245,w*.245]){const pane=box(w*.34,h*.40,.024,materials.glass,x,y+h*.60,front-slope*.60+.028);pane.rotation.x=angle;}
  for(const sideSign of [-1,1])for(let i=0;i<3;i++){const pane=box(.022,h*.37,d*.19,i===1?materials.warm:materials.glass,sideSign*(w/2+.013),y+h*.61,back+d*(.20+i*.28));if(slope&&i===2)pane.scale.z*=.75;}
  return {top:y+h,front:top};
 }
 function setSkin(id){
  const s=boatSkin(id);if(!s)return false;if(skinId===id)return true;
  if(body){ship.remove(body);for(const geometry of unique)geometry.dispose();}unique=[];body=new THREE.Group();body.name='boat-body';ship.add(body);skinId=id;
  for(const key of ['hull','keel','roof','cabin','chimney','cap','rail','stripe'])materials[key].color.set(s[key]);
  const w=s.width,round=['rounded','gentle','wide'].includes(s.form),square=s.form==='square';
  const outline=round?[[-w*.67,-1.13],[-w*.94,-.91],[-w,-.50],[-w,.40],[-w*.90,.82],[-w*.58,1.11],[-w*.22,1.23],[w*.22,1.23],[w*.58,1.11],[w*.90,.82],[w,.40],[w,-.50],[w*.94,-.91],[w*.67,-1.13]]:
   [[-w*.73,-1.14],[-w,-.81],[-w,.54],[-w*(square?.92:.67),1.03],[-w*(square?.76:.18),1.25],[w*(square?.76:.18),1.25],[w*(square?.92:.67),1.03],[w,.54],[w,-.81],[w*.73,-1.14]];
  add(ringGeometry(outline,[[-.13,.70],[.055,.87],[.15,.95]]),materials.keel);
  add(ringGeometry(outline,[[.15,.95],[.47,1]]),materials.hull);
  add(ringGeometry(outline,[[.455,1.005],[.478,1.005]]),materials.stripe);
  add(ringGeometry(outline,[[.478,1],[.515,.99]]),materials.deck);
  const slope=['speedy','explorer','light'].includes(s.form)?.19:0,cw=w*(s.form==='wide'?1.54:1.40),cd=s.form==='speedy'?1.15:1.20,cz=-.13;
  const lower=cabin(cw,s.cabinHeight,cd,.515,cz,slope);
  const roofOutline=[[-cw/2-.07,-cd/2-.06],[-cw/2-.10,-cd/2+.04],[-cw/2-.10,cd/2-.04-slope],[-cw/2-.02,cd/2+.08-slope],[cw/2+.02,cd/2+.08-slope],[cw/2+.10,cd/2-.04-slope],[cw/2+.10,-cd/2+.04],[cw/2+.07,-cd/2-.06]];
  add(ringGeometry(roofOutline,[[lower.top,.99],[lower.top+.075,1],[lower.top+.11,.97]]),materials.roof,0,0,cz);
  let highest=lower.top+.11;
  if(s.upper){const uw=cw*(s.form==='wide'?.83:.72),ud=s.form==='wide'?.86:.78,upper=cabin(uw,s.upper,ud,highest,cz-.02,s.form==='wide'?.15:0,materials.front);box(uw+.15,.075,ud+.12,materials.roof,0,upper.top+.037,cz-.04);highest=upper.top+.075;}
  box(cw*.55,.21,.43,materials.cabin,0,.62,-.91);box(cw*.66,.065,.51,materials.roof,0,.755,-.91);
  // Stable local mounting frames: +Z is the bow. Deck and roof have independent
  // 0.42 x 0.42 footprints, clear of the cabin, mast, funnel and nameplate.
  mounts.flag.position.set(-cw*.29,highest,.23);
  mounts.deck.position.set(0,.53,.88);
  mounts.chimney.position.set(0,.7875,-.94);mounts.chimney.scale.y=Math.max(1,(highest+.20-.7875)/.68);
  mounts.lifering.position.set(0,.515+s.cabinHeight*.48,-.13);
  mounts.lifering.userData.sideOffset=cw/2+.05;
  mounts.nameplate.position.set(0,.265,-.12);
  mounts.nameplate.userData.sideOffset=w*.976+.012;
  mounts.charm.position.set(-w-.10,.715,-.72);mounts.charm.rotation.y=-Math.PI/2;
  mounts.roof.position.set(.12,highest,-.23);
  for(const slot of ['lifering','nameplate'])for(const child of mounts[slot].children)if(child.userData.side)child.position.x=child.userData.side*mounts[slot].userData.sideOffset;
  // A continuous, raised rail follows each hull outline, including the curved bow.
  const railing=outline.map(([x,z])=>[x*.93,.715,z*.93]);for(let i=0;i<railing.length;i++){rod(railing[i],railing[(i+1)%railing.length],.014,materials.rail);rod([railing[i][0],.515,railing[i][2]],railing[i],.011,materials.rail);}
  for(const sign of [-1,1]){
   for(let i=0;i<4;i++){const z=-.64+i*.31;const rim=add(primitives.port,materials.ring,sign*(w*.99+.004),.403,z,.032,.022,.032);rim.rotation.z=Math.PI/2;const glass=add(primitives.port,materials.port,sign*(w*.99+.017),.403,z,.023,.024,.023);glass.rotation.z=Math.PI/2;}
   const anchor=add(primitives.ring,materials.rail,sign*w*.80,.36,.94,.26,.26,.26);anchor.rotation.y=sign*Math.PI*.36;
  }
  ship.userData.skinId=id;
  return true;
 }
 setSkin(initial);
 return {ship,mounts,materials,shipLight,setSkin,get skinId(){return skinId;}};
}
