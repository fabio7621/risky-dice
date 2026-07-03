/* ============================================================
   搖晃偵測（手機 devicemotion）
   iOS 13+ 需在使用者手勢中呼叫 requestPermission，
   因此掛在第一次 pointerdown 順便請求。
   ============================================================ */

const THRESHOLD = 16;      // 單次加速度變化門檻（三軸絕對值總和，m/s²）
const JOLT_WINDOW = 550;   // 兩次抖動需在此毫秒內才算「搖晃」
const COOLDOWN = 1400;     // 觸發後的冷卻，避免一次搖晃連發

// onShake(intensity)：intensity 為 0~1 的搖晃強度
export function initShake(onShake){
  if(typeof DeviceMotionEvent === 'undefined') return false;

  let last = null, joltAt = -1e9, firedAt = -1e9, peak = 0;

  function onMotion(e){
    const a = e.accelerationIncludingGravity;
    if(!a || a.x === null) return;
    if(last){
      const d = Math.abs(a.x - last.x) + Math.abs(a.y - last.y) + Math.abs(a.z - last.z);
      const now = performance.now();
      if(d > THRESHOLD && now - firedAt > COOLDOWN){
        peak = Math.max(peak, d);
        if(now - joltAt < JOLT_WINDOW){
          firedAt = now; joltAt = -1e9;
          onShake(Math.min((peak - THRESHOLD) / 30, 1));
          peak = 0;
        }else{
          joltAt = now; peak = d;
        }
      }
    }
    last = {x: a.x, y: a.y, z: a.z};
  }

  if(typeof DeviceMotionEvent.requestPermission === 'function'){
    // iOS：第一次點擊畫面時請求動作感應權限
    const ask = ()=>{
      removeEventListener('pointerdown', ask);
      DeviceMotionEvent.requestPermission()
        .then(state=>{ if(state === 'granted') addEventListener('devicemotion', onMotion); })
        .catch(()=>{});
    };
    addEventListener('pointerdown', ask);
  }else{
    addEventListener('devicemotion', onMotion);
  }
  return true;
}
