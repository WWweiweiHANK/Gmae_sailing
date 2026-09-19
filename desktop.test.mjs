import {test} from 'node:test';
import assert from 'node:assert/strict';
let env={},runtime={};
try{env=await import('./environment.mjs');}catch{}
try{runtime=await import('./render-budget.mjs');}catch{}
const seeded=seed=>()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
test('weather follows adjacent layers with advance storm warning and cooldown',()=>{
 assert.equal(typeof env.createEnvironment,'function');
 const world=env.createEnvironment(seeded(43));let previous=world.snapshot(),lastStorm=-Infinity,storms=0,warned=false;
 for(let t=0;t<86400;t++){
  world.advance(1);const s=world.snapshot();if(s.stormWarning)warned=true;
  if(s.weather!==previous.weather){
   assert.ok(Math.abs(['clear','overcast','drizzle','storm'].indexOf(s.weather)-['clear','overcast','drizzle','storm'].indexOf(previous.weather))<=1);
   assert.ok(s.transitionDuration>=12&&s.transitionDuration<=25);
   if(s.weather==='storm'){assert.ok(warned);assert.ok(t-lastStorm>=1200);lastStorm=t;storms++;}warned=false;
  }
  previous=s;
 }
 assert.ok(storms>0&&storms<30);
});
test('day and weather clocks are independent and time is frame-rate invariant',()=>{
 assert.equal(typeof env.createEnvironment,'function');
 const a=env.createEnvironment(seeded(23)),b=env.createEnvironment(seeded(23));
 for(let i=0;i<30*1800;i++)a.advance(1/30);
 for(let i=0;i<20*1800;i++)b.advance(1/20);
 assert.equal(a.snapshot().period,b.snapshot().period);assert.equal(a.snapshot().weather,b.snapshot().weather);
 assert.ok(Math.abs(a.snapshot().worldTime-b.snapshot().worldTime)<1e-5);
});
test('render budget caps pixels at high DPI and a stopped clock never catches up',()=>{
 assert.equal(typeof runtime.drawingSize,'function');
 const size=runtime.drawingSize(1600,1200,3,30);assert.ok(size.width*size.height<=921600);assert.ok(size.width<=1280);
 const clock=runtime.createFrameClock();assert.equal(clock.tick(1000,false,30),0);assert.equal(clock.tick(600000,false,30),0);assert.equal(clock.tick(600001,true,30),0);assert.ok(clock.tick(600051,true,30)<=.051);
});

test('desktop DPI and energy presets stay within their pixel budgets',()=>{
 for(const dpi of [1,1.25,1.5,2,3])for(const fps of [20,30]){
  const size=runtime.drawingSize(560,540,dpi,fps),limit=runtime.RENDER_LIMITS[fps];
  assert.ok(size.width*size.height<=limit.pixels);assert.ok(Math.max(size.width,size.height)<=limit.maxSide);assert.ok(size.ratio<=limit.dpr);
 }
});
test('wake keeps a fixed GPU buffer and the same trajectory at 20 and 30 FPS',async()=>{
 const THREE=await import('three'),{createWake}=await import('./wake-pool.mjs');
 const sceneA=new THREE.Scene(),sceneB=new THREE.Scene(),a=createWake(sceneA),b=createWake(sceneB);
 const matrixA=a.mesh.instanceMatrix,opacityA=a.mesh.geometry.getAttribute('instanceOpacity');
 for(let i=1;i<=30*120;i++)a.update(15+i/30,1/30,()=>0);
 for(let i=1;i<=20*120;i++)b.update(15+i/20,1/20,()=>0);
 assert.equal(sceneA.children.length,1);assert.equal(a.capacity,200);assert.equal(a.mesh.instanceMatrix,matrixA);assert.equal(a.mesh.geometry.getAttribute('instanceOpacity'),opacityA);
 assert.equal(matrixA.array.length,200*16);
 matrixA.array.forEach((v,i)=>assert.ok(Number.isFinite(v)&&Math.abs(v-b.mesh.instanceMatrix.array[i])<.0001));
});

