/* ============================================================
   No.025 風險骰子 リスキーダイス
   正二十面體 d20．簡化剛體物理（衝量式頂點碰撞）
   ============================================================ */
import * as THREE from 'three';
import './style.css';
import { TIERS, FACE_TIER, R, BOUND_X, BOUND_Z, HOLD_Y, RING_COLORS, BURST } from './config.js';
import { audio, tick, chime } from './audio.js';
import { feltTexture } from './textures.js';
import { createDice } from './dice.js';
import { createPhysics } from './physics.js';
import { makeParticles, emit, updateParticles } from './particles.js';
import { initShake } from './shake.js';

const V3 = THREE.Vector3, Q4 = THREE.Quaternion;
const UP = new V3(0,1,0);
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- 基本場景 ---------- */
const container = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x06120d, 0.045);

const camera = new THREE.PerspectiveCamera(46, innerWidth/innerHeight, .1, 100);
const CAM_BASE = new V3(0, 6.4, 9.2);
camera.position.copy(CAM_BASE);
camera.lookAt(0,0.6,0);

/* ---------- 燈光 ---------- */
scene.add(new THREE.HemisphereLight(0x3a5c4c, 0x0a1410, .7));

const key = new THREE.DirectionalLight(0xffe9c0, 1.15);
key.position.set(4,9,5);
key.castShadow = true;
key.shadow.mapSize.set(1024,1024);
key.shadow.camera.left=-8; key.shadow.camera.right=8;
key.shadow.camera.top=8;  key.shadow.camera.bottom=-8;
scene.add(key);

const rim = new THREE.PointLight(0x66ffcc, .5, 30);
rim.position.set(-6,4,-6);
scene.add(rim);

const underGlow = new THREE.PointLight(0xd9b45c, .0, 8);  // 骰子腳下的呼吸光
underGlow.position.set(0,.4,0);
scene.add(underGlow);

/* ---------- 桌面 ---------- */
const table = new THREE.Mesh(
  new THREE.CircleGeometry(15, 64),
  new THREE.MeshStandardMaterial({map:feltTexture(), roughness:.95, metalness:0})
);
table.rotation.x = -Math.PI/2;
table.receiveShadow = true;
scene.add(table);

/* ---------- 骰子 + 物理 ---------- */
const { dice, localNormals, localVerts } = createDice(renderer.capabilities.getMaxAnisotropy());
scene.add(dice);

const phys = createPhysics(localVerts, localNormals);
const body = phys.body;
let snapping = null, rollingHot = false;

/* ---------- 靜止後：轉正 + 判定結果 ---------- */
function beginSnap(){
  const f = phys.topFace();
  const n = localNormals[f].clone().applyQuaternion(body.quat);
  const dq = new Q4().setFromUnitVectors(n, UP);
  snapping = {
    from: body.quat.clone(),
    to: dq.multiply(body.quat).normalize(),
    t: 0, face: f,
    y0: body.pos.y
  };
}
let wasThrown = false;   // 「輕放」不算一次擲骰
function finishRoll(face){
  if(wasThrown) showResult(FACE_TIER[face]);
  wasThrown = false;
}

/* ---------- 粒子 ---------- */
const sparks   = makeParticles(scene, 40,  .07, 0xffd97a);   // 碰撞火花
const burstG   = makeParticles(scene, 160, .12, 0xffcf5e);   // 大吉爆發
const burstB   = makeParticles(scene, 160, .12, 0xff3822);   // 大凶爆發
const ambient  = makeParticles(scene, 90,  .05, 0x86ffcf);   // 環境浮塵

// 環境浮塵初始化（永久漂浮）
{
  const p = ambient.geometry.attributes.position.array;
  for(let i=0;i<90;i++){
    p[i*3]=(Math.random()-.5)*16; p[i*3+1]=Math.random()*6+.3; p[i*3+2]=(Math.random()-.5)*12;
  }
  ambient.material.opacity=.35;
  ambient.geometry.attributes.position.needsUpdate=true;
}

