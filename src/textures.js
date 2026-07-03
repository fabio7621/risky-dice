import * as THREE from 'three';
import { TIERS } from './config.js';

/* ---------- 賭場絨布桌面 ---------- */
export function feltTexture(){
  const c = document.createElement('canvas'); c.width=c.height=1024;
  const g = c.getContext('2d');
  const rad = g.createRadialGradient(512,512,60,512,512,540);
  rad.addColorStop(0,'#14523e'); rad.addColorStop(.65,'#0d3b2e'); rad.addColorStop(1,'#07231b');
  g.fillStyle = rad; g.fillRect(0,0,1024,1024);
  // 絨布噪點
  for(let i=0;i<9000;i++){
    g.fillStyle = 'rgba(255,255,255,'+(Math.random()*.02)+')';
    g.fillRect(Math.random()*1024, Math.random()*1024, 1, 1);
  }
  // 金色裝飾環
  g.strokeStyle='rgba(217,180,92,.4)'; g.lineWidth=3;
  g.beginPath(); g.arc(512,512,300,0,Math.PI*2); g.stroke();
  g.strokeStyle='rgba(217,180,92,.18)'; g.lineWidth=14;
  g.beginPath(); g.arc(512,512,322,0,Math.PI*2); g.stroke();
  g.strokeStyle='rgba(217,180,92,.25)'; g.lineWidth=1.5;
  g.beginPath(); g.arc(512,512,340,0,Math.PI*2); g.stroke();
  return new THREE.CanvasTexture(c);
}

/* ---------- 骰面貼圖：吉 / 凶 ---------- */
export function faceTexture(tierIdx, maxAnisotropy){
  const tier = TIERS[tierIdx], bad = (tierIdx === 3);
  const c = document.createElement('canvas'); c.width=c.height=256;
  const g = c.getContext('2d');
  const rad = g.createRadialGradient(128,120,10,128,128,190);
  if(bad){ rad.addColorStop(0,'#caa14e'); rad.addColorStop(.7,'#9c7326'); rad.addColorStop(1,'#5e3d14'); }
  else   { rad.addColorStop(0,'#e8c979'); rad.addColorStop(.7,'#c49a3e'); rad.addColorStop(1,'#7a5a1e'); }
  g.fillStyle = rad; g.fillRect(0,0,256,256);
  // 金屬刮痕
  g.globalAlpha=.08;
  for(let i=0;i<26;i++){
    g.strokeStyle = Math.random()>.5 ? '#fff':'#000';
    g.beginPath();
    const y = Math.random()*256;
    g.moveTo(0,y); g.lineTo(256, y+(Math.random()*40-20));
    g.stroke();
  }
  g.globalAlpha=1;
  // 直排兩字刻在三角形內（UV 三角形：頂點在上、底邊在下，上窄下寬）
  g.textAlign='center'; g.textBaseline='middle';
  g.font='900 56px "Noto Serif TC","PMingLiU",serif';
  g.shadowColor = tier.glow; g.shadowBlur = bad ? 22 : 6;
  g.fillStyle = tier.ink;
  tier.name.split('').forEach((ch,i)=>{
    const y = 108 + i*64;                 // 第一字較靠頂點、第二字在寬處
    g.save();                             // 亮邊：做出陰刻立體感
    g.shadowBlur=0; g.fillStyle='rgba(255,240,190,.55)';
    g.fillText(ch, 130, y+3);
    g.restore();
    g.fillText(ch, 128, y);
  });
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = maxAnisotropy;
  return t;
}
