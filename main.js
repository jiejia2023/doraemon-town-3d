import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ---------- Renderer / Scene / Camera ----------
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87c5e8);
scene.fog = new THREE.Fog(0xa8d4f0, 180, 420);

const camera = new THREE.PerspectiveCamera(48, innerWidth / innerHeight, 0.1, 1000);
camera.position.set(72, 62, 88);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 5);
controls.enableDamping = true;
controls.maxPolarAngle = Math.PI / 2.15;
controls.minDistance = 12;
controls.maxDistance = 260;

// Lights
const hemi = new THREE.HemisphereLight(0xcfeeff, 0x8a9a6a, 0.95);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff2cc, 2.2);
sun.position.set(80, 110, 50);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -130; sun.shadow.camera.right = 130;
sun.shadow.camera.top = 130; sun.shadow.camera.bottom = -130;
sun.shadow.camera.far = 350;
scene.add(sun);
const ambientNight = new THREE.AmbientLight(0x334466, 0);
scene.add(ambientNight);

// ---------- Helpers ----------
const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, metalness: 0.02, ...o });
function box(w, h, d, c, x = 0, y = 0, z = 0, o = {}) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M(c, o));
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; return m;
}
function cyl(rt, rb, h, c, x = 0, y = 0, z = 0, seg = 20, o = {}) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), M(c, o));
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; return m;
}
function sph(r, c, x = 0, y = 0, z = 0, o = {}) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 18), M(c, o));
  m.position.set(x, y, z); m.castShadow = true; return m;
}
function cone(r, h, c, x = 0, y = 0, z = 0, seg = 4) {
  const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, seg), M(c, { flatShading: true }));
  m.position.set(x, y, z); m.castShadow = true; return m;
}
function textSprite(text, sub = '', bg = '#0096e6') {
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 160;
  const g = cv.getContext('2d');
  g.fillStyle = bg; g.beginPath(); g.roundRect(6, 18, 500, 104, 28); g.fill();
  g.strokeStyle = '#fff'; g.lineWidth = 6; g.stroke();
  g.fillStyle = '#fff'; g.textAlign = 'center'; g.font = 'bold 52px sans-serif';
  g.fillText(text, 256, 72);
  if (sub) { g.font = '28px sans-serif'; g.fillStyle = '#eaf6ff'; g.fillText(sub, 256, 108); }
  g.fillStyle = bg; g.beginPath(); g.moveTo(236, 122); g.lineTo(276, 122); g.lineTo(256, 152); g.fill();
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  sp.scale.set(13, 4.06, 1); return sp;
}
function signBoard(text, w = 6, bg = '#ffffff', fg = '#333333', size = 44) {
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 128;
  const g = cv.getContext('2d'); g.fillStyle = bg; g.fillRect(0, 0, 512, 128);
  g.fillStyle = fg; g.textAlign = 'center'; g.font = `bold ${size}px sans-serif`;
  g.fillText(text, 256, 84);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w * 0.25), new THREE.MeshBasicMaterial({ map: tex }));
  return m;
}

// Landmark registry
const landmarks = [];
const labelGroup = new THREE.Group(); scene.add(labelGroup);
function registerLandmark(group, data, labelPos) {
  group.userData.landmark = data;
  group.traverse(o => { o.userData.landmarkRoot = group; });
  landmarks.push({ group, ...data });
  const sp = textSprite(data.title, data.ja, data.color || '#0096e6');
  sp.position.copy(labelPos); labelGroup.add(sp);
  data._label = sp;
  return group;
}

// ---------- Ground / Roads / River ----------
const world = new THREE.Group(); scene.add(world);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(420, 420), M(0x8ec97a));
ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; world.add(ground);

// Subtle grass patches
for (let i = 0; i < 40; i++) {
  const p = box(8 + Math.random() * 12, 0.08, 6 + Math.random() * 10, i % 2 ? 0x82bd6b : 0x9ad184, -150 + Math.random() * 300, 0.04, -120 + Math.random() * 220);
  p.castShadow = false; world.add(p);
}
function road(w, d, x, z, rot = 0) {
  const g = new THREE.Group();
  const r = box(w, 0.12, d, 0x5b5f66, 0, 0.06, 0); r.castShadow = false; g.add(r);
  // center dashes
  const horiz = w > d;
  const n = Math.floor((horiz ? w : d) / 6);
  for (let i = 0; i < n; i++) {
    const dash = box(horiz ? 2.6 : 0.35, 0.04, horiz ? 0.35 : 2.6, 0xffffff, horiz ? -w / 2 + 3 + i * 6 : 0, 0.14, horiz ? 0 : -d / 2 + 3 + i * 6);
    dash.castShadow = false; g.add(dash);
  }
  const s1 = box(w, 0.05, horiz ? 0.5 : d, 0xf5f5f5, 0, 0.03, horiz ? d / 2 - 0.4 : 0); // placeholder replaced below
  g.position.set(x, 0, z); g.rotation.y = rot; world.add(g); return g;
}
road(340, 11, 0, 38);           // 商店街主路 (东西)
road(11, 300, 18, -30);         // 野比家门前南北路
road(240, 10, -20, -38);        // 学校通学路
road(10, 180, -52, 0);          // 公园西路
road(300, 9, 0, 72);            // 河堤路
// crosswalk near school & vacant lot
function crosswalk(x, z, rot = 0) {
  const g = new THREE.Group();
  for (let i = -2; i <= 2; i++) { const s = box(1.1, 0.05, 7, 0xffffff, i * 1.9, 0.16, 0); s.castShadow = false; g.add(s); }
  g.position.set(x, 0, z); g.rotation.y = rot; world.add(g);
}
crosswalk(18, 38); crosswalk(-30, -38); crosswalk(18, -8, Math.PI / 2);