/* ---------- 結果光環 ---------- */
const ring = new THREE.Mesh(
  new THREE.RingGeometry(.9,1.05,64),
  new THREE.MeshBasicMaterial({color:0xffd97a, transparent:true, opacity:0, side:THREE.DoubleSide,
    blending:THREE.AdditiveBlending, depthWrite:false})
);
ring.rotation.x=-Math.PI/2; ring.position.y=.02;
scene.add(ring);
let ringT = -1;

/* ---------- 事件反饋 ---------- */
let shakeT = 0, shakeAmp = 0;
function onImpact(point, power){
  emit(sparks, point, Math.min(power*.9,4), 1.4, .45);
  tick(180+Math.random()*120, .08, Math.min(power*.02,.06));
}

const banner = document.getElementById('banner');
const flash  = document.getElementById('flash');
const counts = [0,0,0,0];

function showResult(tier){
  const at = dice.position.clone(); at.y += .6;
  const info = TIERS[tier];
  counts[tier]++;
  document.getElementById('c'+tier).textContent = counts[tier];
  banner.textContent = info.name[0] + '　' + info.name[1];
  banner.className = 'show ' + info.cls;
  ring.material.color.set(RING_COLORS[tier]);
  ring.position.x = dice.position.x; ring.position.z = dice.position.z;
  ringT = 0;
  if(tier===3){
    emit(burstB, at, 5, 1.8, 1.4);
    flash.classList.add('on');
    if(!reduceMotion){ shakeT=.7; shakeAmp=.22; }
    setTimeout(()=>flash.classList.remove('on'), 900);
  }else{
    const p = BURST[tier];
    emit(burstG, at, p.s, 2.2, p.l);
  }
  chime(tier);
  setTimeout(()=>banner.classList.remove('show'), 1700);
}

/* ---------- 擲骰 ---------- */
const hint = document.getElementById('hint');
function throwDice(vx, vy, vz){
  hint.classList.add('hide');
  banner.classList.remove('show');
  snapping = null; phys.sleeping = false; phys.settleTimer = 0; wasThrown = true;
  if(body.pos.y < R) body.pos.y = R + .35;
  body.vel.set(vx, vy, vz);
  body.omega.set(
    (Math.random()-.5)*2 - vz*1.6,
    (Math.random()-.5)*6,
    (Math.random()-.5)*2 + vx*1.6
  );
  const spin = 6 + Math.min(Math.hypot(vx,vz)*1.4, 10);
  body.omega.normalize().multiplyScalar(spin);
  audio();
}

// 按鈕／搖晃擲骰：從骰子最後停留的位置「拿起來」再擲，不瞬移
// power 0~1：額外力道（搖晃越大力擲越猛）
let pickup = null;
function pickupAndThrow(power = 0){
  if(held || pickup) return;
  phys.sleeping = true; snapping = null; phys.settleTimer = 0;
  hint.classList.add('hide');
  banner.classList.remove('show');
  body.vel.set(0,0,0); body.omega.set(0,0,0);
  pickup = {
    from: body.pos.clone(),
    to: new V3(body.pos.x*.6, HOLD_Y + .5, body.pos.z*.6),
    t: 0, power
  };
  audio();
}
document.getElementById('rollBtn').addEventListener('click', ()=>pickupAndThrow());
function finishPickup(){
  const power = pickup.power;
  pickup = null;
  const a = Math.random()*Math.PI*2, s = 3+Math.random()*3 + power*4;
  // 出手方向帶一點往桌面中央的偏移，避免直接撞上圍欄
  const vx = Math.cos(a)*s - body.pos.x*.7;
  const vz = Math.sin(a)*s*.7 - body.pos.z*.7;
  throwDice(vx, 2+Math.random()*2 + power*1.5, vz);
}
document.getElementById('resetBtn').addEventListener('click', ()=>{
  phys.sleeping = true; snapping = null; pickup = null;
  body.pos.set(0, R+0.02, 0); body.vel.set(0,0,0); body.omega.set(0,0,0);
  banner.classList.remove('show');
});

