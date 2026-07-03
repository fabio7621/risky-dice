/* ---------- 音效（極簡合成器）---------- */
let actx = null;

export function audio(){
  if(!actx){ try{ actx = new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} }
  if(actx && actx.state === 'suspended') actx.resume();
  return actx;
}

export function tick(freq, dur, gain, type){
  const a = audio(); if(!a) return;
  const o = a.createOscillator(), g = a.createGain();
  o.type = type||'triangle'; o.frequency.value = freq;
  g.gain.setValueAtTime(gain, a.currentTime);
  g.gain.exponentialRampToValueAtTime(.0001, a.currentTime+dur);
  o.connect(g).connect(a.destination);
  o.start(); o.stop(a.currentTime+dur);
}

export function chime(tier){
  if(tier===3){ tick(72,.9,.16,'sawtooth'); setTimeout(()=>tick(54,1.1,.14,'sawtooth'),140); return; }
  const notes = [[660,880,1320],[660,880],[660]][tier];   // 吉的等級越高音越華麗
  notes.forEach((f,i)=>setTimeout(()=>tick(f,.5,.08),i*110));
}
