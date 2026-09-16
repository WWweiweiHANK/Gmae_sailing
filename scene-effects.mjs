import * as THREE from 'three';
import { dolphinPose } from './motion.mjs';

export function createVoyageEffects(scene){
  const sky=new THREE.Group();scene.add(sky);
  const starPositions=[];
  for(let i=0;i<640;i++){
    starPositions.push((Math.random()-.5)*46,-2+Math.random()*20,-14-Math.random()*5);
  }
  const starGeometry=new THREE.BufferGeometry();starGeometry.setAttribute('position',new THREE.Float32BufferAttribute(starPositions,3));
  const starMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{time:{value:0},fade:{value:0}},
    vertexShader:`uniform float time; varying float bright; void main(){bright=.5+.5*sin(time*.65+position.x*2.+position.z);gl_PointSize=1.4+bright*1.4;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`uniform float fade;varying float bright;void main(){float a=1.-smoothstep(.05,.5,length(gl_PointCoord-.5));gl_FragColor=vec4(.82,.89,1.,a*fade*(.45+.55*bright));}`});
  const starField=new THREE.Points(starGeometry,starMaterial);starField.frustumCulled=false;sky.add(starField);
  const auroraMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,uniforms:{time:{value:0},fade:{value:0}},
    vertexShader:`uniform float time;varying vec2 vUv;void main(){vUv=uv;vec3 p=position;p.z+=sin(p.x*.4+time*.12)*1.2;p.y+=sin(p.x*.35+time*.1)*.8;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
    fragmentShader:`uniform float time;uniform float fade;varying vec2 vUv;void main(){float rays=.6+.4*sin(vUv.x*160.+sin(vUv.x*31.+time*.16)*3.);float edge=sin(vUv.x*3.14159)*pow(sin(vUv.y*3.14159),1.7);vec3 col=mix(vec3(.22,.72,.55),vec3(.45,.36,.68),vUv.y);gl_FragColor=vec4(col,edge*rays*fade*.25);}`});
  const aurora=new THREE.Mesh(new THREE.PlaneGeometry(26,5.5,90,12),auroraMaterial);aurora.position.set(-1,5.8,-9);sky.add(aurora);
  const dolphinMaterial=new THREE.MeshStandardMaterial({color:0x83a8b6,roughness:1,flatShading:true});
  const bellyMaterial=new THREE.MeshStandardMaterial({color:0xc7dcd9,roughness:1,flatShading:true});
  const dolphins=[];
  function part(group,r,scale,x,y,z,material=dolphinMaterial){const p=new THREE.Mesh(new THREE.IcosahedronGeometry(r,1),material);p.scale.set(...scale);p.position.set(x,y,z);p.castShadow=true;group.add(p);return p;}
  function fin(group,points){const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(points,3));geo.computeVertexNormals();const material=dolphinMaterial.clone();material.side=THREE.DoubleSide;group.add(new THREE.Mesh(geo,material));}
  for(let i=0;i<4;i++){
    const g=new THREE.Group();scene.add(g);g.scale.setScalar(i===0?1:.76+i*.025);
    part(g,1,[.48,.16,.18],0,0,0);part(g,1,[.22,.075,.085],.43,-.02,0);part(g,1,[.31,.085,.13],.08,-.09,0,bellyMaterial);
    fin(g,[-.18,.1,0,.04,.46,0,.21,.1,0]);
    for(const s of [-1,1]){fin(g,[.12,-.03,s*.09,-.22,-.12,s*.38,-.16,-.01,s*.1]);fin(g,[-.4,0,0,-.64,.04,s*.28,-.63,-.01,0]);}
    dolphins.push(g);
  }
  const lightningMaterial=new THREE.LineBasicMaterial({color:0xdce5ff,transparent:true,opacity:0,depthWrite:false});
  const lightningGeometry=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-2.6,5,-2.8),new THREE.Vector3(-2.8,4.25,-2.8),new THREE.Vector3(-2.45,4.3,-2.8),new THREE.Vector3(-2.85,3.35,-2.8),new THREE.Vector3(-2.65,3.45,-2.8),new THREE.Vector3(-3.1,2.65,-2.8)]);
  const bolt=new THREE.Line(lightningGeometry,lightningMaterial);scene.add(bolt);
  const flash=new THREE.DirectionalLight(0xcbdcff,0);flash.position.set(-3,8,-3);scene.add(flash);
  let flashAge=10,auroraFade=0;
  return {
    lightning(){flashAge=0;bolt.position.x=(Math.random()-.5)*2.5;},
    update({time,elapsed,weather,events,nightMix,dt,wave,cameraYaw}){
      sky.rotation.y=cameraYaw;
      starMaterial.uniforms.time.value=time;starMaterial.uniforms.fade.value=nightMix;
      const target=weather==='night'&&elapsed>events.auroraAt?Math.min(1,(elapsed-events.auroraAt)/10):0;
      auroraFade=THREE.MathUtils.lerp(auroraFade,target,1-Math.exp(-dt*.65));auroraMaterial.uniforms.time.value=time;auroraMaterial.uniforms.fade.value=auroraFade;
      aurora.visible=auroraFade>.001;
      dolphins.forEach((g,i)=>{
        const u=(elapsed-events.dolphinsAt-i*3)/29;g.visible=weather==='sunny'&&u>=0&&u<=1;if(!g.visible)return;
        const p=dolphinPose(u,i),q=dolphinPose(Math.min(1,u+.005),i);
        g.position.set(p.x,p.y+wave(p.x,p.z,time),p.z);g.rotation.y=-Math.atan2(q.z-p.z,q.x-p.x);g.rotation.z=Math.atan2(q.y-p.y,Math.max(.04,q.x-p.x))*.55;
      });
      flashAge+=dt;const strength=flashAge<.65?Math.sin(Math.PI*flashAge/.65)*Math.exp(-flashAge*4):0;
      const inRain=weather==='rainy'||weather==='storm';lightningMaterial.opacity=inRain?strength*.85:0;flash.intensity=inRain?strength*1.8:0;
    }
  };
}