/* ---------- 抓取骰子（Raycaster 命中 → 懸空拖曳 → 世界座標甩出）---------- */
const raycaster = new THREE.Raycaster();
const pointerNDC = new THREE.Vector2();
// 比骰子大一圈的隱形抓取範圍，手指粗一點也抓得到
const grabSphere = new THREE.Mesh(
  new THREE.SphereGeometry(R*1.9, 8, 8),
  new THREE.MeshBasicMaterial({visible:false})
);
scene.add(grabSphere);
const holdPlane = new THREE.Plane(new V3(0,1,0), -HOLD_Y); // 平面 y = HOLD_Y
let held = false;
const holdTarget = new V3();
const prevHold = new V3(), _spin = new V3();   // 上一幀手的位置、目標角速度
let samples = [];                              // 世界座標位置取樣（算甩出速度用）
const _hp = new V3(), _mv = new V3(), _hq = new Q4();

function ndcFromEvent(e){
  pointerNDC.x =  (e.clientX/innerWidth)*2 - 1;
  pointerNDC.y = -(e.clientY/innerHeight)*2 + 1;
}

container.addEventListener('pointerdown', e=>{
  audio();
  ndcFromEvent(e);
  raycaster.setFromCamera(pointerNDC, camera);
  grabSphere.position.copy(body.pos);
  if(raycaster.intersectObject(grabSphere).length === 0) return;  // 沒點到骰子
  held = true; phys.sleeping = true; snapping = null; pickup = null;
  container.classList.add('dragging');
  container.setPointerCapture(e.pointerId);
  holdTarget.copy(body.pos); holdTarget.y = HOLD_Y;
  prevHold.copy(holdTarget);
  samples = [{p: body.pos.clone(), t: performance.now()}];
  hint.classList.add('hide');
  banner.classList.remove('show');
});

container.addEventListener('pointermove', e=>{
  if(!held) return;
  ndcFromEvent(e);
  raycaster.setFromCamera(pointerNDC, camera);
  if(raycaster.ray.intersectPlane(holdPlane, holdTarget)){
    holdTarget.y = HOLD_Y;
    holdTarget.x = THREE.MathUtils.clamp(holdTarget.x, -BOUND_X, BOUND_X);
    holdTarget.z = THREE.MathUtils.clamp(holdTarget.z, -BOUND_Z, BOUND_Z);
  }
});

function releaseDice(){
  if(!held) return;
  held = false; container.classList.remove('dragging');
  // 取「最近約 120ms」的位移換算世界座標速度，避免整段拖曳平均掉甩勁
  const now = performance.now();
  let old = samples[0];
  for(const s of samples){ if(now - s.t <= 120){ old = s; break; } }
  const dt = Math.max((now - old.t)/1000, .016);
  const v = new V3().subVectors(body.pos, old.p).divideScalar(dt);
  const speed = Math.hypot(v.x, v.z);
  if(speed > 1.2){
    const cap = Math.min(speed, 11)/speed;                 // 上限：別甩到穿牆
    throwDice(v.x*cap, 2.2 + Math.min(speed*.35, 4.5), v.z*cap);
  }else{
    // 輕放：讓它自然落下，不算一次擲骰
    wasThrown = false; phys.sleeping = false; phys.settleTimer = 0;
    body.vel.set(v.x*.4, -1, v.z*.4);
    body.omega.multiplyScalar(.5);
  }
}
container.addEventListener('pointerup', releaseDice);
container.addEventListener('pointercancel', releaseDice);

/* ---------- 搖晃手機擲骰 ---------- */
if(initShake(power=>pickupAndThrow(power)) && matchMedia('(pointer: coarse)').matches){
  hint.textContent = '抓住骰子甩動放開、搖晃手機，或按下方「擲骰」';
}

/* ---------- 主迴圈 ---------- */
const clock = new THREE.Clock();
let acc=0; const FIXED=1/120;
const physHooks = { onImpact, onSettle: beginSnap };

