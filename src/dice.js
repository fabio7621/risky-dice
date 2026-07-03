import * as THREE from 'three';
import { R, FACE_TIER } from './config.js';
import { faceTexture } from './textures.js';

const V3 = THREE.Vector3;

/* ---------- 建立 d20：每面獨立材質群組 + UV、金色稜線 ----------
   回傳 { dice, localNormals, localVerts }
   localNormals：每面「局部空間」法向量（結果判定用）
   localVerts  ：頂點（局部空間、去重）— 碰撞用           */
export function createDice(maxAnisotropy){
  const geo = new THREE.IcosahedronGeometry(R,0).toNonIndexed();
  geo.clearGroups();
  {
    const uv = new Float32Array(20*3*2);
    for(let f=0; f<20; f++){
      geo.addGroup(f*3, 3, f);
      // 每個三角形貼滿同一張貼圖
      const o = f*6;
      uv[o+0]=0.50; uv[o+1]=0.96;   // 頂
      uv[o+2]=0.06; uv[o+3]=0.18;   // 左下
      uv[o+4]=0.94; uv[o+5]=0.18;   // 右下
    }
    geo.setAttribute('uv', new THREE.BufferAttribute(uv,2));
  }
  geo.computeVertexNormals();

  const localNormals = [];
  {
    const p = geo.attributes.position;
    const a=new V3(), b=new V3(), cc=new V3(), ab=new V3(), ac=new V3();
    for(let f=0; f<20; f++){
      a.fromBufferAttribute(p, f*3);
      b.fromBufferAttribute(p, f*3+1);
      cc.fromBufferAttribute(p, f*3+2);
      ab.subVectors(b,a); ac.subVectors(cc,a);
      localNormals.push(new V3().crossVectors(ab,ac).normalize());
    }
  }

  const localVerts = [];
  {
    const p = geo.attributes.position, seen = new Set();
    for(let i=0;i<p.count;i++){
      const v = new V3().fromBufferAttribute(p,i);
      const k = v.x.toFixed(3)+','+v.y.toFixed(3)+','+v.z.toFixed(3);
      if(!seen.has(k)){ seen.add(k); localVerts.push(v); }
    }
  }

  const materials = [];
  for(let f=0; f<20; f++){
    const tier = FACE_TIER[f];
    materials.push(new THREE.MeshStandardMaterial({
      map: faceTexture(tier, maxAnisotropy),
      metalness:.55, roughness:.38,
      emissive: tier===3 ? 0x330000 : 0x1a1206,
      emissiveIntensity:.5
    }));
  }
  const dice = new THREE.Mesh(geo, materials);
  dice.castShadow = true;

  // 金色稜線
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(geo),
    new THREE.LineBasicMaterial({color:0x5e4416, transparent:true, opacity:.9})
  );
  dice.add(edges);

  return { dice, localNormals, localVerts };
}
