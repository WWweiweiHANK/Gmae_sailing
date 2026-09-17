import * as THREE from 'three';
import { dolphinPose } from './motion.mjs';
import { createAurora } from './aurora.mjs';

export function createVoyageEffects(scene){
  const sky=new THREE.Group();scene.add(sky);
  const starPositions=[];
  for(let i=0;i<38;i++){
    const angle=i*2.39996,r=Math.sqrt(Math.random());
    starPositions.push(Math.cos(angle)*4.5*r,3.4+(1-r*r)*1.3+Math.random()*.55,Math.sin(angle)*3.15*r);
  }
  const starGeometry=new THREE.BufferGeometry();starGeometry.setAttribute('position',new THREE.Float32BufferAttribute(starPositions,3));
  const starMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{time:{value:0},fade:{value:0}},
    vertexShader:`uniform float time; varying float bright; void main(){bright=.5+.5*sin(time*.45+position.x*2.+position.z);vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=clamp((72.+bright*28.)/-mv.z,1.2,5.);gl_Position=projectionMatrix*mv;}`,
    fragmentShader:`uniform float fade;varying float bright;void main(){float a=1.-smoothstep(.05,.5,length(gl_PointCoord-.5));gl_FragColor=vec4(.82,.89,1.,a*fade*(.45+.55*bright));}`});
  const starField=new THREE.Points(starGeometry,starMaterial);starField.frustumCulled=false;sky.add(starField);
  const aurora=createAurora(sky);
  const dolphinMaterial=new THREE.MeshStandardMaterial({color:0x5594b0,roughness:1,flatShading:true});
  const bellyMaterial=new THREE.MeshStandardMaterial({color:0xe2eee8,roughness:1,flatShading:true});
  const finMaterial=new THREE.MeshStandardMaterial({color:0x367a98,roughness:1,flatShading:true,side:THREE.DoubleSide});
  const eyeMaterial=new THREE.MeshBasicMaterial({color:0x152e3a});
  const dolphins=[];
  function part(group,r,scale,x,y,z,material=dolphinMaterial){const p=new THREE.Mesh(new THREE.IcosahedronGeometry(r,1),material);p.scale.set(...scale);p.position.set(x,y,z);p.castShadow=true;group.add(p);return p;}
  function fin(group,points){const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(points,3));geo.computeVertexNormals();group.add(new THREE.Mesh(geo,finMaterial));}
  for(let i=0;i<4;i++){
    const g=new THREE.Group();g.visible=false;scene.add(g);g.scale.setScalar(i===0?1:.87+i*.025);
    // Tapered rings describe the curved back, forehead and narrow tail stock.
    const profile=[[-.76,-.05,.045],[-.52,.015,.1],[-.27,.06,.19],[.02,.07,.24],[.28,.065,.215],[.46,.035,.14],[.52,.015,.07]];
    const vertices=[],indices=[];
    profile.forEach(([x,y,r])=>{for(let j=0;j<10;j++){const a=j/10*Math.PI*2;vertices.push(x,y+Math.cos(a)*r,Math.sin(a)*r*.82);}});
    for(let k=0;k<profile.length-1;k++)for(let j=0;j<10;j++){const a=k*10+j,b=k*10+(j+1)%10;indices.push(a,b,a+10,b,b+10,a+10);}
    const bodyGeometry=new THREE.BufferGeometry();bodyGeometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));bodyGeometry.setIndex(indices);bodyGeometry.computeVertexNormals();
    const body=new THREE.Mesh(bodyGeometry,dolphinMaterial);body.castShadow=true;g.add(body);
    part(g,1,[.235,.07,.085],.59,-.005,0);part(g,1,[.4,.12,.17],.12,-.095,0,bellyMaterial);
    const dorsal=new THREE.Shape();dorsal.moveTo(-.31,.17);dorsal.quadraticCurveTo(-.21,.32,-.25,.48);dorsal.quadraticCurveTo(-.08,.49,.13,.17);dorsal.closePath();
    const dorsalMesh=new THREE.Mesh(new THREE.ExtrudeGeometry(dorsal,{depth:.035,bevelEnabled:false,curveSegments:3}),finMaterial);dorsalMesh.position.z=-.0175;g.add(dorsalMesh);
    const tail=new THREE.Group();tail.position.set(-.72,-.04,0);g.add(tail);g.userData.tail=tail;
    for(const s of [-1,1]){
      fin(g,[.2,-.07,s*.11,-.24,-.17,s*.37,-.08,-.065,s*.13]);
      fin(tail,[.04,0,0,-.12,.015,s*.36,-.33,-.02,s*.42,.04,0,0,-.33,-.02,s*.42,-.19,-.025,0]);
      part(g,.025,[1,1,.45],.385,.105,s*.145,eyeMaterial);
    }
    dolphins.push(g);
  }
  const lightningMaterial=new THREE.LineBasicMaterial({color:0xdce5ff,transparent:true,opacity:0,depthWrite:false});
  const lightningGeometry=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-2.6,5,-2.8),new THREE.Vector3(-2.8,4.25,-2.8),new THREE.Vector3(-2.45,4.3,-2.8),new THREE.Vector3(-2.85,3.35,-2.8),new THREE.Vector3(-2.65,3.45,-2.8),new THREE.Vector3(-3.1,2.65,-2.8)]);
  const bolt=new THREE.Line(lightningGeometry,lightningMaterial);scene.add(bolt);
  const flash=new THREE.DirectionalLight(0xcbdcff,0);flash.position.set(-3,8,-3);scene.add(flash);
  let flashAge=10;
  return {
    waterGlow:aurora.waterGlow,
    lightning(){flashAge=0;bolt.position.x=(Math.random()-.5)*2.5;},
    update({time,elapsed,weather,events,nightMix,dt,wave,auroraWeather=weather,auroraElapsed=elapsed}){
      aurora.update(time,auroraElapsed,auroraWeather,events.auroraAt,dt);
      starMaterial.uniforms.time.value=time;starMaterial.uniforms.fade.value=nightMix*.48*(1-aurora.waterGlow.value*.35);
      dolphins.forEach((g,i)=>{
        if(weather!=='sunny'){if(g.visible){g.position.y-=dt*.8;if(g.position.y<-.95)g.visible=false;}return;}
        const u=(elapsed-events.dolphinsAt-i*1.1)/10;g.visible=u>=0&&u<=1;if(!g.visible)return;
        const p=dolphinPose(u,i),q=dolphinPose(Math.min(1,u+.005),i);
        g.position.set(p.x,p.y+wave(p.x,p.z,time),p.z);g.rotation.y=-Math.atan2(q.z-p.z,q.x-p.x);g.rotation.z=Math.atan2(q.y-p.y,Math.max(.04,q.x-p.x))*.55;
        g.userData.tail.rotation.z=Math.sin(time*3.8+i)*.13;
      });
      flashAge+=dt;const strength=flashAge<.65?Math.sin(Math.PI*flashAge/.65)*Math.exp(-flashAge*4):0;
      const inRain=weather==='rainy'||weather==='storm';lightningMaterial.opacity=inRain?strength*.85:0;flash.intensity=inRain?strength*1.8:0;
    }
  };
}