function animate(){
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), .05);
  const t = clock.elapsedTime;

  // 固定步長物理
  acc += dt;
  while(acc >= FIXED){ phys.step(FIXED, physHooks); acc -= FIXED; }

  // 被抓著時：平滑跟隨滑鼠 + 依移動方向緩慢滾動
  if(held && dt > 0){
    _hp.copy(body.pos);
    body.pos.lerp(holdTarget, 1 - Math.pow(.0005, dt));    // 幀率無關的平滑跟隨
    // 用「手的實際移動量」驅動旋轉（未平滑）：左右快速晃動也轉得起來
    _mv.subVectors(holdTarget, prevHold);
    prevHold.copy(holdTarget);
    _spin.set(_mv.z, -_mv.x*.7, -_mv.x)                    // 滾轉 + 左右晃動的扭轉
         .multiplyScalar(1.5/Math.max(dt,.001));
    if(_spin.length() > 16) _spin.setLength(16);
    body.omega.lerp(_spin, 1 - Math.pow(.002, dt));        // 平滑趨近，停手時自然停轉
    _hq.set(body.omega.x, body.omega.y, body.omega.z, 0).multiply(body.quat);
    body.quat.x += _hq.x*.5*dt; body.quat.y += _hq.y*.5*dt;
    body.quat.z += _hq.z*.5*dt; body.quat.w += _hq.w*.5*dt;
    body.quat.normalize();
    samples.push({p: body.pos.clone(), t: performance.now()});
    if(samples.length > 10) samples.shift();
  }

  // 按鈕擲骰的「拿起來」動畫：保持最後的面向，從原地舉起後甩出
  if(pickup){
    pickup.t += dt*3.4;
    const k = Math.min(pickup.t, 1);
    const e = 1-Math.pow(1-k,2);
    body.pos.lerpVectors(pickup.from, pickup.to, e);
    if(k>=1) finishPickup();
  }

  // 轉正動畫
  if(snapping){
    snapping.t += dt*3.2;
    const k = Math.min(snapping.t, 1);
    const e = 1-Math.pow(1-k,3);
    body.quat.copy(snapping.from).slerp(snapping.to, e);
    body.pos.y = snapping.y0 + (R*0.755 - snapping.y0)*e;  // 面貼地的質心高度（內切球半徑）
    body.pos.y = Math.max(body.pos.y, R*0.7);
    if(k>=1){ const f=snapping.face; snapping=null; finishRoll(f); }
  }

  dice.position.copy(body.pos);
  dice.quaternion.copy(body.quat);

  // 滾動中的殘光粒子
  rollingHot = !phys.sleeping && body.omega.length() > 4;
  if(rollingHot && Math.random()<.35){
    emit(sparks, dice.position, 1.2, .8, .3);
  }

  // 腳下呼吸光
  underGlow.position.x = body.pos.x; underGlow.position.z = body.pos.z;
  underGlow.intensity = phys.sleeping ? (.6+Math.sin(t*2.2)*.25) : 1.1;

  // 光環擴散
  if(ringT>=0){
    ringT += dt;
    const s = 1 + ringT*5;
    ring.scale.set(s,s,s);
    ring.material.opacity = Math.max(0, .8 - ringT*.9);
    if(ringT>1.2) ringT=-1;
  }

  // 環境浮塵緩慢漂浮
  {
    const p = ambient.geometry.attributes.position.array;
    for(let i=0;i<90;i++){
      p[i*3+1] += Math.sin(t*.6+i)*.0016;
      p[i*3]   += Math.cos(t*.4+i*1.7)*.0012;
    }
    ambient.material.opacity = .3+Math.sin(t*.8)*.1;
    ambient.geometry.attributes.position.needsUpdate = true;
  }

  updateParticles(sparks, dt, -9);
  updateParticles(burstG, dt, -3.5);
  updateParticles(burstB, dt, -3.5);

  // 鏡頭：待機微晃 + 大凶震動
  let sx=0, sy=0;
  if(shakeT>0){
    shakeT-=dt;
    sx=(Math.random()-.5)*shakeAmp*shakeT;
    sy=(Math.random()-.5)*shakeAmp*shakeT;
  }
  camera.position.x = CAM_BASE.x + Math.sin(t*.3)*.5 + sx;
  camera.position.y = CAM_BASE.y + Math.sin(t*.5)*.15 + sy;
  camera.position.z = CAM_BASE.z + Math.cos(t*.25)*.3;
  camera.lookAt(dice.position.x*.4, .6, dice.position.z*.4);

  renderer.render(scene, camera);
}
animate();

addEventListener('resize', ()=>{
  camera.aspect = innerWidth/innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