// River (south) - like anime riverbank scenes where Nobita walks home
const river = box(340, 0.3, 26, 0x3aa7d6, 0, 0.05, 108, { roughness: 0.25, metalness: 0.1 });
river.castShadow = false; world.add(river);
const bankN = box(340, 1.2, 10, 0x7fbc62, 0, 0.5, 90); world.add(bankN);
const bankS = box(340, 1.2, 10, 0x7fbc62, 0, 0.5, 126); world.add(bankS);
// Bridge
{
  const bg = new THREE.Group();
  bg.add(box(14, 0.8, 38, 0xd9d9d9, 0, 1.6, 0));
  bg.add(box(0.6, 2.2, 38, 0xe74c3c, -6.5, 3, 0)); bg.add(box(0.6, 2.2, 38, 0xe74c3c, 6.5, 3, 0));
  bg.position.set(18, 0, 108); world.add(bg);
}

// ---------- Generic Japanese house ----------
const windowMats = [];
function japaneseHouse({ w = 11, d = 9, h = 4.2, wall = 0xf3e9d2, roof = 0x5a6b7d, floors = 2, trim = 0x8b5a2b } = {}) {
  const g = new THREE.Group();
  const totalH = floors === 2 ? h * 1.75 : h;
  g.add(box(w, totalH, d, wall, 0, totalH / 2, 0));
  // tiled hip roof (寄棟) approximated with cone 4-seg + box eaves
  const eaves = box(w + 2.2, 0.35, d + 2.2, roof, 0, totalH + 0.15, 0); g.add(eaves);
  const top = cone(Math.max(w, d) * 0.72, 2.8, roof, 0, totalH + 1.75, 0, 4); top.rotation.y = Math.PI / 4; top.scale.set(w / Math.max(w, d), 1, d / Math.max(w, d)); g.add(top);
  g.add(box(w * 0.5, 0.3, 0.6, 0x44505e, 0, totalH + 3.05, 0));
  // entrance
  g.add(box(2.0, 3.0, 0.3, trim, 0, 1.5, d / 2 + 0.08));
  g.add(box(2.6, 0.25, 1.4, roof, 0, 3.25, d / 2 + 0.6));
  // windows with warm light material stored for night
  const winMat = new THREE.MeshStandardMaterial({ color: 0xbfe6ff, roughness: 0.2, emissive: 0x000000 });
  windowMats.push(winMat);
  const mkWin = (x, y, z, ry = 0) => {
    const f = box(1.95, 1.65, 0.08, 0xffffff, x, y, z - 0.04); g.add(f);
    const win = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.4), winMat);
    win.position.set(x, y, z + 0.02); win.rotation.y = ry; g.add(win);
  };
  mkWin(-w / 4, 2.4, d / 2 + 0.06); mkWin(w / 4, 2.4, d / 2 + 0.06);
  if (floors === 2) { mkWin(-w / 4, totalH - 1.6, d / 2 + 0.06); mkWin(w / 4, totalH - 1.6, d / 2 + 0.06); }
  // side window
  const sw = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.3), winMat); sw.position.set(w / 2 + 0.06, 2.6, 0); sw.rotation.y = Math.PI / 2; g.add(sw);
  // low fence + tiny garden
  g.add(box(w + 3, 0.9, 0.25, 0xd8cfc0, 0, 0.45, d / 2 + 2.6));
  g.add(box(w + 3, 0.9, 0.25, 0xd8cfc0, 0, 0.45, -d / 2 - 2.6));
  return g;
}

// Utility poles (iconic anime streetscape)
const polePositions = [];
function utilityPole(x, z) {
  const g = new THREE.Group();
  g.add(cyl(0.18, 0.22, 9, 0x6b5138, 0, 4.5, 0));
  g.add(box(3.4, 0.22, 0.22, 0x6b5138, 0, 8.2, 0));
  g.add(cyl(0.45, 0.45, 1.1, 0x444444, 1.1, 7.3, 0));
  g.position.set(x, 0, z); world.add(g); polePositions.push(new THREE.Vector3(x, 8.2, z)); return g;
}
[[24,30],[24,-2],[24,-34],[12,30],[12,-34],[-8,32],[-34,32],[-46,-2],[-46,-32],[50,32],[74,32],[-8,-44],[40,-44]].forEach(([x,z])=>utilityPole(x,z));
// wires
{
  const mat = new THREE.LineBasicMaterial({ color: 0x222222, transparent: true, opacity: 0.55 });
  for (let i = 0; i < polePositions.length - 1; i++) {
    const a = polePositions[i], b = polePositions[i+1];
    if (a.distanceTo(b) > 45) continue;
    const mid = a.clone().lerp(b, 0.5); mid.y -= 1.2;
    const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
    const geo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(16));
    world.add(new THREE.Line(geo, mat));
  }
}

// Trees
function tree(x, z, s = 1, blossom = false) {
  const g = new THREE.Group();
  g.add(cyl(0.28*s, 0.4*s, 2.6*s, 0x7a4a21, 0, 1.3*s, 0));
  const c = blossom ? 0xf7a8c4 : 0x3e9e4f;
  const c2 = blossom ? 0xfbc2d6 : 0x55b963;
  g.add(sph(2.1*s, c, 0, 4.2*s, 0)); g.add(sph(1.5*s, c2, 1.3*s, 3.4*s, 0.4*s)); g.add(sph(1.4*s, c2, -1.3*s, 3.5*s, -0.3*s));
  g.position.set(x, 0, z); world.add(g); return g;
}
function pine(x, z, s = 1) {
  const g = new THREE.Group(); g.add(cyl(0.25*s,0.35*s,3*s,0x5d3a1a,0,1.5*s,0));
  g.add(cone(2.2*s, 3.4*s, 0x2e7d32, 0, 4.6*s, 0, 10)); g.add(cone(1.6*s, 2.6*s, 0x388e3c, 0, 6.6*s, 0, 10));
  g.position.set(x,0,z); world.add(g); return g;
}

