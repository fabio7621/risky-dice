import * as THREE from 'three';

/* ---------- 粒子系統（共用池）---------- */
export function makeParticles(scene, count, size, color){
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count*3),3));
  const m = new THREE.PointsMaterial({
    color, size, transparent:true, opacity:0,
    blending:THREE.AdditiveBlending, depthWrite:false, sizeAttenuation:true
  });
  const pts = new THREE.Points(g,m);
  pts.userData = {vel:new Float32Array(count*3), life:new Float32Array(count), active:false};
  scene.add(pts);
  return pts;
}

export function emit(sys, origin, speed, upBias, life){
  const p = sys.geometry.attributes.position.array;
  const u = sys.userData;
  const n = u.life.length;
  for(let i=0;i<n;i++){
    p[i*3]=origin.x; p[i*3+1]=origin.y; p[i*3+2]=origin.z;
    const a = Math.random()*Math.PI*2, e = Math.random();
    const s = speed*(.4+Math.random()*.6);
    u.vel[i*3]   = Math.cos(a)*s*(1-e*.4);
    u.vel[i*3+1] = upBias*s*e + speed*.25;
    u.vel[i*3+2] = Math.sin(a)*s*(1-e*.4);
    u.life[i]    = life*(.5+Math.random()*.5);
  }
  u.active=true; u.maxLife=life;
  sys.material.opacity=1;
  sys.geometry.attributes.position.needsUpdate=true;
}

export function updateParticles(sys, dt, gravity){
  const u=sys.userData; if(!u.active) return;
  const p=sys.geometry.attributes.position.array;
  let alive=0;
  for(let i=0;i<u.life.length;i++){
    if(u.life[i]<=0) continue;
    u.life[i]-=dt; if(u.life[i]>0) alive++;
    u.vel[i*3+1]+=gravity*dt;
    p[i*3]+=u.vel[i*3]*dt; p[i*3+1]+=u.vel[i*3+1]*dt; p[i*3+2]+=u.vel[i*3+2]*dt;
    if(p[i*3+1]<.02){ p[i*3+1]=.02; u.vel[i*3+1]*=-.4; }
  }
  sys.material.opacity = Math.max(0, sys.material.opacity - dt*.9);
  sys.geometry.attributes.position.needsUpdate=true;
  if(!alive){ u.active=false; sys.material.opacity=0; }
}
