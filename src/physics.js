import * as THREE from 'three';
import { R, FLOOR, BOUND_X, BOUND_Z, GRAVITY } from './config.js';

const V3 = THREE.Vector3, Q4 = THREE.Quaternion;
const UP = new V3(0,1,0);
const _r=new V3(), _vp=new V3(), _imp=new V3(), _tq=new V3(), _wq=new Q4();

/* ---------- 簡化剛體物理（衝量式頂點碰撞）----------
   回傳 phys 物件：
   phys.body        剛體狀態（pos / vel / quat / omega …）
   phys.sleeping    休眠旗標（拖曳、轉正動畫期間為 true）
   phys.step(dt, hooks)   hooks = { onImpact(point, power), onSettle() }
   phys.topFace()   目前朝上的面編號                        */
export function createPhysics(localVerts, localNormals){
  const body = {
    pos:new V3(0,R+0.02,0), vel:new V3(),
    quat:new Q4().setFromEuler(new THREE.Euler(.4,.2,.1)),
    omega:new V3(),                 // 角速度（世界座標）
    mass:1, restitution:.38, friction:.35,
    invInertia: 2.5 / (R*R)         // 近似球體 I=2/5 m r² 的倒數
  };

  const phys = {
    body,
    sleeping: true,
    settleTimer: 0,

    step(dt, hooks){
      if(phys.sleeping) return;
      body.vel.y += GRAVITY*dt;
      body.pos.addScaledVector(body.vel, dt);

      // 四元數積分：dq = ½ ω q dt
      _wq.set(body.omega.x, body.omega.y, body.omega.z, 0).multiply(body.quat);
      body.quat.x += _wq.x*.5*dt; body.quat.y += _wq.y*.5*dt;
      body.quat.z += _wq.z*.5*dt; body.quat.w += _wq.w*.5*dt;
      body.quat.normalize();

      // 隱形圍欄（不讓骰子飛出鏡頭）
      if(Math.abs(body.pos.x) > BOUND_X){ body.pos.x = Math.sign(body.pos.x)*BOUND_X; body.vel.x *= -.55; }
      if(Math.abs(body.pos.z) > BOUND_Z){ body.pos.z = Math.sign(body.pos.z)*BOUND_Z; body.vel.z *= -.55; }

      // 頂點 × 地板：衝量碰撞
      let deepest = 0, impactPower = 0; const contact = new V3();
      for(const lv of localVerts){
        _r.copy(lv).applyQuaternion(body.quat);          // 質心 → 頂點
        const wy = body.pos.y + _r.y;
        if(wy < FLOOR){
          const pen = FLOOR - wy;
          if(pen > deepest){ deepest = pen; contact.copy(_r).add(body.pos); }
          // 接觸點速度 = v + ω × r
          _vp.copy(body.omega).cross(_r).add(body.vel);
          if(_vp.y < 0){
            // 法向衝量（含轉動慣量影響）
            _tq.copy(_r).cross(UP);                       // r × n
            const angTerm = _tq.lengthSq() * body.invInertia;
            const j = -(1+body.restitution) * _vp.y / (1/body.mass + angTerm);
            _imp.set(0,j,0);
            // 切向摩擦
            const tv = new V3(_vp.x,0,_vp.z);
            if(tv.lengthSq() > 1e-6){
              tv.normalize().multiplyScalar(-j*body.friction);
              _imp.add(tv);
            }
            body.vel.addScaledVector(_imp, 1/body.mass);
            _tq.copy(_r).cross(_imp);
            body.omega.addScaledVector(_tq, body.invInertia);
            impactPower = Math.max(impactPower, j);
          }
        }
      }
      if(deepest > 0) body.pos.y += deepest;              // 位置修正
      if(impactPower > 1.6) hooks.onImpact(contact, impactPower);

      // 阻尼
      body.omega.multiplyScalar(1 - .35*dt);
      body.vel.x *= (1 - .12*dt); body.vel.z *= (1 - .12*dt);

      // 靜止判定
      const onGround = body.pos.y < R*0.92;
      if(onGround && body.vel.length() < .35 && body.omega.length() < .8){
        phys.settleTimer += dt;
        if(phys.settleTimer > .35){ phys.sleeping = true; hooks.onSettle(); }
      } else phys.settleTimer = 0;
    },

    topFace(){
      let best=-2, idx=0; const n=new V3();
      for(let f=0; f<20; f++){
        n.copy(localNormals[f]).applyQuaternion(body.quat);
        if(n.y > best){ best=n.y; idx=f; }
      }
      return idx;
    }
  };
  return phys;
}