// ---------- 1. Nobi House 野比家 ----------
{
  const g = japaneseHouse({ wall: 0xf7ecd0, roof: 0x64798a, floors: 2 });
  // Nobita's 2F room is famously on the side facing the street; add balcony-like window + curtain color
  g.add(box(2.2, 1.5, 0.15, 0xffe36e, 2.8, 5.6, 4.58));
  // nameplate & mailbox & Doraemon bell sign
  const plate = signBoard('野比 のび', 3.2, '#ffffff', '#222222', 52); plate.position.set(-3.6, 1.6, 7.15); g.add(plate);
  g.add(box(0.9, 0.7, 0.5, 0xc0392b, -4.6, 1.0, 6.8));
  // garden tree & laundry pole (very Showa-home)
  g.add(cyl(0.08,0.08,3.4,0x999999, -5,1.7,-2)); g.add(box(4,0.08,0.08,0x999999,-3,3.3,-2));
  const shirt = box(0.9,1.1,0.08,0xffe36e,-3.8,2.7,-2); g.add(shirt);
  g.position.set(2, 0, -18); world.add(g);
  tree( -6, -24, 0.9); tree(10, -12, 0.8);
  registerLandmark(g, { id:'nobi', emoji:'🏠', title:'野比家', ja:'野比家 のびたくんの家', color:'#e67e22', desc:'大雄和哆啦A梦的家。二楼是大雄的房间，哆啦A梦睡在壁橱里，任意门、时光机抽屉都在这里。妈妈野比玉子常在门口喊大雄回家吃饭，院子是昭和一户建的经典样式。' }, new THREE.Vector3(2, 13.5, -18));
}
// ---------- 2. Shizuka House 源家 ----------
{
  const g = japaneseHouse({ wall: 0xfdf3f3, roof: 0xb65d6a, floors: 2, w: 12, d: 10 });
  g.add(box(12.6, 0.5, 1.2, 0xffffff, 0, 3.6, 5.2));
  const plate = signBoard('源 みなもと', 3.4, '#fff0f3', '#8e2f3a', 48); plate.position.set(-4, 1.6, 7.6); g.add(plate);
  // piano hint: black box visible + roses
  for (let i=0;i<5;i++) g.add(sph(0.32, 0xe91e63, -5+i*1.1, 0.6, 6.9));
  g.position.set(38, 0, -18); g.rotation.y = -0.08; world.add(g);
  tree(30, -24, 1, true);
  registerLandmark(g, { id:'shizuka', emoji:'🎻', title:'源静香家', ja:'源静香の家', color:'#e91e63', desc:'静香的家，优雅的二层洋风住宅。静香常在这里练小提琴和钢琴、做点心，大雄最爱来玩——也最怕被邀请听小提琴演奏。门前的玫瑰是原作的细节。' }, new THREE.Vector3(38, 14, -18));
}
// ---------- 3. Suneo Mansion 骨川家 ----------
{
  const g = new THREE.Group();
  g.add(box(20, 9, 13, 0xf5efe0, 0, 4.5, 0));
  g.add(box(21.5, 0.6, 14.5, 0x8b1a1a, 0, 9.3, 0));
  const roof = cone(15, 4, 0x8b1a1a, 0, 11.5, 0, 4); roof.rotation.y = Math.PI/4; roof.scale.set(1.35,1,0.9); g.add(roof);
  g.add(box(5, 5, 1, 0xffffff, 0, 2.5, 6.6)); // portico
  g.add(cyl(0.35,0.35,5,0xffffff,-2.2,2.5,7.2)); g.add(cyl(0.35,0.35,5,0xffffff,2.2,2.5,7.2));
  for (let i=-3;i<=3;i++) g.add(box(1.8,2.2,0.15,0xbfe6ff, i*2.6, 6.5, 6.58));
  // gate + wall + luxury car
  g.add(box(24, 2.2, 0.4, 0xd9c9a8, 0, 1.1, 10)); g.add(box(0.4,2.2,20,0xd9c9a8,-12,1.1,0)); g.add(box(0.4,2.2,20,0xd9c9a8,12,1.1,0));
  const car = new THREE.Group(); car.add(box(4.6,0.9,2,0x1a3a6b,0,0.7,0)); car.add(box(2.6,0.8,1.8,0x87c5e8,0,1.5,0));
  car.children.forEach(c=>{}); [-1.5,1.5].forEach(x=>[-0.95,0.95].forEach(z=>{ const w=cyl(0.42,0.42,0.25,0x111111,x,0.42,z); w.rotation.x=Math.PI/2; car.add(w);} ));
  car.position.set(5,0,8.5); g.add(car);
  const plate = signBoard('骨川 ほねかわ', 4, '#222','#ffd700', 44); plate.position.set(-7,2.8,10.25); g.add(plate);
  g.position.set(72, 0, -52); world.add(g);
  pine(58,-42,1.1); pine(86,-42,1.1);
  registerLandmark(g, { id:'suneo', emoji:'💎', title:'骨川小夫家', ja:'骨川スネ夫の家', color:'#7b1fa2', desc:'小夫的豪宅，镇上最气派的房子：大门、围墙、罗马柱门廊和私家车一应俱全。小夫总在这里炫耀新玩具、游戏和表哥送的礼物，然后故意不邀请大雄。' }, new THREE.Vector3(72, 16, -52));
}
// ---------- 4. Gian House + Shop 刚田商店 ----------
{
  const g = new THREE.Group();
  g.add(box(13, 6.5, 10, 0xf0d9a8, 0, 3.25, 0));
  g.add(box(14, 0.4, 11, 0x6d4c2f, 0, 6.7, 0));
  g.add(box(8, 3.5, 6, 0xe8cfa0, 0, 8.4, 0)); // 2F living part
  g.add(box(9, 0.35, 7, 0x6d4c2f, 0, 10.3, 0));
  // shop awning (orange striped, iconic)
  const awn = box(11, 0.18, 3, 0xff7f2a, 0, 3.6, 6.2); awn.rotation.x = 0.25; g.add(awn);
  const sign = signBoard('剛田商店', 7, '#fff8dc', '#c0392b', 64); sign.position.set(0, 5.2, 5.08); g.add(sign);
  const sign2 = signBoard('ゴーダ 商店 · 杂货', 6, '#c0392b', '#ffffff', 40); sign2.position.set(0, 4.3, 5.08); g.add(sign2);
  // crates & goods outside
  g.add(box(1.4,1.0,1.0,0xd35400,-4.5,0.5,5.8)); g.add(box(1.2,0.8,0.9,0x27ae60,-2.8,0.4,5.9)); g.add(box(1.2,1.4,0.8,0x2980b9,4.6,0.7,5.7));
  g.position.set(44, 0, 18); world.add(g);
  registerLandmark(g, { id:'gian', emoji:'🎤', title:'刚田家 · 胖虎商店', ja:'剛田商店 ジャイアンの家', color:'#e67e22', desc:'胖虎（刚田武）家开的杂货店，橙色遮阳棚是标志。胖虎妈妈嗓门极大，胖虎常被叫去看店送货——他那“天籁之音”演唱会，门票就是从这里强行发出的。' }, new THREE.Vector3(44, 14.5, 18));
}
// ---------- 5. VACANT LOT 空地 (most iconic) ----------
{
  const g = new THREE.Group();
  const dirt = cyl(17, 17, 0.25, 0xd9b77c, 0, 0.12, 0, 36); dirt.castShadow=false; g.add(dirt);
  // three concrete pipes 土管: 2 bottom + 1 top, hollow look with dark inner circle
  const pipeMat = M(0xbdbdbd, { roughness: 0.95 });
  function pipe(x, y, z) {
    const p = new THREE.Group();
    const outer = new THREE.Mesh(new THREE.CylinderGeometry(1.85, 1.85, 3.6, 28, 1, true), pipeMat);
    outer.rotation.z = Math.PI/2; outer.castShadow = true; p.add(outer);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(1.85, 0.16, 10, 28), pipeMat); rim.rotation.y = Math.PI/2; rim.position.x = 1.8; p.add(rim);
    const rim2 = rim.clone(); rim2.position.x = -1.8; p.add(rim2);
    const inner = new THREE.Mesh(new THREE.CircleGeometry(1.68, 28), new THREE.MeshStandardMaterial({ color: 0x3a3a3a }));
    inner.rotation.y = -Math.PI/2; inner.position.x = 1.79; p.add(inner);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(1.72,1.72,3.55,28), M(0x9e9e9e)); cap.rotation.z=Math.PI/2; cap.scale.set(1,1,0.98); // subtle body
    cap.position.x=0; // keep behind outer? make it slightly smaller and semi: use as shading
    p.position.set(x,y,z); return p;
  }
  // classic stack
  const p1 = pipe(0, 1.95, 0); const p2 = pipe(0, 1.95, 3.85); const p3 = pipe(0, 5.35, 1.92);
  // Rotate pipes so axis runs front-back like anime (opening faces street)
  [p1,p2,p3].forEach(p=>{ p.rotation.y = Math.PI/2; });
  g.add(p1,p2,p3);
  // weeds, stones, baseball bat/ball, wooden fence, log
  for (let i=0;i<14;i++) g.add(cone(0.35, 0.9, 0x6aa84f, -14+Math.random()*28, 0.5, -12+Math.random()*24, 6));
  g.add(cyl(0.35,0.35,5,0x8b5a2b, -8,0.4,6)); g.children[g.children.length-1].rotation.z = Math.PI/2;
  const bat = cyl(0.09,0.13,2.4,0xd9a441, 6,0.25,-5); bat.rotation.z=1.2; g.add(bat); g.add(sph(0.28,0xffffff,6.8,0.28,-4));
  for (let i=-2;i<=2;i++) g.add(box(0.25,1.4,2.2,0xa67c52, i*4.2,0.7,-14.5));
  g.add(box(22,0.25,0.25,0xa67c52,0,1.25,-14.5));
  // Anywhere Door 任意门 standing on the lot!
  const door = new THREE.Group();
  door.add(box(2.4,4.4,0.25,0xff6fa5,0,2.2,0)); door.add(box(2.0,3.9,0.1,0xff8fb8,0,2.2,0.16));
  door.add(sph(0.14,0xffd400,0.75,2.2,0.25)); door.position.set(9,0.25,-7); door.rotation.y=-0.5; g.add(door);
  g.position.set(-12, 0, 12); world.add(g);
  registerLandmark(g, { id:'kuchi', emoji:'🛢️', title:'空地', ja:'空き地 ドカン', color:'#0096e6', desc:'全镇最重要的一块地！三根水泥土管叠放在这里，大雄和朋友们放学后在此打棒球、踢球、开胖虎演唱会、商量冒险。哆啦A梦的任意门也常常直接立在空地上——本场景特意还原了这一幕。' }, new THREE.Vector3(-12, 11, 12));
}

