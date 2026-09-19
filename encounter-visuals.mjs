import * as THREE from 'three';
import {seaVertexGLSL} from './water-shader.mjs';
const clamp=x=>Math.max(0,Math.min(1,x)),ease=x=>{x=clamp(x);return x*x*(3-2*x);};
export const encounterBioGLSL=`
uniform float uBio;uniform vec3 uBioBoat;
vec3 encounterBiolight(vec3 p,float t){
 if(uBio<.001)return vec3(0.);
 vec2 q=p.xz,cell=floor(q*10.);float h=fract(sin(dot(cell,vec2(12.9898,78.233)))*43758.5453);
 float dotGlow=exp(-dot(fract(q*10.)-.5,fract(q*10.)-.5)*42.)*smoothstep(.91,.98,h)*(.5+.5*sin(t*.7+h*30.));
 vec2 d=q-uBioBoat.xy,forward=vec2(sin(uBioBoat.z),cos(uBioBoat.z));float aft=-dot(d,forward),side=dot(d,vec2(forward.y,-forward.x));
 float trail=exp(-side*side/(.06+max(0.,aft)*.08))*smoothstep(.7,1.1,aft)*(1.-smoothstep(1.,4.,aft));
 float ring=exp(-pow((length(d)-.95)*5.,2.))*(.5+.5*sin(length(d)*16.-t*1.4));
 return vec3(.045,.64,.57)*uBio*(dotGlow*.22+trail*.5+ring*.13);
}`;
// Subdivide projected silhouettes so their depth follows the curved sea between vertices.
function waterProjectionGeometry(geometry){
 let points=Array.from((geometry.index?geometry.toNonIndexed():geometry).attributes.position.array);
 for(let level=0;level<4;level++){const next=[];for(let i=0;i<points.length;i+=9){const a=points.slice(i,i+3),b=points.slice(i+3,i+6),c=points.slice(i+6,i+9),ab=a.map((v,k)=>(v+b[k])*.5),bc=b.map((v,k)=>(v+c[k])*.5),ca=c.map((v,k)=>(v+a[k])*.5);next.push(...a,...ab,...ca,...ab,...b,...bc,...ca,...bc,...c,...ab,...bc,...ca);}points=next;}
 const result=new THREE.BufferGeometry();result.setAttribute('position',new THREE.Float32BufferAttribute(points,3));geometry.dispose();return result;
}
export function createEncounterVisuals({scene,ship,dolphinPod,waterTime,waterRain,waveStrength}){
 const root=new THREE.Group();root.name='temporary-encounters';scene.add(root);
 const bio={value:0},boat={value:new THREE.Vector3()},groups=new Map(),visible=new Set(),dummy=new THREE.Object3D();let previous=new Set();
 const waveUniforms={uSeaTime:waterTime,uRain:waterRain,uWaveStrength:waveStrength};
 const rim='float rim=pow(abs(vWorld.x)/5.8,4.65)+pow(abs(vWorld.z)/4.45,4.65);';
 function clipped(material){
  material.transparent=true;material.depthWrite=false;
  material.onBeforeCompile=shader=>{shader.vertexShader='varying vec3 vWorld;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>
vec4 encounterP=vec4(transformed,1.);
#ifdef USE_INSTANCING
encounterP=instanceMatrix*encounterP;
#endif
vWorld=(modelMatrix*encounterP).xyz;`);
   shader.fragmentShader='varying vec3 vWorld;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>\n${rim} diffuseColor.a*=1.-smoothstep(.88,1.,rim);`);
  };return material;
 }
 function material(color){return clipped(new THREE.MeshStandardMaterial({color,roughness:1,flatShading:true}));}
 function group(id){const g=new THREE.Group();g.name=id;g.visible=false;root.add(g);groups.set(id,g);return g;}
 function mesh(g,geo,mat,pos=[0,0,0],scale=[1,1,1]){const m=new THREE.Mesh(geo,mat);m.position.set(...pos);m.scale.set(...scale);g.add(m);return m;}
 function ball(g,color,pos,scale,r=1){return mesh(g,new THREE.IcosahedronGeometry(r,1),material(color),pos,scale);}
 function fade(g,alpha){g.traverse(o=>{if(o.isMesh&&!o.material.isShaderMaterial)o.material.opacity=alpha;});}
 function overlay(color,opacity=.4){return new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,uniforms:{...waveUniforms,color:{value:new THREE.Color(color)},opacity:{value:opacity}},vertexShader:`${seaVertexGLSL}
varying vec3 vWorld;void main(){vec4 p=vec4(position,1.);
#ifdef USE_INSTANCING
p=instanceMatrix*p;
#endif
p=modelMatrix*p;vWorld=p.xyz;p.y=seaHeightAt(p.xz)+.022;gl_Position=projectionMatrix*viewMatrix*p;}`,
 fragmentShader:`uniform vec3 color;uniform float opacity;varying vec3 vWorld;void main(){${rim}gl_FragColor=vec4(color,opacity*(1.-smoothstep(.85,1.,rim)));}`});}
 function batch(g,geo,mat,n){const m=new THREE.InstancedMesh(geo,mat,n);m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);m.frustumCulled=false;g.add(m);return m;}
 function place(m,i,x,y,z,sx,sy,sz,yaw=0,roll=0){dummy.position.set(x,y,z);dummy.scale.set(sx,sy,sz);dummy.rotation.set(0,yaw,roll);dummy.updateMatrix();m.setMatrixAt(i,dummy.matrix);}
 const fishG=group('underwater_fish_school'),fishGeo=new THREE.BufferGeometry();fishGeo.setAttribute('position',new THREE.Float32BufferAttribute([.22,0,0,0,0,-.09,-.17,0,0,.22,0,0,-.17,0,0,0,0,.09,-.14,0,0,-.3,0,-.11,-.3,0,.11],3));fishGeo.computeVertexNormals();
 const fishMat=overlay(0x215b72,.46),fish=batch(fishG,fishGeo,fishMat,48);
 const trailGeo=new THREE.PlaneGeometry(.8,.09,6,1);trailGeo.rotateX(-Math.PI/2);trailGeo.translate(-.55,0,0);
 const trailMat=overlay(0x67e8cf,.22);trailMat.vertexShader='varying vec2 vUv;\n'+trailMat.vertexShader.replace('void main(){','void main(){vUv=uv;');trailMat.fragmentShader='varying vec2 vUv;\n'+trailMat.fragmentShader.replace('opacity*','opacity*vUv.x*(1.-abs(vUv.y*2.-1.))*');
 const fishTrails=batch(fishG,trailGeo,trailMat,48);fishTrails.name='fish-contact-trails';fishTrails.visible=false;
 function fishSchool(a,time,glowing=false){const u=a.elapsed/a.duration,cx=-5.5+11*u,cz=Math.sin(u*4)*.75;
  fishG.visible=true;fishMat.uniforms.color.value.setHex(glowing?0x63cdbb:0x15495e);fishMat.uniforms.opacity.value=envelope(a)*(glowing?.48:.44);
  fishTrails.visible=glowing;trailMat.uniforms.opacity.value=envelope(a)*.22;
  for(let i=0;i<48;i++){const row=i%8,col=Math.floor(i/8),x=cx+(col-2.5)*.36+.12*Math.sin(time*.8+i),z=cz+(row-3.5)*.19+.13*Math.sin(time*.6+i*.3),yaw=-.3*Math.cos(u*4)+.12*Math.sin(time*1.8+i);place(fish,i,x,0,z,.65+(i%3)*.12,1,.8,yaw);if(glowing)place(fishTrails,i,x,0,z,1,1,1,yaw);}
  fish.instanceMatrix.needsUpdate=true;if(glowing)fishTrails.instanceMatrix.needsUpdate=true;
 }
 const whaleShape=new THREE.Shape();whaleShape.moveTo(3.75,0);whaleShape.bezierCurveTo(3.7,1.05,1.2,1.1,-.15,.73);whaleShape.lineTo(-.9,1.7);whaleShape.lineTo(-1.2,.59);whaleShape.quadraticCurveTo(-2.5,.25,-3.1,.16);whaleShape.lineTo(-3.8,1.06);whaleShape.lineTo(-4.1,.8);whaleShape.lineTo(-3.6,0);whaleShape.lineTo(-4.1,-.8);whaleShape.lineTo(-3.8,-1.06);whaleShape.lineTo(-3.1,-.16);whaleShape.quadraticCurveTo(-2.5,-.25,-1.2,-.59);whaleShape.lineTo(-.9,-1.7);whaleShape.lineTo(-.15,-.73);whaleShape.bezierCurveTo(1.2,-1.1,3.7,-1.05,3.75,0);
 const shadowG=group('giant_whale_shadow'),shadowGeo=new THREE.ShapeGeometry(whaleShape,12);shadowGeo.rotateX(-Math.PI/2);const shadowMat=overlay(0x122f49,.44);const shadow=mesh(shadowG,waterProjectionGeometry(shadowGeo),shadowMat);
 const whaleG=group('giant_whale_surface'),whaleBody=new THREE.Group();whaleG.add(whaleBody);
 ball(whaleBody,0x547783,[.1,0,0],[3.25,.65,.93]);ball(whaleBody,0xd9e2d9,[.3,-.4,0],[2.8,.27,.69]);
 for(const side of [-1,1]){const flipper=ball(whaleBody,0x426573,[-.25,-.22,side*.89],[.95,.1,.34]);flipper.rotation.y=side*.6;ball(whaleBody,0x436675,[-3.42,-.04,side*.6],[.78,.11,.65]);ball(whaleBody,0x243946,[2.35,.11,side*.67],[.055,.05,.03]);}
 const dorsal=mesh(whaleBody,new THREE.ConeGeometry(.23,.48,4),material(0x3f6170),[-.95,.55,0],[1,1,.45]);dorsal.rotation.z=.35;
 const spray=batch(whaleG,new THREE.IcosahedronGeometry(1,0),clipped(new THREE.MeshBasicMaterial({color:0xc4ebe7})),14);
 const birdsG=group('massive_bird_migration'),birdGeo=new THREE.BufferGeometry();birdGeo.setAttribute('position',new THREE.Float32BufferAttribute([-.52,.06,-.08,-.16,.13,.03,0,0,.13,0,0,.13,.16,.13,.03,.52,.06,-.08,-.52,.06,-.08,0,0,.13,-.13,-.015,-.02,0,0,.13,.52,.06,-.08,.13,-.015,-.02],3));birdGeo.computeVertexNormals();const birdMat=clipped(new THREE.MeshLambertMaterial({color:0xe4edeb,side:THREE.DoubleSide})),birds=batch(birdsG,birdGeo,birdMat,32);
 const birdShadows=batch(birdsG,fishGeo,overlay(0x27485f,.12),32);
 const meteorG=group('meteor_shower'),meteorCount=12,meteorPos=new Float32Array(meteorCount*6),meteorColors=new Float32Array(meteorCount*6),meteorGeo=new THREE.BufferGeometry();meteorGeo.setAttribute('position',new THREE.BufferAttribute(meteorPos,3).setUsage(THREE.DynamicDrawUsage));meteorGeo.setAttribute('color',new THREE.BufferAttribute(meteorColors,3).setUsage(THREE.DynamicDrawUsage));
 const meteorMat=new THREE.LineBasicMaterial({vertexColors:true,transparent:true,opacity:0,depthWrite:false,toneMapped:false});
 meteorMat.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.a*=max(vColor.r,max(vColor.g,vColor.b));');};
 const meteors=new THREE.LineSegments(meteorGeo,meteorMat);meteors.frustumCulled=false;meteorG.add(meteors);
 const iceG=group('polar_bear_ice'),ice=mesh(iceG,new THREE.CylinderGeometry(.64,.55,.18,7),material(0xdceff0),[0,0,0],[1,.8,.8]);
 ball(iceG,0xeef0e5,[0,.31,0],[.38,.26,.23]);const bearHead=new THREE.Group();bearHead.position.set(.3,.45,0);iceG.add(bearHead);ball(bearHead,0xf6f5eb,[0,0,0],[.2,.18,.18]);ball(bearHead,0xf8f7ed,[.16,-.03,0],[.12,.08,.12]);ball(bearHead,0x46565d,[.25,-.01,0],[.034,.03,.06]);
 for(const side of [-1,1]){ball(bearHead,0xf8f7ee,[-.04,.16,side*.12],[.065,.065,.04]);ball(bearHead,0x405760,[.1,.065,side*.145],[.019,.023,.015]);for(const x of [-.23,.18])ball(iceG,0xe8ede4,[x,.16,side*.19],[.1,.15,.07]);}
 const lighthouseG=group('fog_lighthouse');lighthouseG.position.set(-4.5,0,-2.8);
 mesh(lighthouseG,new THREE.IcosahedronGeometry(.75,0),material(0x6e8790),[0,-.02,0],[1,.24,.75]);mesh(lighthouseG,new THREE.CylinderGeometry(.22,.34,1.65,9),material(0xe4e5d5),[0,.82,0]);mesh(lighthouseG,new THREE.CylinderGeometry(.27,.28,.2,9),material(0xa77061),[0,.82,0]);mesh(lighthouseG,new THREE.CylinderGeometry(.31,.31,.12,9),material(0x465f68),[0,1.65,0]);
 const lamp=mesh(lighthouseG,new THREE.CylinderGeometry(.22,.22,.3,8),material(0xffdc98),[0,1.86,0]);lamp.material.emissive.setHex(0xffc567);lamp.material.emissiveIntensity=1;
 mesh(lighthouseG,new THREE.ConeGeometry(.39,.28,8),material(0x597078),[0,2.14,0]);
 const beam=new THREE.SpotLight(0xffd394,0,13,.25,.8,1.2);beam.position.set(-4.5,1.9,-2.8);scene.add(beam,beam.target);
 const sweepGeo=new THREE.BufferGeometry();sweepGeo.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,6,0,-1.25,6,0,1.25],3));const sweepMat=overlay(0xfce0a2,.1),sweep=mesh(lighthouseG,waterProjectionGeometry(sweepGeo),sweepMat);
 const fogMeshes=[];for(let i=0;i<4;i++){const mat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,uniforms:{fade:{value:0},time:waterTime},vertexShader:'varying vec2 vUv;varying vec3 vWorld;void main(){vUv=uv;vec4 p=modelMatrix*vec4(position,1.);vWorld=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;}',fragmentShader:`uniform float fade,time;varying vec2 vUv;varying vec3 vWorld;void main(){vec2 p=vUv-.5;float a=exp(-dot(p*vec2(2.3,3.),p*vec2(2.3,3.))*4.);${rim}gl_FragColor=vec4(.7,.8,.81,a*fade*(1.-smoothstep(.87,1.,rim))*(.86+.14*sin(time*.12+vUv.x*5.)));}`});const f=mesh(lighthouseG,new THREE.PlaneGeometry(3.5,2.1),mat,[(i%2)*.3-.15,.4+i*.22,(i-2)*.24]);f.rotation.y=i*.85;fogMeshes.push(f);}
 // Fixed light flecks, reused only during the luminous sea; the ocean itself remains one mesh.
 const bioG=group('bioluminescent_sea'),fleckGeo=new THREE.BufferGeometry(),fleckPos=new Float32Array(80*3);fleckGeo.setAttribute('position',new THREE.BufferAttribute(fleckPos,3).setUsage(THREE.DynamicDrawUsage));const fleckMat=new THREE.PointsMaterial({color:0x81e3d1,size:.035,transparent:true,opacity:0,depthWrite:false});const flecks=new THREE.Points(fleckGeo,fleckMat);flecks.frustumCulled=false;bioG.add(flecks);
 function envelope(a){return ease(a.elapsed/4)*ease((a.duration-a.elapsed)/5)*(a.interrupted?1-ease((a.elapsed-a.exitAt)/3):1);}
 function dolphins(a,time,wave){const pink=a.id==='pink_dolphin',u=a.elapsed/a.duration,fadeIn=ease(u/.17),fadeOut=ease((u-.76)/.24),head=ship.rotation.y;
  dolphinPod.material.color.setHex(pink?0xe7a6b5:0x5594b0);dolphinPod.fin.color.setHex(pink?0xbc7f98:0x367a98);dolphinPod.belly.color.setHex(pink?0xf6e4e2:0xe2eee8);
  dolphinPod.groups.forEach((g,i)=>{g.visible=i<(pink?1:3);if(!g.visible)return;const side=pink?Math.cos(a.elapsed*.15)*1.3:i===0?1.4:-1.45-i*.25,along=pink?Math.sin(a.elapsed*.15)*1.7:-.5-i*.75;
   let x=ship.position.x+Math.cos(head)*side+Math.sin(head)*along,z=ship.position.z-Math.sin(head)*side+Math.cos(head)*along;
   x=THREE.MathUtils.lerp(-5.3+i*.25,x,fadeIn)*(1-fadeOut)+5.3*fadeOut;z=THREE.MathUtils.lerp(2.6-i*.4,z,fadeIn)*(1-fadeOut)+2*fadeOut;x=THREE.MathUtils.clamp(x,-5.2,5.2);z=THREE.MathUtils.clamp(z,-3.4,3.4);
   const jump=Math.max(0,Math.sin(a.elapsed*(pink?.43:.34)+i*2.1));g.position.set(x,wave(x,z,time)-.2+.36*jump-(1-envelope(a))*1.05,z);g.rotation.set(0,head-Math.PI/2,pink?.16*Math.sin(a.elapsed*.6):.09*Math.sin(a.elapsed*.5+i));
   if(pink)g.rotation.y+=.23*Math.sin(a.elapsed*.35);g.scale.set(pink?1.18:.85,pink?.9:.85,pink?.82:.85);g.userData.tail.rotation.z=Math.sin(time*3.1+i)*.12;
  });
 }
 function whaleShadow(a){shadowG.visible=true;const u=a.elapsed/a.duration;shadow.position.set(-5.9+11.8*u,0,.25*Math.sin(u*5));shadow.rotation.y=.07*Math.sin(u*4);shadowMat.uniforms.opacity.value=envelope(a)*.32;}
 const handlers={
  underwater_fish_school:(a,t)=>fishSchool(a,t),
  dolphin_companion:dolphins,pink_dolphin:dolphins,
  giant_whale_shadow:whaleShadow,
  giant_whale_surface(a,t,wave){whaleShadow(a);whaleG.visible=true;const u=a.elapsed/a.duration,surface=Math.sin(Math.PI*ease((u-.16)/.69));whaleBody.position.set(-1.8+u*3.5,-1.5+surface*1.62+wave(0,0,t)*.3,0);whaleBody.rotation.x=Math.sin(u*Math.PI*2)*.48;fade(whaleBody,envelope(a));
   for(let i=0;i<14;i++){const p=clamp((u-.37)*7-i*.025),rise=Math.sin(p*Math.PI);place(spray,i,whaleBody.position.x+1.9+(i%3-.9)*p*.3,.35+rise*1.35,(i%5-2)*p*.12,.032*rise,.07*rise,.032*rise);}
   spray.instanceMatrix.needsUpdate=true;spray.material.opacity=envelope(a)*.55;
  },
  massive_bird_migration(a,t){birdsG.visible=true;const u=a.elapsed/a.duration;birdMat.opacity=envelope(a)*.95;birdShadows.material.uniforms.opacity.value=envelope(a)*.1;
   for(let i=0;i<32;i++){const rank=Math.floor(i/2),side=i%2?1:-1,x=-7+14*u-rank*.25,z=side*rank*.14+.25*Math.sin(t*.14+i*.1),y=3.6+.32*Math.sin(t*.22+rank*.4);place(birds,i,x,y,z,.38,.55+.3*Math.sin(t*2.2+i),.38,-Math.PI/2,.05*Math.sin(t+i));place(birdShadows,i,x,0,z,.33,1,.28);}
   birds.instanceMatrix.needsUpdate=true;birdShadows.instanceMatrix.needsUpdate=true;
  },
  bioluminescent_sea(a,t,wave){bioG.visible=true;bio.value=envelope(a);fleckMat.opacity=bio.value*.36;fishSchool(a,t,true);
   for(let i=0;i<80;i++){const angle=i*2.39996,r=Math.sqrt((i+.5)/80),x=Math.cos(angle)*5*r,z=Math.sin(angle)*3.5*r;fleckPos[i*3]=x;fleckPos[i*3+1]=wave(x,z,t)+.04;fleckPos[i*3+2]=z;}fleckGeo.attributes.position.needsUpdate=true;
  },
  meteor_shower(a){meteorG.visible=true;meteorMat.opacity=envelope(a)*.82;
   for(let i=0;i<meteorCount;i++){const start=i===0?0:i===1?4:7+(i-2)*1.25,life=1.35+(i%3)*.3,period=8+(i%4),age=a.elapsed-start,progress=age<0?-1:(age%period)/life,live=progress>=0&&progress<1,phase=live?progress:0;
    const x=-3.8+(i%5)*1.42+phase*1.6,y=5.7-(i%3)*.24-phase*1.4,z=-2.2+(i%4)*1.12,s=live?Math.sin(phase*Math.PI):0,k=i*6;
    meteorPos.set([x,y,z,x-.65-(i%3)*.13,y+.45,z-.12],k);meteorColors.set([.74*s,.9*s,s,.015*s,.03*s,.07*s],k);
   }meteorGeo.attributes.position.needsUpdate=true;meteorGeo.attributes.color.needsUpdate=true;
  },
  polar_bear_ice(a,t,wave){iceG.visible=true;const z=-2.7+5.4*a.elapsed/a.duration;iceG.position.set(5.05,wave(5.05,z,t)+.08,z);iceG.rotation.y=-.7+Math.sin(t*.12)*.15;iceG.rotation.z=Math.sin(t*.7)*.035;bearHead.rotation.y=Math.sin(a.elapsed*.18)*.35;bearHead.rotation.z=Math.sin(a.elapsed*.28)*.08;fade(iceG,envelope(a));},
  fog_lighthouse(a,t){lighthouseG.visible=true;const f=envelope(a),angle=a.elapsed*.25;sweep.rotation.y=-angle;sweepMat.uniforms.opacity.value=f*.09;fade(lighthouseG,f);beam.intensity=f*7;beam.target.position.set(-4.5+Math.cos(angle)*6,0,-2.8+Math.sin(angle)*6);lamp.material.emissiveIntensity=f*1.2;
   fogMeshes.forEach((m,i)=>m.material.uniforms.fade.value=f*(a.phase==='exit'?.8:.38)+.2*Math.sin(Math.PI*clamp(a.elapsed/4)));
  }
 };
 function cleanup(){for(const g of groups.values())g.visible=false;dolphinPod.groups.forEach(g=>g.visible=false);bio.value=0;beam.intensity=0;}
 // prepare = construction above; enter/play/exit share a time envelope; cleanup hides pooled objects.
 return {bio,boat,root,visibleIds:()=>[...visible],update(active,time,wave){
  if(!active.length&&!previous.size)return;cleanup();visible.clear();boat.value.set(ship.position.x,ship.position.z,ship.rotation.y);
  for(const a of active){handlers[a.id]?.(a,time,wave);if(envelope(a)>.12){const isDolphin=a.id.includes('dolphin');const inBounds=a.id!=='massive_bird_migration'||(-7+14*a.elapsed/a.duration)>-5.65;const surfaced=a.id!=='giant_whale_surface'||whaleBody.position.y+.6>wave(whaleBody.position.x,0,time);if(inBounds&&surfaced&&(!isDolphin||dolphinPod.groups.some(g=>g.visible&&g.position.y>wave(g.position.x,g.position.z,time)-.08)))visible.add(a.id);}}
  previous=new Set(active.map(a=>a.id));
 }};
}
