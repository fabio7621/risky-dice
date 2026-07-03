/* ============================================================
   No.025 風險骰子 リスキーダイス — 全域設定
   ============================================================ */

// 面配置：13 面大吉、3 面中吉、3 面小吉、1 面大凶
export const TIERS = [
  {name:'大吉', cls:'good',  ink:'#3f2a08', glow:'rgba(60,35,0,.8)'},
  {name:'中吉', cls:'mid',   ink:'#4a3a12', glow:'rgba(70,50,10,.7)'},
  {name:'小吉', cls:'small', ink:'#41402a', glow:'rgba(60,60,30,.6)'},
  {name:'大凶', cls:'bad',   ink:'#7e0d0d', glow:'rgba(255,30,0,.95)'}
];

export const FACE_TIER = new Array(20).fill(0);
FACE_TIER[13] = 3;                     // 大凶
[2,7,16].forEach(f=>FACE_TIER[f]=1);   // 中吉
[4,10,18].forEach(f=>FACE_TIER[f]=2);  // 小吉

export const R = 1;                    // 骰子外接球半徑
export const FLOOR = 0;
export const BOUND_X = 5.2;
export const BOUND_Z = 4.2;
export const GRAVITY = -22;            // 稍大重力，手感更俐落
export const HOLD_Y = 2.1;             // 抓著時的懸浮高度

export const RING_COLORS = [0xffd97a, 0xe8d9a0, 0xcfe3d5, 0xff3822];
export const BURST = [{s:4.2,l:1.6},{s:3,l:1.2},{s:2.1,l:.9}];   // 吉的等級越高爆得越大