// ---------- 6. School 月见台小学 ----------
{
  const g = new THREE.Group();
  // main 3-storey building
  g.add(box(46, 13, 11, 0xf7f3e6, 0, 6.5, 0));
  g.add(box(47.5, 0.7, 12.5, 0x7a8a99, 0, 13.3, 0));
  for (let fl=0; fl<3; fl++) for (let i=-5;i<=5;i++) g.add(box(2.6,2.0,0.15,0x9fd4e8, i*3.9, 3.2+fl*4.1, 5.58));
  // clock tower centre (anime schools always have it)
  g.add(box(7, 17, 7, 0xffffff, 0, 8.5, 0));
  g.add(cone(5.2, 3.6, 0xc0392b, 0, 18.8, 0, 4)).children;
  g.children[g.children.length-1].rotation.y = Math.PI/4;
  const clockFace = cyl(1.9,1.9,0.3,0xffffff,0,14.8,3.6); clockFace.rotation.x=Math.PI/2; g.add(clockFace);
  const clockRing = new THREE.Mesh(new THREE.TorusGeometry(1.9,0.18,8,32), M(0x333333)); clockRing.position.set(0,14.8,3.75); g.add(clockRing);
  // entrance + name
  g.add(box(8,4.5,2,0xe8e0cc,0,2.25,6)); const nm = signBoard('月見台小学校', 11, '#ffffff', '#1a4a73', 56); nm.position.set(0,11.8,5.65); g.add(nm);
  // gym
  const gym = new THREE.Group(); gym.add(box(18,7,12,0xdde8ee,0,3.5,0)); gym.add(cone(11,3,0x5a7a8a,0,8.5,0,4)); gym.children[1].rotation.y=Math.PI/4; gym.position.set(34,0,2); g.add(gym);
  // school yard + track + cherry trees + gate
  const yard = box(56,0.15,30,0xe2c98f,0,0.08,22); yard.castShadow=false; g.add(yard);
  const gate = new THREE.Group(); gate.add(box(0.6,3.2,0.6,0x888888,-5,1.6,0)); gate.add(box(0.6,3.2,0.6,0x888888,5,1.6,0)); gate.add(box(11,0.5,0.5,0x888888,0,3.2,0)); gate.position.set(0,0,36); g.add(gate);
  const pool = box(16,0.6,8,0x29b6f6,-18,0.3,-10); g.add(pool);
  g.position.set(-62, 0, -62); world.add(g);
  for (let i=0;i<6;i++) tree(-92+i*11, -42, 1.05, true);
  tree(-28,-58,1,true); tree(-96,-70,1,true);
  registerLandmark(g, { id:'school', emoji:'🏫', title:'月见台小学', ja:'月見台小学校', color:'#2e7d32', desc:'大雄、静香、胖虎、小夫和出木杉就读的学校。白色三层教学楼、中央钟楼、宽阔的操场和成排的樱花树——大雄经常迟到狂奔、被老师罚站走廊的地方，游泳池在夏天出场率极高。' }, new THREE.Vector3(-62, 22, -62));
}
// ---------- 7. Urayama 后山 ----------
{
  const g = new THREE.Group();
  const hill = cone(42, 20, 0x5da85f, 0, 10, 0, 24); hill.scale.set(1.3,1,1); g.add(hill);
  const hill2 = cone(28, 14, 0x6fbf6a, 22, 7, 10, 20); g.add(hill2);
  // dirt path spiralling up (simple stepped boxes)
  for (let i=0;i<7;i++) g.add(box(5-i*0.3, 0.4, 3, 0xc9a86a, -18+i*4.5, 1.2+i*1.9, 14-i*2.6));
  // small shrine on top + big camphor tree (secret base)
  g.add(box(3.4,2.4,2.6,0x8b3a2a,0,20.6,0)); g.add(box(4.4,0.35,3.4,0x333333,0,22,0));
  g.add(sph(5,0x2e7d32, -6,23,-4)); g.add(cyl(0.5,0.7,6,0x5d3a1a,-6,20,-4));
  g.position.set(-78, 0, -108); world.add(g);
  for (let i=0;i<10;i++) pine(-110+Math.random()*60, -122+Math.random()*22, 0.9+Math.random()*0.5);
  registerLandmark(g, { id:'urayama', emoji:'⛰️', title:'后山（里山）', ja:'裏山 うらやま', color:'#2e7d32', desc:'学校后面的山丘，孩子们的秘密基地与冒险舞台：抓昆虫、躲胖虎、看星星、埋时间胶囊都发生在这里。山顶的小祠堂和大樟树是原作动画里反复出现的构图。' }, new THREE.Vector3(-78, 30, -108));
}
// ---------- 8. Park 公园 ----------
{
  const g = new THREE.Group();
  const lawn = cyl(19,19,0.22,0x7fc46a,0,0.11,0,36); lawn.castShadow=false; g.add(lawn);
  // fountain
  g.add(cyl(4.2,4.6,0.9,0xd9d9d9,0,0.45,0)); g.add(cyl(3.7,3.7,0.35,0x4fc3f7,0,0.95,0));
  g.add(cyl(0.35,0.5,2.4,0xbbbbbb,0,1.8,0)); g.add(sph(0.55,0xbbbbbb,0,3.2,0));
  window.__fountain = g;
  // slide + swings + benches + sandbox
  const slide = new THREE.Group(); slide.add(box(0.9,0.18,4.6,0xe74c3c,0,1.4,0)); slide.children[0].rotation.x=0.55; slide.add(box(1.4,2.4,1.2,0xf1c40f,-0,1.2,-2.2)); slide.position.set(10,0,7); slide.rotation.y=0.7; g.add(slide);
  for (let s=-1;s<=1;s+=2){ const sw=new THREE.Group(); sw.add(box(0.18,2.6,0.18,0x555555,-1.1,1.3,0)); sw.add(box(0.18,2.6,0.18,0x555555,1.1,1.3,0)); sw.add(box(2.6,0.18,0.18,0x555555,0,2.6,0)); sw.add(box(1.1,0.1,0.45,0x2980b9,0,0.75,0)); sw.position.set(s*9,0,-8); g.add(sw); }
  for (let i=0;i<3;i++){ const b=box(2.6,0.15,0.7,0x8b5a2b, -6+i*6,0.65,12); g.add(b); g.add(box(2.6,0.7,0.12,0x8b5a2b,-6+i*6,1.05,12.35)); }
  g.add(box(5,0.5,4,0xf2d38a,-11,0.25,11));
  g.position.set(-62, 0, 22); world.add(g);
  tree(-74,8,1.1); tree(-50,36,1.1); tree(-76,34,0.9,true);
  registerLandmark(g, { id:'park', emoji:'⛲', title:'公园', ja:'公園', color:'#00897b', desc:'带喷泉、滑梯和秋千的街区公园。大雄放学常绕路来这里发呆，出木杉和静香看书的长椅也在。喷泉在夜里会亮灯。' }, new THREE.Vector3(-62, 11, 22));
}
// ---------- 9. Shrine 神社 ----------
{
  const g = new THREE.Group();
  // torii
  const toriiMat = 0xd93a22;
  g.add(box(9,0.7,0.7,toriiMat,0,5.4,0)); g.add(box(7.4,0.55,0.55,toriiMat,0,4.3,0));
  g.add(cyl(0.42,0.48,5.4,toriiMat,-3.2,2.7,0)); g.add(cyl(0.42,0.48,5.4,toriiMat,3.2,2.7,0));
  for (let i=0;i<5;i++) g.add(box(5,0.28,1.8,0xbdbdbd,0,0.14+i*0.28,4-i*0.1)); // steps approx
  g.add(box(7,3.6,6,0x6d4c2f,0,3.4,-6)); g.add(cone(5.8,2.6,0x37474f,0,6.5,-6,4)).children; g.children[g.children.length-1].rotation.y=Math.PI/4;
  g.add(cyl(0.3,0.4,1.6,0x9e9e9e,-3.4,0.8,-2)); g.add(cyl(0.3,0.4,1.6,0x9e9e9e,3.4,0.8,-2));
  g.position.set(-72, 1.5, 62); world.add(g); world.add(box(16,1.5,16,0x8a9a5b,-72,0.7,62));
  registerLandmark(g, { id:'shrine', emoji:'⛩️', title:'神社', ja:'神社', color:'#c62828', desc:'小镇神社，红色鸟居和石灯笼，新年参拜、夏日祭典和求考试合格都在这里。大雄每次大考前都来这里临时抱佛脚。' }, new THREE.Vector3(-72, 12, 62));
}
// ---------- 10. Shopping street 商店街 ----------
const shopDefs = [
  ['🍞 面包房','パン屋',0xf7c873],['📚 本屋 书店','本屋',0x90caf9],['🧸 玩具店','おもちゃ屋',0xf48fb1],
  ['🍜 拉面店','ラーメン',0xffab91],['✏️ 文具店','文房具屋',0xa5d6a7],['🍰 蛋糕店','ケーキ屋',0xce93d8]
];
shopDefs.forEach(([cn, jp, col], i) => {
  const g = new THREE.Group();
  g.add(box(10, 5.5, 8, 0xffffff, 0, 2.75, 0));
  g.add(box(10.6, 1.6, 8.6, col, 0, 6.3, 0));
  const s = signBoard(cn, 7.5, '#ffffff', '#333333', 40); s.position.set(0, 4.1, 4.06); g.add(s);
  g.add(box(8.6, 2.2, 0.15, 0xbfe6ff, 0, 1.4, 4.03));
  g.position.set(-28 + i * 13.5, 0, 52); world.add(g);
  if (i === 1) registerLandmark(g, { id:'shops', emoji:'🛍️', title:'商店街', ja:'商店街', color:'#5e35b1', desc:'月见台商店街：面包房、本屋（大雄买漫画的地方）、玩具店、拉面店、文具店和蛋糕店一字排开。大雄的零用钱几乎都交代在这里。' }, new THREE.Vector3(8, 11, 52));
});
// Filler houses (residential fabric of the town)
const fillerCols = [[0xf3e9d2,0x5a6b7d],[0xddeef5,0x7a5a48],[0xfdebd0,0x8a6d3b],[0xe8f0d8,0x556b2f],[0xf5e0e6,0x795548],[0xfff3e0,0x455a64]];
const fillerPos = [[-28,-18],[-28,-32],[58,-18],[58,-32],[-38,52+14],[-14,-52],[8,-52],[30,-52],[-38,-52],[90,-18],[90,14],[-92,22-28],[14,62],[-28,62],[62,62],[86,52],[-100,-30],[-100,52]];
fillerPos.forEach(([x,z], i) => {
  const [wall, roof] = fillerCols[i % fillerCols.length];
  const h = japaneseHouse({ wall, roof, floors: i % 3 === 0 ? 1 : 2, w: 9 + (i % 3), d: 8 + (i % 2) });
  h.position.set(x, 0, z); h.rotation.y = (i % 4) * 0.06 - 0.09; world.add(h);
});
// Street lamps
const lampLights = [];
function lamp(x, z) {
  const g = new THREE.Group(); g.add(cyl(0.09,0.12,4.6,0x444444,0,2.3,0)); g.add(sph(0.32,0xfff9c4,0,4.7,0));
  const pl = new THREE.PointLight(0xffd98a, 0, 16); pl.position.set(0,4.7,0); g.add(pl); lampLights.push(pl);
  g.position.set(x,0,z); world.add(g);
}
[[24,32],[12,32],[-10,32],[24,-6],[-50,32],[50,32],[18,68],[-20,-32],[48,-32]].forEach(([x,z])=>lamp(x,z));

