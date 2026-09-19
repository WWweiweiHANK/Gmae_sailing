import * as THREE from 'three';

const layers=[
  {width:9.5,height:2.85,bottom:3.65,z:-2.05,phase:0},
  {width:8.8,height:2.7,bottom:3.35,z:-.7,phase:1.55},
  {width:8.05,height:2.35,bottom:3.12,z:.65,phase:3.05},
  {width:6.9,height:2.1,bottom:3.55,z:1.9,phase:4.55}
];
function ease(value){const x=Math.max(0,Math.min(1,value));return x*x*(3-2*x);}
export function auroraStage(elapsed,start){
  if(!Number.isFinite(start))return {layers:[0,0,0,0],water:0};
  const age=elapsed-start;
  return {layers:layers.map((_,i)=>ease((age-i*1.8)/8)),water:ease((age-3)/11)};
}
export function auroraPoint(index,u,v,time){
  const layer=layers[index],phase=layer.phase,t=time*(.072-index*.006);
  const fold=Math.sin(u*Math.PI*2+t+phase);
  return {
    x:(u-.5)*layer.width+.1*Math.sin(v*2.4+t+phase),
    y:layer.bottom+.16*Math.sin(u*7+t+phase)+v*layer.height*(.92+.08*Math.sin(u*5-t+phase)),
    z:layer.z+.5*fold+.18*Math.sin(u*12-t*.7+phase)+.17*Math.sin(v*3+u*8+t)
  };
}

// Shared palette and drift link the luminous silk to the color moving through the sea.
export const auroraColorGLSL=`
float auroraGaussian(float x){return exp(-x*x);}
vec3 auroraColor(float u,float phase,float time){
  float h=fract(u*.78+time*.009+phase*.105);
  vec3 teal=vec3(.15,.79,.60),cyan=vec3(.18,.62,.83),violet=vec3(.48,.40,.76),pink=vec3(.71,.44,.65);
  if(h<.46)return mix(teal,cyan,smoothstep(0.,.46,h));
  if(h<.67)return mix(cyan,violet,smoothstep(.46,.67,h));
  if(h<.79)return mix(violet,pink,smoothstep(.67,.79,h));
  return mix(pink,teal,smoothstep(.79,1.,h));
}
vec3 auroraWaterLight(vec3 p,float time){
  float u=p.x/9.5+.5;
  float drift=.6*sin(u*6.283+time*.072);
  float ripple=.13*sin(p.x*1.1+p.z*1.8-time*.46);
  float green=auroraGaussian((p.z+.7-drift+ripple)/1.65);
  float purple=auroraGaussian((p.z-1.45+.4*sin(u*7.-time*.055)+ripple)/1.25);
  float breath=.83+.17*sin(time*.13+p.x*.5+p.z*.4);
  float edge=1.-smoothstep(.55,1.,pow(abs(p.x)/5.8,4.65)+pow(abs(p.z)/4.45,4.65));
  return (auroraColor(u,.0,time)*green*.20+auroraColor(u,3.,time)*purple*.095)*breath*edge;
}`;

export function createAurora(parent){
  const group=new THREE.Group();group.name='miniature-aurora';parent.add(group);
  const curtains=[],waterGlow={value:0};
  const columns=64,rows=14;
  for(let layer=0;layer<layers.length;layer++){
    const points=[],uvs=[],indices=[];
    for(let row=0;row<=rows;row++)for(let column=0;column<=columns;column++){
      const u=column/columns,v=row/rows,p=auroraPoint(layer,u,v,0);points.push(p.x,p.y,p.z);uvs.push(u,v);
      if(row<rows&&column<columns){const a=row*(columns+1)+column;indices.push(a,a+1,a+columns+1,a+1,a+columns+2,a+columns+1);}
    }
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(points,3).setUsage(THREE.DynamicDrawUsage));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);
    const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,forceSinglePass:true,blending:THREE.NormalBlending,toneMapped:false,
      uniforms:{time:{value:0},fade:{value:0},phase:{value:layers[layer].phase},width:{value:layers[layer].width},height:{value:layers[layer].height},bottom:{value:layers[layer].bottom},depth:{value:layers[layer].z},speed:{value:.072-layer*.006}},
      vertexShader:`uniform float time,phase,width,height,bottom,depth,speed;varying vec2 vUv;void main(){vUv=uv;float u=uv.x,v=uv.y,t=time*speed;vec3 p=vec3((u-.5)*width+.1*sin(v*2.4+t+phase),bottom+.16*sin(u*7.+t+phase)+v*height*(.92+.08*sin(u*5.-t+phase)),depth+.5*sin(u*6.2831853+t+phase)+.18*sin(u*12.-t*.7+phase)+.17*sin(v*3.+u*8.+t));gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
      fragmentShader:`uniform float time;uniform float fade;uniform float phase;varying vec2 vUv;${auroraColorGLSL}
      void main(){
        float u=vUv.x,v=vUv.y;
        float hem=.13+.045*sin(u*9.+time*.09+phase);
        float core=auroraGaussian((v-hem)/.065);
        float halo=auroraGaussian((v-hem)/.21);
        float folds=.68+.22*sin(u*72.+sin(u*15.+time*.12+phase)*2.4)+.1*sin(u*137.-time*.08+phase);
        float silk=pow(max(0.,1.-v),1.2)*smoothstep(0.,.11,v);
        float traveling=auroraGaussian((u-(.5+.4*sin(time*.06+phase)))/.18);
        float edge=smoothstep(0.,.13,u)*(1.-smoothstep(.86,1.,u));
        float alpha=(silk*folds*.30+halo*.10+core*(.22+traveling*.14))*edge*fade;
        vec3 color=auroraColor(u+v*.12,phase,time);
        color=mix(color,vec3(.60,.92,.82),core*traveling*.24);
        gl_FragColor=vec4(color,alpha);
      }`});
    const mesh=new THREE.Mesh(geometry,material);mesh.name='aurora-curtain';mesh.frustumCulled=false;mesh.visible=false;group.add(mesh);curtains.push(mesh);
  }
  const lights=[new THREE.PointLight(0x62d9bf,0,8,2),new THREE.PointLight(0x888edb,0,8,2),new THREE.PointLight(0x5cbfcf,0,8,2)];
  lights[0].position.set(-3,3.25,.3);lights[1].position.set(3,3.5,-.6);lights[2].position.set(0,3.7,-1.8);lights.forEach(light=>group.add(light));
  return {
    waterGlow,
    get visible(){return curtains.some(mesh=>mesh.visible&&mesh.material.uniforms.fade.value>.15);},
    update(time,elapsed,weather,start,dt){
      const stage=auroraStage(elapsed,weather==='night'?start:Infinity),blend=1-Math.exp(-dt*1.2);
      waterGlow.value+=(stage.water-waterGlow.value)*blend;
      curtains.forEach((mesh,layer)=>{
        const uniforms=mesh.material.uniforms;uniforms.time.value=time;uniforms.fade.value+=(stage.layers[layer]-uniforms.fade.value)*blend;
        mesh.visible=uniforms.fade.value>.001;if(!mesh.visible)return;
      });
      lights.forEach((light,i)=>{
        light.intensity=waterGlow.value*(i===0?8:i===1?6:4.5)*(.9+.1*Math.sin(time*.13+i));
        light.position.x=(i===0?-3:i===1?3:0)+.25*Math.sin(time*.072+i);
      });
    }
  };
}