test('slow visible frames preserve world speed rather than dropping elapsed time',()=>{const clock=runtime.createFrameClock();clock.tick(0,true,30);assert.equal(clock.tick(1000,true,30),1);clock.tick(1500,false,30);assert.equal(clock.tick(300000,true,30),0);});

test('ship appearance rejects damaged saves, locked badges and overwide names',async()=>{
 const {sanitizeShip,shipName,DEFAULT_SHIP}=await import('./ship-customization.mjs');
 assert.deepEqual(sanitizeShip(null),DEFAULT_SHIP);
 assert.deepEqual(sanitizeShip({name:{},hullColor:'url(https://bad)',roofColor:4,equippedBadge:'moon'}),DEFAULT_SHIP);
 assert.equal(shipName('一二三四五六七'),'一二三四五六');assert.equal(shipName('ABCDEFGHIJKLM'),'ABCDEFGHIJKL');
 assert.equal(shipName('小雨ABCD123456'),'小雨ABCD1234');assert.equal(shipName('  小雨\n号\u202e  '),'小雨号');
 const changed=sanitizeShip({name:'晚风号',hullColor:'#a9d5bd',roofColor:'#e99a7f',stripeColor:'#42685f',equippedBadge:'whale'});
 assert.deepEqual(sanitizeShip(JSON.parse(JSON.stringify(changed))),changed);assert.equal(changed.equippedBadge,'whale');
});

test('stationary ship emits no wake and resumes at the frozen route, without a backlog',async()=>{
 const THREE=await import('three'),{createWake}=await import('./wake-pool.mjs');
 const wake=createWake(new THREE.Scene()),positions=wake.mesh.instanceMatrix;
 wake.update(40,25,()=>0,15,false);assert.ok(wake.mesh.geometry.getAttribute('instanceOpacity').array.every(v=>v===0));
 wake.update(40.1,.1,()=>0,15.1,true);
 const opacity=wake.mesh.geometry.getAttribute('instanceOpacity').array;
 assert.equal(opacity.filter(v=>v>0).length,2);assert.equal(wake.mesh.instanceMatrix,positions);
});

test('showcase camera follows a sailing ship, orbits the real world and restores the original view',async()=>{
 const THREE=await import('three'),{OrbitControls}=await import('three/addons/controls/OrbitControls.js');
 const {createShowcaseCamera}=await import('./ship-showcase.mjs');assert.equal(typeof createShowcaseCamera,'function');
 const camera=new THREE.PerspectiveCamera(36,1,.1,150),controls=new OrbitControls(camera,null),ship=new THREE.Group();
 camera.position.set(13,16,18);controls.target.set(0,2.35,0);controls.update();
 const original=camera.position.clone(),target=controls.target.clone(),rotation=camera.quaternion.clone();
 ship.position.set(2,.1,1);ship.rotation.set(.05,.7,.03);const shipRotation=ship.quaternion.clone();
 const view=createShowcaseCamera(camera,controls);view.update(ship,.5,0,0,1);const close=camera.position.clone();
 const movement=new THREE.Vector3(1,0,.4);ship.position.add(movement);view.update(ship,.5,0,0,1);
 assert.ok(camera.position.clone().sub(close).distanceTo(movement)<1e-9);
 const position=ship.position.clone(),worldPoint=new THREE.Vector3(-4,0,2);camera.updateMatrixWorld();const before=worldPoint.clone().project(camera);
 view.update(ship,.5,.8,-.3,1);camera.updateMatrixWorld();assert.ok(worldPoint.clone().project(camera).distanceTo(before)>.1);
 assert.ok(ship.position.equals(position));assert.ok(ship.quaternion.equals(shipRotation));
 view.restore();assert.ok(camera.position.equals(original));assert.ok(controls.target.equals(target));assert.ok(camera.quaternion.angleTo(rotation)<1e-7);assert.equal(controls.enabled,true);
 controls.update();assert.ok(camera.position.distanceTo(original)<1e-9);
});