// ---------- Characters ----------
// Doraemon (low-poly but unmistakable: blue, white belly/face, red nose/collar, golden bell)
function makeDoraemon(scale = 1) {
  const g = new THREE.Group();
  const blue = 0x00a0e9;
  g.add(sph(1.05*scale, blue, 0, 1.55*scale, 0));                    // head
  g.add(sph(0.82*scale, 0xffffff, 0, 1.42*scale, 0.28*scale));      // face
  g.add(sph(0.92*scale, blue, 0, 0.55*scale, 0));                    // body
  g.add(sph(0.62*scale, 0xffffff, 0, 0.55*scale, 0.38*scale));      // belly
  // 4D pocket
  const pocket = cyl(0.34*scale,0.34*scale,0.08*scale,0xffffff,0,0.62*scale,0.92*scale); pocket.rotation.x=Math.PI/2; g.add(pocket);
  g.add(sph(0.11*scale, 0xff0000, 0, 1.62*scale, 1.02*scale));      // nose
  g.add(sph(0.13*scale, 0x111111, -0.32*scale, 1.85*scale, 0.78*scale));
  g.add(sph(0.13*scale, 0x111111,  0.32*scale, 1.85*scale, 0.78*scale));
  const collar = cyl(1.0*scale,1.0*scale,0.18*scale,0xe60012,0,1.02*scale,0); g.add(collar);
  g.add(sph(0.20*scale, 0xffd400, 0, 0.88*scale, 0.92*scale, { metalness:0.6, roughness:0.25 })); // bell
  g.add(sph(0.30*scale, 0xffffff, -0.95*scale, 0.62*scale, 0)); g.add(sph(0.30*scale, 0xffffff, 0.95*scale, 0.62*scale, 0)); // hands
  g.add(sph(0.34*scale, 0xffffff, -0.42*scale, 0.08*scale, 0.15*scale)); g.add(sph(0.34*scale, 0xffffff, 0.42*scale, 0.08*scale, 0.15*scale)); // feet
  const tail = sph(0.16*scale, 0xe60012, 0, 0.55*scale, -0.92*scale); g.add(tail);
  // takecopter on head (spinning in animate)
  const copter = new THREE.Group();
  copter.add(cyl(0.05*scale,0.05*scale,0.35*scale,0xffd400,0,0.15*scale,0));
  const blade = box(1.5*scale,0.05*scale,0.22*scale,0xffd400,0,0.34*scale,0); copter.add(blade);
  copter.position.set(0,2.6*scale,0); g.add(copter); g.userData.copter = copter;
  return g;
}
function makeKid({ shirt=0xffe36e, pants=0x2456a6, skin=0xffd7b0, hair=0x222222, scale=1 }={}) {
  const g = new THREE.Group();
  g.add(box(0.95*scale,1.05*scale,0.5*scale,shirt,0,1.15*scale,0));
  g.add(box(0.85*scale,0.62*scale,0.48*scale,pants,0,0.42*scale,0));
  g.add(sph(0.52*scale, skin, 0, 2.05*scale, 0));
  const cap = sph(0.54*scale, hair, 0, 2.18*scale, -0.06*scale); cap.scale.y=0.65; g.add(cap);
  g.add(box(0.22*scale,0.85*scale,0.22*scale,skin,-0.62*scale,1.2*scale,0)); g.add(box(0.22*scale,0.85*scale,0.22*scale,skin,0.62*scale,1.2*scale,0));
  return g;
}
const dora = makeDoraemon(1.15); dora.position.set(-9, 0.3, 8); dora.rotation.y = 0.7; scene.add(dora);
const nobita = makeKid({}); nobita.position.set(-14.5, 0.25, 15); nobita.rotation.y = -0.6; scene.add(nobita);
const shizukaKid = makeKid({ shirt:0xff8fb8, pants:0xd93a5a, hair:0x3a2314 }); shizukaKid.position.set(36, 0, -10); scene.add(shizukaKid);
const gianKid = makeKid({ shirt:0xff7f2a, pants:0x5d4037, scale:1.3 }); gianKid.position.set(41, 0, 13); scene.add(gianKid);
const suneoKid = makeKid({ shirt:0x7ed6c5, pants:0x37474f, hair:0x111111 }); suneoKid.position.set(-6, 0.25, 18); scene.add(suneoKid);
// Doraemon at Nobi house doorway too (small)
const dora2 = makeDoraemon(0.9); dora2.position.set(4.5, 0, -11.5); scene.add(dora2);

// ---------- Sky: anime clouds, sun disc, birds ----------
const clouds = [];
function cloud(x, y, z, s=1) {
  const g = new THREE.Group(); const cm = new THREE.MeshStandardMaterial({ color:0xffffff, roughness:1, emissive:0xffffff, emissiveIntensity:0.25 });
  [[0,0,0,3.2],[2.6,-0.3,0,2.3],[-2.6,-0.2,0,2.1],[0.8,0.7,0,2.0]].forEach(([a,b,c,r])=>{ const m=new THREE.Mesh(new THREE.SphereGeometry(r,18,12),cm); m.position.set(a,b,c); m.scale.y=0.55; g.add(m); });
  g.position.set(x,y,z); g.scale.setScalar(s); scene.add(g); clouds.push(g); return g;
}
for (let i=0;i<9;i++) cloud(-160+Math.random()*320, 42+Math.random()*22, -140+Math.random()*240, 1.4+Math.random()*1.6);
// Distant mountains silhouette (like anime background art)
for (let i=0;i<5;i++){ const mt=cone(38,26,0x7aa8c9,-170+i*85,13,-175,7); mt.material = M(0x7aa8c9,{flatShading:true}); scene.add(mt); }

// Moving car + tram on river road
const car2 = new THREE.Group(); car2.add(box(4.4,1.0,1.9,0xe74c3c,0,0.75,0)); car2.add(box(2.4,0.85,1.7,0xbfe6ff,0,1.6,0));
[-1.4,1.4].forEach(x=>[-0.9,0.9].forEach(z=>{ const w=cyl(0.4,0.4,0.22,0x111,x,0.4,z); w.rotation.x=Math.PI/2; car2.add(w); })); scene.add(car2);
const tram = new THREE.Group(); tram.add(box(13,3.2,3,0x2e9e6b,0,2.1,0)); tram.add(box(13.2,0.5,3.2,0xf5f5f5,0,3.9,0));
for (let i=-2;i<=2;i++) tram.add(box(1.8,1.4,0.12,0xd6f2ff,i*2.4,2.5,1.56)); tram.position.set(-90,0,72); scene.add(tram);
// rails for tram road area
world.add(box(340,0.08,0.3,0x888888,0,0.2,70.6)); world.add(box(340,0.08,0.3,0x888888,0,0.2,73.8));

// Cherry petals particles
const petalCount = 420;
const petalGeo = new THREE.BufferGeometry();
const petalPos = new Float32Array(petalCount*3); const petalSeed = [];
for (let i=0;i<petalCount;i++){ petalPos[i*3]=-110+Math.random()*220; petalPos[i*3+1]=Math.random()*28; petalPos[i*3+2]=-120+Math.random()*200; petalSeed.push(Math.random()*Math.PI*2); }
petalGeo.setAttribute('position', new THREE.BufferAttribute(petalPos,3));
const petals = new THREE.Points(petalGeo, new THREE.PointsMaterial({ color:0xffb7d1, size:0.55, transparent:true, opacity:0.9 }));
scene.add(petals);
// Fountain droplets
const dropCount=120; const dropGeo=new THREE.BufferGeometry(); const dropPos=new Float32Array(dropCount*3);
for (let i=0;i<dropCount;i++){ const a=Math.random()*Math.PI*2, r=Math.random()*2.6; dropPos[i*3]=-62+Math.cos(a)*r; dropPos[i*3+1]=1+Math.random()*3.4; dropPos[i*3+2]=22+Math.sin(a)*r; }
dropGeo.setAttribute('position', new THREE.BufferAttribute(dropPos,3));
const drops = new THREE.Points(dropGeo, new THREE.PointsMaterial({ color:0x9be2ff, size:0.28, transparent:true, opacity:0.85 })); scene.add(drops);

// ---------- UI: landmarks, info card, raycast ----------
const LANDMARK_DATA = landmarks.map(l=>({id:l.id, emoji:l.emoji, title:l.title, ja:l.ja, desc:l.desc, pos:l.group.position}));
const listEl = document.getElementById('landmarkList');
const infoCard = document.getElementById('infoCard');
function showInfo(d){ document.getElementById('infoEmoji').textContent=d.emoji; document.getElementById('infoTitle').textContent=d.title; document.getElementById('infoJa').textContent=d.ja; document.getElementById('infoDesc').textContent=d.desc; infoCard.classList.remove('hidden'); }
document.getElementById('closeCard').onclick=()=>infoCard.classList.add('hidden');
let camAnim = null;
function flyTo(pos, dist=26, height=18){
  const target = new THREE.Vector3(pos.x, 2, pos.z);
  const dest = new THREE.Vector3(pos.x+dist*0.7, height, pos.z+dist);
  camAnim = { fromT: controls.target.clone(), toT: target, fromC: camera.position.clone(), toC: dest, t:0 };
}
LANDMARK_DATA.forEach(d=>{
  const b=document.createElement('button'); b.textContent=`${d.emoji} ${d.title}`; b.onclick=()=>{ flyTo(d.pos); showInfo(d); stopTour(); }; listEl.appendChild(b);
});
const ray = new THREE.Raycaster(); const ptr = new THREE.Vector2();
let downAt=0;
canvas.addEventListener('pointerdown',()=>downAt=Date.now());
canvas.addEventListener('pointerup',e=>{
  if (Date.now()-downAt>220) return;
  ptr.x=(e.clientX/innerWidth)*2-1; ptr.y=-(e.clientY/innerHeight)*2+1; ray.setFromCamera(ptr,camera);
  const hits=ray.intersectObjects(landmarks.map(l=>l.group),true);
  if (hits.length){ let o=hits[0].object; while(o && !o.userData.landmark) o=o.parent; const root=hits[0].object.userData.landmarkRoot; if(root){ showInfo(root.userData.landmark); } }
});

// Day / night
let isNight=false;
const btnDN=document.getElementById('btnDayNight');
btnDN.onclick=()=>{
  isNight=!isNight;
  btnDN.textContent=isNight?'☀️ 白天模式':'🌙 夜晚模式'; btnDN.classList.toggle('active',isNight);
  scene.background=new THREE.Color(isNight?0x101c34:0x87c5e8);
  scene.fog.color=new THREE.Color(isNight?0x16233f:0xa8d4f0);
  sun.intensity=isNight?0.25:2.2; sun.color=new THREE.Color(isNight?0x8fb6ff:0xfff2cc);
  hemi.intensity=isNight?0.28:0.95; ambientNight.intensity=isNight?0.5:0;
  lampLights.forEach(l=>l.intensity=isNight?2.4:0);
  windowMats.forEach(m=>{ m.emissive=new THREE.Color(isNight?0xffc766:0x000000); m.emissiveIntensity=isNight?1.4:0; });
};
// Labels toggle
let labelsOn=true; const btnLab=document.getElementById('btnLabels');
btnLab.onclick=()=>{ labelsOn=!labelsOn; labelGroup.visible=labelsOn; btnLab.classList.toggle('active',labelsOn); };
// Tour
const tourOrder=['kuchi','nobi','shizuka','school','urayama','gian','suneo','park','shrine','shops'];
let touring=false, tourIdx=0, tourTimer=0;
const btnTour=document.getElementById('btnTour');
function stopTour(){ touring=false; btnTour.textContent='▶ 自动巡游'; btnTour.classList.remove('active'); }
btnTour.onclick=()=>{ if(touring){stopTour();return;} touring=true; tourIdx=0; tourTimer=0; btnTour.textContent='⏸ 停止巡游'; btnTour.classList.add('active'); const d=LANDMARK_DATA.find(x=>x.id===tourOrder[0]); flyTo(d.pos,30,20); showInfo(d); };

// ---------- Animate ----------
const clockT = new THREE.Clock();
function animate(){
  requestAnimationFrame(animate);
  const dt=Math.min(clockT.getDelta(),0.05); const t=clockT.elapsedTime;
  // camera fly animation
  if (camAnim){ camAnim.t+=dt/1.6; const k=camAnim.t>=1?1:(1-Math.pow(1-camAnim.t,3)); camera.position.lerpVectors(camAnim.fromC,camAnim.toC,k); controls.target.lerpVectors(camAnim.fromT,camAnim.toT,k); if(camAnim.t>=1) camAnim=null; }
  if (touring && !camAnim){ tourTimer+=dt; if(tourTimer>4.2){ tourTimer=0; tourIdx=(tourIdx+1)%tourOrder.length; const d=LANDMARK_DATA.find(x=>x.id===tourOrder[tourIdx]); flyTo(d.pos,30,20); showInfo(d); } }
  controls.update();
  clouds.forEach((c,i)=>{ c.position.x+=dt*(0.7+i*0.07); if(c.position.x>190) c.position.x=-190; });
  dora.position.y=0.3+Math.sin(t*2.2)*0.14; if(dora.userData.copter) dora.userData.copter.rotation.y+=dt*22;
  dora2.rotation.y=Math.sin(t*0.8)*0.5;
  nobita.rotation.y=-0.6+Math.sin(t*1.4)*0.18;
  // car loops east-west on shopping street road
  car2.position.set(-150+((t*14)%300), 0, 34.2); car2.rotation.y=0;
  tram.position.x=-140+((t*9)%280); tram.position.z=72;
  // river shimmer
  river.material.color.setHSL(0.54,0.62, isNight?0.22:0.52+Math.sin(t*1.5)*0.03);
  // petals fall & sway
  const pa=petalGeo.attributes.position.array;
  for (let i=0;i<petalCount;i++){ pa[i*3+1]-=dt*(0.9+(i%5)*0.14); pa[i*3]+=Math.sin(t*1.6+petalSeed[i])*dt*1.1; if(pa[i*3+1]<0.2){ pa[i*3+1]=26+Math.random()*6; pa[i*3]=-110+Math.random()*220; } }
  petalGeo.attributes.position.needsUpdate=true;
  const da=dropGeo.attributes.position.array;
  for (let i=0;i<dropCount;i++){ da[i*3+1]+=dt*2.2; if(da[i*3+1]>4.6) da[i*3+1]=1.1; }
  dropGeo.attributes.position.needsUpdate=true;
  renderer.render(scene,camera);
}
animate();
addEventListener('resize',()=>{ camera.aspect=innerWidth/innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth,innerHeight); });
setTimeout(()=>document.getElementById('loading').classList.add('done'), 650);
// default welcome card
showInfo(LANDMARK_DATA.find(d=>d.id==='kuchi'));
