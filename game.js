(function(){
"use strict";

/* ======================= DATA ======================= */
// hardness: nivel mínimo de pico necesario para poder picarlo (0=Madera .. 5=Mítico).
// Si tu pico actual tiene un maxHardness menor a la dureza del mineral, no le hacés nada.
const ORES = {
  stone:    {name:'Piedra',      color:0x8a8a86, health:1,   value:1,    glow:false, hardness:0},
  coal:     {name:'Carbón',      color:0x2b2b2e, health:2,   value:3,    glow:false, hardness:0},
  copper:   {name:'Cobre',       color:0xc97a4a, health:3,   value:7,    glow:false, hardness:0},
  iron:     {name:'Hierro',      color:0xb8b0a4, health:5,   value:15,   glow:false, hardness:1},
  silver:   {name:'Plata',       color:0xd7d9dc, health:6,   value:22,   glow:false, hardness:1},
  gold:     {name:'Oro',         color:0xffd23f, health:8,   value:40,   glow:true,  hardness:2},
  platinum: {name:'Platino',     color:0xe4ddc8, health:10,  value:60,   glow:true,  hardness:2},
  ruby:     {name:'Rubí',        color:0xff4f6d, health:13,  value:95,   glow:true,  hardness:3},
  sapphire: {name:'Zafiro',      color:0x4f8bff, health:16,  value:150,  glow:true,  hardness:3},
  amethyst: {name:'Amatista',    color:0x9b6bff, health:18,  value:190,  glow:true,  hardness:3},
  emerald:  {name:'Esmeralda',   color:0x3ddc84, health:22,  value:260,  glow:true,  hardness:4},
  opal:     {name:'Ópalo',       color:0xb8e8d8, health:26,  value:340,  glow:true,  hardness:4},
  diamond:  {name:'Diamante',    color:0x7df9ff, health:30,  value:450,  glow:true,  hardness:4},
  mythic:   {name:'Mítico',      color:0xff5cf0, health:50,  value:2500, glow:true,  hardness:5},
  voidstone:{name:'Piedra Vacía',color:0x6a1fb8, health:65,  value:4200, glow:true,  hardness:5},
  bedrock:  {name:'Roca Madre',  color:0x14100e, health:Infinity, value:0, glow:false, hardness:99, unbreakable:true},
};

// listas ordenadas de mineral más superficial a más profundo, una por etapa.
// La profundidad "ideal" de cada mineral es su posición en esta lista.
const BASE_ORE_ORDER    = ['stone','coal','copper','iron','silver','gold','platinum','ruby','sapphire','amethyst','emerald','opal','diamond','mythic','voidstone'];
const ICE_ORE_ORDER     = ['stone','coal','iron','silver','sapphire','platinum','amethyst','gold','ruby','opal','emerald','diamond','mythic','voidstone','voidstone'];
const VOLCANO_ORE_ORDER = ['stone','coal','copper','ruby','iron','platinum','gold','amethyst','opal','emerald','diamond','mythic','voidstone','voidstone','voidstone'];
const ABYSS_ORE_ORDER   = ['stone','iron','emerald','silver','opal','amethyst','sapphire','platinum','ruby','diamond','gold','mythic','voidstone','voidstone','voidstone'];

const STAGES = [
  {name:'Mina Inicial',    unlockRebirths:0, valueMult:1,   ground:0x453a30, torch:0xffb14e, sky:['#141022','#0c0a10','#050405'], oreOrder:BASE_ORE_ORDER},
  {name:'Caverna de Hielo',unlockRebirths:1, valueMult:1.6, ground:0x33474f, torch:0x6fe7ff, sky:['#0e2230','#0a1620','#04080c'], oreOrder:ICE_ORE_ORDER},
  {name:'Volcán',          unlockRebirths:3, valueMult:2.6, ground:0x4a2418, torch:0xff5d3d, sky:['#2a0e0a','#1a0806','#0a0403'], oreOrder:VOLCANO_ORE_ORDER},
  {name:'Abismo Místico',  unlockRebirths:6, valueMult:4.5, ground:0x3a2c4a, torch:0xff5cf0, sky:['#1c0e2a','#120a1c','#06040a'], oreOrder:ABYSS_ORE_ORDER},
];

// probabilidad de cada mineral según qué tan cerca esté su posición "ideal" en
// oreOrder de la profundidad actual (curva gaussiana) — ver test_depth_distribution.js
const ORE_DEPTH_SIGMA = 0.055;
function oreWeightsForDepth(oreOrder, depthFrac){
  const n = oreOrder.length;
  return oreOrder.map((keyName, i)=>{
    const center = n>1 ? i/(n-1) : 0;
    const d = depthFrac - center;
    const w = Math.exp(-(d*d)/(2*ORE_DEPTH_SIGMA*ORE_DEPTH_SIGMA));
    return [keyName, Math.max(w, 0.0008)];
  });
}
function pickOreForDepth(oreOrder, layerIndex, mineableLayers){
  const depthFrac = mineableLayers>1 ? layerIndex/(mineableLayers-1) : 0;
  return weightedPick(oreWeightsForDepth(oreOrder, depthFrac));
}

const PICKAXES = [
  {name:'Pico de Madera',   dps:1.2, cost:0,      maxHardness:0},
  {name:'Pico de Piedra',   dps:2.2, cost:300,    maxHardness:1},
  {name:'Pico de Hierro',   dps:4,   cost:1500,   maxHardness:2},
  {name:'Pico de Oro',      dps:7,   cost:6000,   maxHardness:3},
  {name:'Pico de Diamante', dps:12,  cost:25000,  maxHardness:4},
  {name:'Pico Mítico',      dps:22,  cost:120000, maxHardness:5},
];
const PICKAXE_VISUALS = [
  {handle:0x6b4a2b, head:0x9a958c, emissive:false},
  {handle:0x6b4a2b, head:0xa9a49c, emissive:false},
  {handle:0x5a3f26, head:0xd3d7db, emissive:false},
  {handle:0x4a3320, head:0xffd23f, emissive:true},
  {handle:0x3a2a1a, head:0x7df9ff, emissive:true},
  {handle:0x2a1a2a, head:0xff5cf0, emissive:true},
];
const BACKPACKS = [
  {name:'Saco Básico',        cap:40,   cost:0},
  {name:'Mochila de Cuero',   cap:80,   cost:500},
  {name:'Marco de Hierro',    cap:150,  cost:2500},
  {name:'Mochila Dorada',     cap:300,  cost:10000},
  {name:'Contenedor Diamante',cap:700,  cost:40000},
  {name:'Bóveda Mítica',      cap:2000, cost:150000},
];

const FIELD_R = 5;
const FIELD_DEPTH = 100; // capas de profundidad; la última (más honda) es roca madre indestructible
const GROUND_R = 14;
const REACH = 5;
const GRAVITY = 22;
const JUMP_SPEED = 8;
const MOVE_SPEED = 5.2;
const SPRINT_MULT = 1.6;
const EYE_HEIGHT = 1.5;
const SELL_POS = {x:-9, z:0};
const SHOP_POS = {x:9, z:0};
const PORTAL_POS = {x:-3, z:12};
const EGG_POS = {x:3, z:12};

/* ---------- pets & eggs ---------- */
const PET_RARITIES = {
  common:    {name:'Común',      color:0x9a9a9a},
  rare:      {name:'Raro',       color:0x4fd1ff},
  epic:      {name:'Épico',      color:0xb15cff},
  legendary: {name:'Legendario', color:0xffb14e},
  mythic:    {name:'Mítico',     color:0xff5cf0},
};
const PETS = [
  {id:'mole',    name:'Topo',              rarity:'common',    coinMult:0.02, dpsMult:0.00, luck:0.00, cap:0},
  {id:'bat',     name:'Murciélago',        rarity:'common',    coinMult:0.00, dpsMult:0.03, luck:0.00, cap:0},
  {id:'fox',     name:'Zorro Minero',      rarity:'rare',      coinMult:0.06, dpsMult:0.02, luck:0.00, cap:20},
  {id:'eagle',   name:'Águila Dorada',     rarity:'rare',      coinMult:0.02, dpsMult:0.06, luck:0.00, cap:20},
  {id:'drake',   name:'Dragón Bebé',       rarity:'epic',      coinMult:0.10, dpsMult:0.08, luck:0.03, cap:40},
  {id:'golem',   name:'Gólem de Piedra',   rarity:'epic',      coinMult:0.06, dpsMult:0.12, luck:0.02, cap:40},
  {id:'phoenix', name:'Fénix',             rarity:'legendary', coinMult:0.18, dpsMult:0.12, luck:0.06, cap:80},
  {id:'kraken',  name:'Kraken',            rarity:'legendary', coinMult:0.12, dpsMult:0.18, luck:0.05, cap:80},
  {id:'diamgo',  name:'Gólem de Diamante', rarity:'mythic',    coinMult:0.30, dpsMult:0.22, luck:0.12, cap:150},
  {id:'voidcat', name:'Gato del Vacío',    rarity:'mythic',    coinMult:0.24, dpsMult:0.28, luck:0.15, cap:150},
];
const EGGS = [
  {id:'common', name:'Huevo Común', cost:250,
    table:[['common',75],['rare',22],['epic',3]]},
  {id:'rare',   name:'Huevo Raro', cost:2500,
    table:[['common',30],['rare',50],['epic',18],['legendary',2]]},
  {id:'epic',   name:'Huevo Épico', cost:15000,
    table:[['rare',35],['epic',45],['legendary',18],['mythic',2]]},
  {id:'mythic', name:'Huevo Mítico', cost:70000,
    table:[['epic',30],['legendary',45],['mythic',25]]},
];
const MAX_EQUIPPED_PETS = 3;

function key(x,y,z){ return x+','+y+','+z; }
function weightedPick(list){
  const total = list.reduce((s,e)=>s+e[1],0);
  let r = Math.random()*total;
  for(const [t,w] of list){ if(r<w) return t; r-=w; }
  return list[list.length-1][0];
}
function fmt(n){ return Math.floor(n).toLocaleString('es-UY'); }
function hexStr(n){ return '#'+n.toString(16).padStart(6,'0'); }
function rand(min,max){ return min + Math.random()*(max-min); }
function pick(arr){ return arr[Math.floor(Math.random()*arr.length)]; }

/* ======================= STATE ======================= */
const state = {
  coins:0, rebirths:0, multiplier:1,
  pickaxeTier:0, backpackTier:0,
  inventory:{},
  stage:0,
  pets:[],          // {uid,id,name,rarity,coinMult,dpsMult,luck,cap}
  equippedPets:[],  // array of uid, max MAX_EQUIPPED_PETS
};
function rebirthThreshold(){ return Math.floor(10000*Math.pow(state.rebirths+1,1.6)); }
function canRebirth(){ return state.coins >= rebirthThreshold(); }

// suma los bonos de las mascotas equipadas (máx. 3, así que es barato calcular esto seguido)
function petBonuses(){
  let coinMult=1, dpsMult=1, luck=0, cap=0;
  state.equippedPets.forEach(uid=>{
    const p = state.pets.find(pp=>pp.uid===uid);
    if(!p) return;
    coinMult += p.coinMult;
    dpsMult += p.dpsMult;
    luck += p.luck;
    cap += p.cap;
  });
  return {coinMult, dpsMult, luck, cap};
}
function effectiveCapacity(){
  return BACKPACKS[state.backpackTier].cap + petBonuses().cap;
}

/* ======================= THREE SETUP ======================= */
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({canvas, antialias:true});
renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
renderer.setSize(window.innerWidth, window.innerHeight);
if(renderer.outputEncoding !== undefined) renderer.outputEncoding = THREE.sRGBEncoding;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0c0a10);
scene.fog = new THREE.FogExp2(0x0c0a10, 0.032);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.05, 200);
camera.rotation.order = 'YXZ';
scene.add(camera); // must be in the scene graph so its view-model children render

window.addEventListener('resize', ()=>{
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

/* ---------- gradient sky (repaintable per stage) ---------- */
const skyCanvas = document.createElement('canvas');
skyCanvas.width = 8; skyCanvas.height = 128;
const skyCtx = skyCanvas.getContext('2d');
const skyTexture = new THREE.CanvasTexture(skyCanvas);
function paintSky(colors){
  const grad = skyCtx.createLinearGradient(0,0,0,128);
  colors.forEach((c,i)=> grad.addColorStop(i/(colors.length-1), c));
  skyCtx.fillStyle = grad;
  skyCtx.fillRect(0,0,8,128);
  skyTexture.needsUpdate = true;
}
paintSky(STAGES[0].sky);
scene.add(new THREE.Mesh(
  new THREE.SphereGeometry(150, 16, 16),
  new THREE.MeshBasicMaterial({map:skyTexture, side:THREE.BackSide, fog:false})
));

/* lights */
scene.add(new THREE.HemisphereLight(0x3a3a52, 0x1c140c, 0.85));
scene.add(new THREE.AmbientLight(0x2a2030, 0.55));

const headlamp = new THREE.PointLight(0xfff2d0, 1.3, 13, 2);
scene.add(headlamp);

const torches = [];
function addTorch(x,y,z,color,themed){
  const l = new THREE.PointLight(color||0xffb14e, 1.2, 11, 2);
  l.position.set(x,y,z);
  scene.add(l);
  const orb = new THREE.Mesh(
    new THREE.SphereGeometry(0.09,8,8),
    new THREE.MeshBasicMaterial({color:color||0xffb14e})
  );
  orb.position.copy(l.position);
  scene.add(orb);
  torches.push({light:l, orb, base:1.2, seed:Math.random()*10, themed:!!themed});
}
addTorch(0, 2.2, 6.5, 0xffb14e, true);
addTorch(-9, 2.2, -2.5, 0x3ddc84, false);
addTorch(-9, 2.2, 2.5, 0x3ddc84, false);
addTorch(9, 2.2, -2.5, 0x6fe7ff, false);
addTorch(9, 2.2, 2.5, 0x6fe7ff, false);
addTorch(0, -3.5, 0, 0xffb14e, true);
addTorch(5.5, 1.6, 5.5, 0xffb14e, true);
addTorch(-5.5, 1.6, 5.5, 0xffb14e, true);
addTorch(5.5, 1.6, -5.5, 0xffb14e, true);
addTorch(-5.5, 1.6, -5.5, 0xffb14e, true);

/* ======================= WORLD ======================= */
const blocks = new Map();      // key -> {mesh, type, health}
const groundSet = new Set();
const blockGroup = new THREE.Group();
scene.add(blockGroup);

const blockGeo = new THREE.BoxGeometry(0.96,0.96,0.96);
const materialCache = {};
function getMaterial(type){
  if(materialCache[type]) return materialCache[type];
  const info = ORES[type];
  const mat = new THREE.MeshStandardMaterial({
    color:info.color, roughness:0.78, metalness:0.12,
    emissive: info.glow ? info.color : 0x000000,
    emissiveIntensity: info.glow ? 0.5 : 0,
  });
  materialCache[type] = mat;
  return mat;
}

function makeBlock(x,y,z,type){
  const mesh = new THREE.Mesh(blockGeo, getMaterial(type));
  mesh.position.set(x,y,z);
  const k = key(x,y,z);
  mesh.userData.key = k;
  blockGroup.add(mesh);
  blocks.set(k, {mesh, type, health:ORES[type].health});
}

function buildField(){
  const oreOrder = STAGES[state.stage].oreOrder;
  const mineableLayers = FIELD_DEPTH - 1; // la última capa es roca madre, no entra en el sorteo
  for(let x=-FIELD_R; x<=FIELD_R; x++){
    for(let z=-FIELD_R; z<=FIELD_R; z++){
      for(let li=0; li<FIELD_DEPTH; li++){
        const y = -li;
        const type = (li === FIELD_DEPTH-1) ? 'bedrock' : pickOreForDepth(oreOrder, li, mineableLayers);
        makeBlock(x,y,z,type);
      }
    }
  }
}
buildField();

function regenerateField(){
  while(blockGroup.children.length){
    blockGroup.remove(blockGroup.children[0]);
  }
  blocks.clear();
  buildField();
}

let groundMat = null;
function buildGround(){
  const cells = [];
  for(let x=-GROUND_R; x<=GROUND_R; x++){
    for(let z=-GROUND_R; z<=GROUND_R; z++){
      if(Math.abs(x)<=FIELD_R && Math.abs(z)<=FIELD_R) continue;
      cells.push([x,z]);
      groundSet.add(key(x,0,z));
    }
  }
  const geo = new THREE.BoxGeometry(1,1,1);
  groundMat = new THREE.MeshStandardMaterial({color:STAGES[0].ground, roughness:1});
  const mesh = new THREE.InstancedMesh(geo, groundMat, cells.length);
  const dummy = new THREE.Object3D();
  cells.forEach(([x,z], i)=>{
    dummy.position.set(x,0,z);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  scene.add(mesh);
}
buildGround();

const WALL_R = FIELD_R + 1;
const wallSet = new Set();
let wallMat = null;
function buildWalls(){
  // anillo hueco alrededor del campo minero, desde justo debajo de la superficie
  // (y=0 ya lo cubre el piso decorativo) hasta la capa de roca madre. Es puramente
  // estructural: no es picable, ni aparece en 'blocks', solo bloquea el paso.
  const cells = [];
  for(let x=-WALL_R; x<=WALL_R; x++){
    for(let z=-WALL_R; z<=WALL_R; z++){
      if(Math.max(Math.abs(x),Math.abs(z)) !== WALL_R) continue;
      for(let li=1; li<FIELD_DEPTH; li++){
        const y = -li;
        cells.push([x,y,z]);
        wallSet.add(key(x,y,z));
      }
    }
  }
  const geo = new THREE.BoxGeometry(1,1,1);
  wallMat = new THREE.MeshStandardMaterial({color:STAGES[0].ground, roughness:1});
  const mesh = new THREE.InstancedMesh(geo, wallMat, cells.length);
  const dummy = new THREE.Object3D();
  cells.forEach(([x,y,z], i)=>{
    dummy.position.set(x,y,z);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  scene.add(mesh);
}
buildWalls();

// cambia de etapa: reskinea piso/paredes/cielo/antorchas y regenera el campo minero
// con la tabla de probabilidades de la nueva etapa
function applyStageTheme(stageIdx){
  const stg = STAGES[stageIdx];
  state.stage = stageIdx;
  groundMat.color.setHex(stg.ground);
  wallMat.color.setHex(stg.ground);
  paintSky(stg.sky);
  torches.forEach(tr=>{
    if(!tr.themed) return;
    tr.light.color.setHex(stg.torch);
    tr.orb.material.color.setHex(stg.torch);
  });
  regenerateField();
}

// safety floor far below the bedrock layer, so the player can never fall through
// the world even in edge cases (bedrock itself is already unbreakable and solid)
const safetyFloor = new THREE.Mesh(
  new THREE.PlaneGeometry(400,400),
  new THREE.MeshBasicMaterial({color:0x08060a})
);
safetyFloor.rotation.x = -Math.PI/2;
safetyFloor.position.y = -(FIELD_DEPTH + 5);
scene.add(safetyFloor);

function solidAt(x,y,z){
  const k = key(x,y,z);
  return blocks.has(k) || groundSet.has(k) || wallSet.has(k);
}

/* ---------- station props ---------- */
function makeTextSprite(text, color){
  const cvs = document.createElement('canvas');
  cvs.width = 300; cvs.height = 110;
  const ctx = cvs.getContext('2d');
  ctx.fillStyle = 'rgba(20,15,12,0.88)';
  ctx.beginPath();
  ctx.moveTo(16,4); ctx.lineTo(284,4); ctx.quadraticCurveTo(296,4,296,16);
  ctx.lineTo(296,94); ctx.quadraticCurveTo(296,106,284,106); ctx.lineTo(16,106);
  ctx.quadraticCurveTo(4,106,4,94); ctx.lineTo(4,16); ctx.quadraticCurveTo(4,4,16,4);
  ctx.closePath(); ctx.fill();
  ctx.lineWidth = 4; ctx.strokeStyle = color; ctx.stroke();
  ctx.fillStyle = color;
  ctx.font = '700 46px "Baloo 2", sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, 150, 58);
  const tex = new THREE.CanvasTexture(cvs);
  const mat = new THREE.SpriteMaterial({map:tex, transparent:true, fog:false});
  const spr = new THREE.Sprite(mat);
  spr.scale.set(2.4, 0.9, 1);
  return spr;
}

function buildStation(pos, color, shapeGeo, label){
  const group = new THREE.Group();
  const platform = new THREE.Mesh(
    new THREE.CylinderGeometry(2.4,2.4,0.3,24),
    new THREE.MeshStandardMaterial({color:0x2c2318, roughness:0.9})
  );
  platform.position.set(pos.x, 0.65, pos.z);
  group.add(platform);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(2.4,0.06,8,32),
    new THREE.MeshStandardMaterial({color, emissive:color, emissiveIntensity:0.6})
  );
  ring.rotation.x = Math.PI/2;
  ring.position.set(pos.x, 0.82, pos.z);
  group.add(ring);

  const icon = new THREE.Mesh(
    shapeGeo,
    new THREE.MeshStandardMaterial({color, emissive:color, emissiveIntensity:0.7, roughness:0.3})
  );
  icon.position.set(pos.x, 1.9, pos.z);
  group.add(icon);

  const sign = makeTextSprite(label, hexStr(color));
  sign.position.set(pos.x, 3.3, pos.z);
  group.add(sign);

  scene.add(group);
  return icon;
}
const sellIcon = buildStation(SELL_POS, 0x3ddc84, new THREE.OctahedronGeometry(0.5), 'VENTA');
const shopIcon = buildStation(SHOP_POS, 0x6fe7ff, new THREE.IcosahedronGeometry(0.5), 'TIENDA');
const portalIcon = buildStation(PORTAL_POS, 0xffb14e, new THREE.TorusKnotGeometry(0.32,0.11,64,8), 'PORTAL');
const eggIcon = buildStation(EGG_POS, 0xff5cf0, new THREE.SphereGeometry(0.5,10,10), 'HUEVOS');

/* ---------- decoration: crates & barrels near stations ---------- */
function makeCrate(x,z, s){
  s = s||1;
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(0.65*s,0.65*s,0.65*s),
    new THREE.MeshStandardMaterial({color:0x6b4a2b, roughness:0.9})
  );
  m.position.set(x, 0.325*s+0.5, z);
  m.rotation.y = rand(0, Math.PI*2);
  scene.add(m);
}
function makeBarrel(x,z){
  const m = new THREE.Mesh(
    new THREE.CylinderGeometry(0.32,0.32,0.62,12),
    new THREE.MeshStandardMaterial({color:0x4a3a28, roughness:0.85})
  );
  m.position.set(x, 0.81, z);
  scene.add(m);
  const band = new THREE.Mesh(
    new THREE.TorusGeometry(0.33,0.02,6,16),
    new THREE.MeshStandardMaterial({color:0x2a2018, roughness:0.6})
  );
  band.rotation.x = Math.PI/2;
  band.position.set(x, 0.81, z);
  scene.add(band);
}
[[-9.8,-3.4],[-8.2,-3.6],[-10.1,1.9]].forEach(p=>makeCrate(p[0],p[1], 0.9+Math.random()*0.3));
makeBarrel(-9.6, 2.7);
[[9.9,-3.3],[8.3,-3.5]].forEach(p=>makeCrate(p[0],p[1], 0.9+Math.random()*0.3));
makeBarrel(10.1, 2.5);
makeBarrel(9.0, 2.9);

/* ---------- decoration: perimeter fence posts with lanterns ---------- */
function makeFencePost(x,z, withLantern){
  const post = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06,0.08,1.1,6),
    new THREE.MeshStandardMaterial({color:0x40301f, roughness:0.95})
  );
  post.position.set(x, 1.05, z);
  scene.add(post);
  if(withLantern){
    const lant = new THREE.Mesh(
      new THREE.SphereGeometry(0.07,8,8),
      new THREE.MeshBasicMaterial({color:0xffcf8a})
    );
    lant.position.set(x, 1.55, z);
    scene.add(lant);
  }
}
(function buildFence(){
  const edge = FIELD_R + 0.55;
  const step = 2.5;
  let n = 0;
  for(let v=-edge; v<=edge+0.01; v+=step){
    makeFencePost(v, -edge, n%2===0); n++;
    makeFencePost(v, edge, n%2===0); n++;
    makeFencePost(-edge, v, n%2===0); n++;
    makeFencePost(edge, v, n%2===0); n++;
  }
})();

/* ---------- decoration: scattered boulders on the surface ---------- */
(function scatterBoulders(){
  const boulderColors = [0x554739, 0x4a4038, 0x615042];
  for(let i=0;i<16;i++){
    let x,z, tries=0;
    do {
      x = rand(-GROUND_R+1, GROUND_R-1);
      z = rand(-GROUND_R+1, GROUND_R-1);
      tries++;
    } while((Math.abs(x)<FIELD_R+1.5 && Math.abs(z)<FIELD_R+1.5 ||
             Math.hypot(x-SELL_POS.x,z-SELL_POS.z)<3.5 ||
             Math.hypot(x-SHOP_POS.x,z-SHOP_POS.z)<3.5 ||
             (Math.abs(x)<2 && z>4 && z<10)) && tries<30);
    const s = rand(0.35,0.85);
    const b = new THREE.Mesh(
      new THREE.IcosahedronGeometry(s,0),
      new THREE.MeshStandardMaterial({color:pick(boulderColors), roughness:1, flatShading:true})
    );
    b.position.set(x, s*0.55, z);
    b.rotation.set(rand(0,6),rand(0,6),rand(0,6));
    scene.add(b);
  }
})();

/* ---------- decoration: mine cart near spawn ---------- */
(function buildCart(){
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(1.1,0.55,0.7),
    new THREE.MeshStandardMaterial({color:0x5b4636, roughness:0.8, metalness:0.2})
  );
  body.position.y = 0.55;
  g.add(body);
  const rim = new THREE.Mesh(
    new THREE.BoxGeometry(1.22,0.12,0.82),
    new THREE.MeshStandardMaterial({color:0x3a2c20, roughness:0.7})
  );
  rim.position.y = 0.86;
  g.add(rim);
  const wheelGeo = new THREE.CylinderGeometry(0.16,0.16,0.1,10);
  const wheelMat = new THREE.MeshStandardMaterial({color:0x1e1712, roughness:0.6, metalness:0.3});
  [[-0.45,-0.4],[0.45,-0.4],[-0.45,0.4],[0.45,0.4]].forEach(p=>{
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI/2;
    w.position.set(p[0], 0.2, p[1]);
    g.add(w);
  });
  // a few ore chunks spilling out
  ['gold','ruby','stone'].forEach((t,i)=>{
    const c = new THREE.Mesh(new THREE.BoxGeometry(0.18,0.18,0.18), getMaterial(t));
    c.position.set(-0.25+i*0.25, 0.9, rand(-0.15,0.15));
    c.rotation.set(rand(0,3),rand(0,3),0);
    g.add(c);
  });
  g.position.set(2.2, 0, 7.5);
  g.rotation.y = 0.5;
  scene.add(g);
})();

/* ---------- decoration: ambient dust motes ---------- */
const dustCount = 160;
const dustGeo = new THREE.BufferGeometry();
const dustPos = new Float32Array(dustCount*3);
for(let i=0;i<dustCount;i++){
  dustPos[i*3]   = rand(-13,13);
  dustPos[i*3+1] = rand(0.4,4.2);
  dustPos[i*3+2] = rand(-13,13);
}
dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos,3));
const dustMat = new THREE.PointsMaterial({color:0xffdca8, size:0.045, transparent:true, opacity:0.35, depthWrite:false});
const dust = new THREE.Points(dustGeo, dustMat);
scene.add(dust);
function updateDust(dt){
  const pos = dustGeo.attributes.position.array;
  for(let i=0;i<dustCount;i++){
    pos[i*3+1] += dt*0.12;
    if(pos[i*3+1] > 4.3){ pos[i*3+1] = 0.4; }
  }
  dustGeo.attributes.position.needsUpdate = true;
}

/* ======================= FIRST-PERSON PICKAXE VIEW-MODEL ======================= */
let pickaxeGroup = null;
let appearProgress = 1;
let swingPhase = 0;
const VM_SCALE = 0.65;
const basePose = {x:0.32, y:-0.32, z:-0.9, rx:-0.35, ry:0.35, rz:0.25};

function buildPickaxeModel(tier){
  const v = PICKAXE_VISUALS[tier];
  const g = new THREE.Group();
  const woodMat = new THREE.MeshStandardMaterial({color:v.handle, roughness:0.85});
  const darkMat = new THREE.MeshStandardMaterial({color:0x1c140c, roughness:0.9});
  const headMat = new THREE.MeshStandardMaterial({
    color:v.head, roughness:0.32, metalness:0.6,
    emissive: v.emissive ? v.head : 0x000000,
    emissiveIntensity: v.emissive ? 0.6 : 0
  });

  // handle: grip (y=0) up to the head (y=0.74), straight and centered
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.026,0.04,0.74,8), woodMat);
  handle.position.set(0, 0.37, 0);
  g.add(handle);

  // dark grip wrap near the bottom, for detail
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.046,0.046,0.11,8), darkMat);
  grip.position.set(0, 0.09, 0);
  g.add(grip);

  // ferrule: connects handle to head
  const ferrule = new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,0.05,8), darkMat);
  ferrule.position.set(0, 0.72, 0);
  g.add(ferrule);

  // head: a straight horizontal bar through the top, with two mirrored pointed tips
  const headBar = new THREE.Mesh(new THREE.BoxGeometry(0.6,0.055,0.055), headMat);
  headBar.position.set(0, 0.76, 0);
  g.add(headBar);

  const tipGeo = new THREE.ConeGeometry(0.05, 0.22, 6);
  const tipL = new THREE.Mesh(tipGeo, headMat);
  tipL.rotation.z = Math.PI/2;
  tipL.position.set(-0.41, 0.76, 0);
  g.add(tipL);

  const tipR = new THREE.Mesh(tipGeo, headMat);
  tipR.rotation.z = -Math.PI/2;
  tipR.position.set(0.41, 0.76, 0);
  g.add(tipR);

  g.traverse(o=>{
    if(o.isMesh){
      o.frustumCulled = false;
      o.renderOrder = 999;
      o.material.depthTest = false;
    }
  });
  return g;
}

function equipPickaxeVisual(){
  if(pickaxeGroup) camera.remove(pickaxeGroup);
  pickaxeGroup = buildPickaxeModel(state.pickaxeTier);
  pickaxeGroup.position.set(basePose.x, basePose.y, basePose.z);
  pickaxeGroup.rotation.set(basePose.rx, basePose.ry, basePose.rz);
  pickaxeGroup.scale.setScalar(0.001);
  camera.add(pickaxeGroup);
  appearProgress = 0;
}

function updateViewmodel(dt, now, moving){
  if(!pickaxeGroup) return;
  const dps = PICKAXES[state.pickaxeTier].dps;

  if(isMining){
    swingPhase += dt * (2.4 + dps*0.14);
  } else {
    swingPhase *= 0.9;
  }
  const swing = isMining ? Math.pow(Math.abs(Math.sin(swingPhase*Math.PI)), 0.55) : 0;

  const t = now/1000;
  const idleX = Math.sin(t*1.6)*0.008;
  const idleY = Math.cos(t*1.2)*0.006 + (moving ? Math.abs(Math.sin(t*8))*0.014 : 0);

  pickaxeGroup.rotation.x = basePose.rx - swing*0.85;
  pickaxeGroup.rotation.z = basePose.rz + swing*0.18;
  pickaxeGroup.position.x = basePose.x + idleX;
  pickaxeGroup.position.y = basePose.y + idleY - swing*0.1;
  pickaxeGroup.position.z = basePose.z + swing*0.18;

  if(appearProgress < 1){
    appearProgress = Math.min(1, appearProgress + dt/0.45);
    const e = 1 - Math.pow(1-appearProgress, 3);
    pickaxeGroup.scale.setScalar(Math.max(e*VM_SCALE,0.001));
  }
}

/* ======================= PLAYER ======================= */
const player = {x:0, y:0.5, z:8};
const vel = {y:0};
let yaw = 0, pitch = 0;
let onGround = true;

// La cámara nace en (0,0,0) por defecto, que cae DENTRO de un bloque de piedra
// del campo minero (x,z:-5..5, y:0..-6). Sin esto, el primer frame (incluso
// antes de apretar "JUGAR") muestra la cámara incrustada en el bloque, es
// decir, la pantalla se ve toda gris. La posicionamos ya en el spawn.
camera.position.set(player.x, player.y + EYE_HEIGHT, player.z);
camera.rotation.set(pitch, yaw, 0);

const keysState = {w:false,a:false,s:false,d:false,shift:false,space:false};

let gameStarted = false;
let isPaused = false;
let isMining = false;
let shopOpenFlag = false;
let rebirthOpenFlag = false;
let stagesOpenFlag = false;
let petsOpenFlag = false;

function updatePlayer(dt){
  const speed = MOVE_SPEED * (keysState.shift ? SPRINT_MULT : 1);
  let ix = (keysState.d?1:0) - (keysState.a?1:0);
  let iz = (keysState.w?1:0) - (keysState.s?1:0);
  const len = Math.hypot(ix,iz) || 1;
  ix/=len; iz/=len;

  const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
  const rx = Math.cos(yaw),  rz = -Math.sin(yaw);
  const mx = (fx*iz + rx*ix) * speed * dt;
  const mz = (fz*iz + rz*ix) * speed * dt;

  const nx = player.x + mx;
  if(!solidAt(Math.round(nx), Math.round(player.y+0.3), Math.round(player.z)) &&
     !solidAt(Math.round(nx), Math.round(player.y+1.3), Math.round(player.z))){
    player.x = nx;
  }
  const nz = player.z + mz;
  if(!solidAt(Math.round(player.x), Math.round(player.y+0.3), Math.round(nz)) &&
     !solidAt(Math.round(player.x), Math.round(player.y+1.3), Math.round(nz))){
    player.z = nz;
  }

  vel.y -= GRAVITY*dt;
  const ny = player.y + vel.y*dt;
  if(vel.y <= 0){
    const cellY = Math.round(ny - 0.5);
    if(solidAt(Math.round(player.x), cellY, Math.round(player.z))){
      player.y = cellY + 0.5;
      vel.y = 0; onGround = true;
    } else {
      player.y = ny; onGround = false;
    }
  } else {
    const cellY = Math.round(ny + 1.0);
    if(solidAt(Math.round(player.x), cellY, Math.round(player.z))){
      vel.y = 0;
    } else {
      player.y = ny; onGround = false;
    }
  }
  if(keysState.space && onGround){ vel.y = JUMP_SPEED; onGround = false; }

  if(player.y < -(FIELD_DEPTH + 3)){ player.x=0; player.y=6; player.z=8; vel.y=0; }
}

/* ======================= MINING ======================= */
// en vez de tirar el Raycaster de three.js contra los ~12.100 bloques del campo
// (caro y no escala), avanzamos a pasos chicos a lo largo de la mirada y
// consultamos directamente la grilla lógica — cuesta lo mismo sin importar
// cuántos bloques haya en total.
const RAY_STEP = 0.06;
const dirVec = new THREE.Vector3();
const marchPos = new THREE.Vector3();
function getTarget(){
  camera.getWorldDirection(dirVec);
  marchPos.copy(camera.position);
  const steps = Math.ceil(REACH / RAY_STEP);
  for(let i=0;i<steps;i++){
    marchPos.addScaledVector(dirVec, RAY_STEP);
    const gx = Math.round(marchPos.x), gy = Math.round(marchPos.y), gz = Math.round(marchPos.z);
    const k = key(gx,gy,gz);
    if(blocks.has(k)){
      return { key:k, distance: camera.position.distanceTo(marchPos) };
    }
  }
  return null;
}

let lastLockToast = 0;
function mine(hit, dt){
  const entry = blocks.get(hit.key);
  if(!entry) return;
  const info = ORES[entry.type];
  if(info.unbreakable){
    const now = performance.now();
    if(now - lastLockToast > 1500){ toast('La Roca Madre es indestructible', '#ff5d5d'); lastLockToast = now; }
    return;
  }
  if(info.hardness > PICKAXES[state.pickaxeTier].maxHardness){
    const now = performance.now();
    if(now - lastLockToast > 1500){ toast('🔒 Necesitás un pico mejor para picar '+info.name, '#ff5d5d'); lastLockToast = now; }
    return;
  }
  entry.health -= PICKAXES[state.pickaxeTier].dps * petBonuses().dpsMult * dt;
  if(entry.health <= 0){
    breakBlock(hit.key);
  }
}

function breakBlock(k){
  const entry = blocks.get(k);
  if(!entry || ORES[entry.type].unbreakable) return;
  const pos = entry.mesh.position.clone();
  const type = entry.type;
  blockGroup.remove(entry.mesh);
  blocks.delete(k);
  spawnParticles(pos, ORES[type].color);
  addOre(type, 1);
  const luck = petBonuses().luck;
  if(luck > 0 && Math.random() < luck){
    addOre(type, 1);
    toast('¡Suerte de mascota! +1 extra', '#ffd23f');
  }
}

function addOre(type, n){
  const total = Object.values(state.inventory).reduce((a,b)=>a+b,0);
  const cap = effectiveCapacity();
  const room = cap - total;
  const add = Math.min(n, Math.max(room,0));
  if(add <= 0){
    toast('¡Mochila llena!', '#ff5d5d');
    return;
  }
  state.inventory[type] = (state.inventory[type]||0) + add;
  toast('+' + add + ' ' + ORES[type].name, hexStr(ORES[type].color));
  updateHUD();
}

function sellAll(){
  const total = Object.values(state.inventory).reduce((a,b)=>a+b,0);
  if(total === 0){ toast('No tienes minerales para vender', '#ffb14e'); return; }
  let value = 0;
  for(const t in state.inventory){ value += ORES[t].value * state.inventory[t]; }
  value = Math.round(value * state.multiplier * petBonuses().coinMult * STAGES[state.stage].valueMult);
  state.coins += value;
  state.inventory = {};
  toast('Vendido por $' + fmt(value), '#ffd23f');
  markDirty();
  updateHUD();
}

/* particles */
const particles = [];
const particleGeo = new THREE.BoxGeometry(0.14,0.14,0.14);
const particleMatCache = {};
function spawnParticles(pos, colorHex){
  let mat = particleMatCache[colorHex];
  if(!mat){ mat = new THREE.MeshBasicMaterial({color:colorHex}); particleMatCache[colorHex] = mat; }
  for(let i=0;i<7;i++){
    const m = new THREE.Mesh(particleGeo, mat);
    m.position.copy(pos);
    scene.add(m);
    particles.push({
      mesh:m,
      vel:new THREE.Vector3((Math.random()-0.5)*3, Math.random()*3+1.5, (Math.random()-0.5)*3),
      life:0.6, maxLife:0.6
    });
  }
}
function updateParticles(dt){
  for(let i=particles.length-1;i>=0;i--){
    const p = particles[i];
    p.life -= dt;
    if(p.life <= 0){ scene.remove(p.mesh); particles.splice(i,1); continue; }
    p.vel.y -= 9*dt;
    p.mesh.position.addScaledVector(p.vel, dt);
    const s = Math.max(p.life/p.maxLife, 0.001);
    p.mesh.scale.setScalar(s);
  }
}

/* glow shimmer (shared materials, cheap) */
const glowTypes = Object.keys(ORES).filter(t=>ORES[t].glow);
function updateGlow(t){
  glowTypes.forEach((type,i)=>{
    const mat = materialCache[type];
    if(mat) mat.emissiveIntensity = 0.5 + Math.sin(t*3 + i*1.7) * 0.28;
  });
}
function updateTorchFlicker(t){
  torches.forEach(tr=>{
    tr.light.intensity = tr.base + Math.sin(t*8 + tr.seed)*0.15 + Math.sin(t*23+tr.seed)*0.05;
  });
}

/* ======================= UI WIRING ======================= */
const hud = document.getElementById('hud');
const coinsVal = document.getElementById('coinsVal');
const multVal = document.getElementById('multVal');
const rebirthCountEl = document.getElementById('rebirthCount');
const rebirthFill = document.getElementById('rebirthFill');
const rebirthBtn = document.getElementById('rebirthBtn');
const invBarInner = document.getElementById('invBarInner');
const invText = document.getElementById('invText');
const invList = document.getElementById('invList');
const pickaxeNameEl = document.getElementById('pickaxeName');
const backpackNameEl = document.getElementById('backpackName');
const crosshair = document.getElementById('crosshair');
const targetInfo = document.getElementById('targetInfo');
const targetName = document.getElementById('targetName');
const targetHealthInner = document.getElementById('targetHealthInner');
const promptSell = document.getElementById('promptSell');
const promptShop = document.getElementById('promptShop');
const promptPortal = document.getElementById('promptPortal');
const promptEgg = document.getElementById('promptEgg');
const onlineCountEl = document.getElementById('onlineCount');
const stageNameEl = document.getElementById('stageName');
const resetBadge = document.getElementById('resetBadge');
const resetCountdownEl = document.getElementById('resetCountdown');
const toastContainer = document.getElementById('toastContainer');

function toast(text, color){
  const el = document.createElement('div');
  el.className = 'toast';
  el.style.borderColor = color;
  el.style.color = color;
  el.textContent = text;
  toastContainer.appendChild(el);
  requestAnimationFrame(()=>el.classList.add('show'));
  setTimeout(()=>{ el.classList.remove('show'); setTimeout(()=>el.remove(), 300); }, 1300);
}

// muestra arriba de la pantalla qué mineral estás apuntando y su vida restante,
// tanto si lo estás picando activamente como si solo lo estás mirando
function updateTargetPanel(hit){
  if(hit && hit.distance <= REACH){
    const entry = blocks.get(hit.key);
    if(entry){
      const info = ORES[entry.type];
      if(info.unbreakable){
        targetName.textContent = '🔒 ' + info.name;
        targetName.style.color = 'var(--red)';
        targetHealthInner.style.width = '100%';
        targetHealthInner.style.background = 'var(--red)';
      } else if(info.hardness > PICKAXES[state.pickaxeTier].maxHardness){
        targetName.textContent = '🔒 ' + info.name + ' (necesitás mejor pico)';
        targetName.style.color = 'var(--red)';
        targetHealthInner.style.width = '100%';
        targetHealthInner.style.background = 'var(--red)';
      } else {
        const frac = Math.max(entry.health,0) / info.health;
        targetName.textContent = info.name;
        targetName.style.color = 'var(--text)';
        targetHealthInner.style.width = (frac*100) + '%';
        targetHealthInner.style.background = 'var(--amber)';
      }
      targetInfo.classList.add('show');
      return;
    }
  }
  targetInfo.classList.remove('show');
}

function updateHUD(){
  coinsVal.textContent = '$' + fmt(state.coins);
  multVal.textContent = 'x' + state.multiplier;
  rebirthCountEl.textContent = state.rebirths;
  pickaxeNameEl.textContent = PICKAXES[state.pickaxeTier].name;
  backpackNameEl.textContent = BACKPACKS[state.backpackTier].name;
  stageNameEl.textContent = STAGES[state.stage].name;

  const total = Object.values(state.inventory).reduce((a,b)=>a+b,0);
  const cap = effectiveCapacity();
  invBarInner.style.width = Math.min(100, (total/cap)*100) + '%';
  invText.textContent = total + '/' + cap;

  invList.innerHTML = '';
  Object.keys(ORES).forEach(type=>{
    const c = state.inventory[type] || 0;
    if(c>0){
      const row = document.createElement('div');
      row.className = 'inv-row';
      row.innerHTML = '<span class="dot" style="background:'+hexStr(ORES[type].color)+';color:'+hexStr(ORES[type].color)+'"></span>'+
        '<span>'+ORES[type].name+'</span><b>'+c+'</b>';
      invList.appendChild(row);
    }
  });

  const thresh = rebirthThreshold();
  rebirthFill.style.width = Math.min(100, (state.coins/thresh)*100) + '%';
  const able = canRebirth();
  rebirthBtn.disabled = !able;
  rebirthBtn.textContent = able ? 'Renacer (¡Disponible!)' : ('Renacer ($'+fmt(thresh)+')');

  if(shopOpenFlag) renderShop();
  if(petsOpenFlag) renderPets();
}

/* shop */
const shopModal = document.getElementById('shopModal');
const shopCoins = document.getElementById('shopCoins');
const pickaxeList = document.getElementById('pickaxeList');
const backpackList = document.getElementById('backpackList');

function oresAtHardness(h){
  return Object.values(ORES).filter(o=>o.hardness===h && !o.unbreakable).map(o=>o.name).join(', ');
}

function renderShop(){
  shopCoins.textContent = '$' + fmt(state.coins);

  pickaxeList.innerHTML = '';
  PICKAXES.forEach((p,i)=>{
    const row = document.createElement('div');
    row.className = 'shop-row' + (i===state.pickaxeTier ? ' owned':'');
    row.innerHTML = '<div class="shop-row-main"><b>'+p.name+'</b><span>'+p.dps.toFixed(1)+' golpes/seg · pica: '+oresAtHardness(p.maxHardness)+'</span></div>';
    const btn = document.createElement('button');
    if(i < state.pickaxeTier) btn.textContent = 'Superado';
    else if(i === state.pickaxeTier) btn.textContent = 'Equipado';
    else if(i === state.pickaxeTier+1) btn.textContent = '$'+fmt(p.cost);
    else btn.textContent = 'Bloqueado';
    btn.disabled = !(i===state.pickaxeTier+1 && state.coins>=p.cost);
    btn.onclick = ()=>{ state.coins -= p.cost; state.pickaxeTier = i; equipPickaxeVisual(); markDirty(); updateHUD(); };
    row.appendChild(btn);
    pickaxeList.appendChild(row);
  });

  backpackList.innerHTML = '';
  BACKPACKS.forEach((b,i)=>{
    const row = document.createElement('div');
    row.className = 'shop-row' + (i===state.backpackTier ? ' owned':'');
    row.innerHTML = '<div class="shop-row-main"><b>'+b.name+'</b><span>Capacidad '+b.cap+'</span></div>';
    const btn = document.createElement('button');
    if(i < state.backpackTier) btn.textContent = 'Superado';
    else if(i === state.backpackTier) btn.textContent = 'Equipado';
    else if(i === state.backpackTier+1) btn.textContent = '$'+fmt(b.cost);
    else btn.textContent = 'Bloqueado';
    btn.disabled = !(i===state.backpackTier+1 && state.coins>=b.cost);
    btn.onclick = ()=>{ state.coins -= b.cost; state.backpackTier = i; markDirty(); updateHUD(); };
    row.appendChild(btn);
    backpackList.appendChild(row);
  });
}

function openShop(){
  shopOpenFlag = true;
  isPaused = true;
  isMining = false;
  releaseLook();
  renderShop();
  shopModal.classList.remove('hidden');
}
function closeShop(){
  shopModal.classList.add('hidden');
  shopOpenFlag = false;
  isPaused = false;
  requestLook();
}
document.getElementById('shopClose').onclick = closeShop;

/* rebirth modal */
const rebirthModal = document.getElementById('rebirthModal');
function openRebirth(){
  if(!canRebirth()){ toast('Necesitas $'+fmt(rebirthThreshold())+' para renacer', '#ffb14e'); return; }
  rebirthOpenFlag = true;
  isPaused = true;
  isMining = false;
  releaseLook();
  rebirthModal.classList.remove('hidden');
}
function closeRebirth(){
  rebirthModal.classList.add('hidden');
  rebirthOpenFlag = false;
  isPaused = false;
  requestLook();
}
document.getElementById('rebirthCancel').onclick = closeRebirth;
document.getElementById('rebirthConfirm').onclick = ()=>{
  state.rebirths += 1;
  state.multiplier = +(1 + state.rebirths*0.25).toFixed(2);
  state.coins = 0;
  state.pickaxeTier = 0;
  state.backpackTier = 0;
  state.inventory = {};
  regenerateField();
  equipPickaxeVisual();
  markDirty();
  updateHUD();
  toast('¡Renaciste! Multiplicador x'+state.multiplier, '#ff5cf0');
  closeRebirth();
};
rebirthBtn.onclick = openRebirth;

/* ---------- stages / portal modal ---------- */
const stagesModal = document.getElementById('stagesModal');
const stageList = document.getElementById('stageList');
const rankList = document.getElementById('rankList');

function renderStages(){
  stageList.innerHTML = '';
  STAGES.forEach((stg, i)=>{
    const unlocked = state.rebirths >= stg.unlockRebirths;
    const row = document.createElement('div');
    row.className = 'shop-row' + (!unlocked ? ' locked' : '') + (i===state.stage ? ' owned' : '');
    row.innerHTML = '<div class="shop-row-main"><b>'+stg.name+'</b><span>Multiplicador de venta x'+stg.valueMult+'</span></div>';
    const btn = document.createElement('button');
    if(!unlocked) btn.textContent = 'Bloqueado ('+stg.unlockRebirths+' renac.)';
    else if(i===state.stage) btn.textContent = 'Aquí';
    else btn.textContent = 'Viajar';
    btn.disabled = !unlocked || i===state.stage;
    btn.onclick = ()=>{
      applyStageTheme(i);
      player.x = 0; player.y = 6; player.z = 8; vel.y = 0;
      markDirty();
      updateHUD();
      renderStages();
      toast('Viajaste a '+stg.name, hexStr(stg.torch));
    };
    row.appendChild(btn);
    stageList.appendChild(row);
  });
}

function renderRanking(){
  rankList.innerHTML = '';
  const rows = [{name: myProfile.name+' (vos)', coins: state.coins, mine:true}];
  otherPlayersData.forEach(d=> rows.push({name: d.name, coins: d.coins||0, mine:false}));
  rows.sort((a,b)=> b.coins - a.coins);
  rows.slice(0,8).forEach((r,i)=>{
    const row = document.createElement('div');
    row.className = 'rank-row' + (r.mine ? ' me' : '');
    row.innerHTML = '<span class="pos">#'+(i+1)+'</span><span class="who">'+r.name+'</span><span class="amt">$'+fmt(r.coins)+'</span>';
    rankList.appendChild(row);
  });
  if(rows.length===1){
    const note = document.createElement('div');
    note.className = 'footnote';
    note.textContent = 'Todavía no hay otros jugadores conectados a este enlace.';
    rankList.appendChild(note);
  }
}

function openStages(){
  stagesOpenFlag = true;
  isPaused = true;
  isMining = false;
  releaseLook();
  renderStages();
  renderRanking();
  stagesModal.classList.remove('hidden');
}
function closeStages(){
  stagesModal.classList.add('hidden');
  stagesOpenFlag = false;
  isPaused = false;
  requestLook();
}
document.getElementById('stagesClose').onclick = closeStages;

/* ---------- eggs / pets modal ---------- */
const petsModal = document.getElementById('petsModal');
const petsCoins = document.getElementById('petsCoins');
const eggList = document.getElementById('eggList');
const petList = document.getElementById('petList');
const petSlotCount = document.getElementById('petSlotCount');

function hatchEgg(egg){
  if(state.coins < egg.cost){ toast('No tienes suficientes monedas', '#ff5d5d'); return; }
  state.coins -= egg.cost;
  const rarity = weightedPick(egg.table);
  const candidates = PETS.filter(p=>p.rarity===rarity);
  const template = candidates[Math.floor(Math.random()*candidates.length)];
  const inst = {
    uid: 'p'+Date.now().toString(36)+Math.floor(Math.random()*1000),
    id: template.id, name: template.name, rarity: template.rarity,
    coinMult: template.coinMult, dpsMult: template.dpsMult, luck: template.luck, cap: template.cap,
  };
  state.pets.push(inst);
  toast('¡Obtuviste a '+template.name+'! ('+PET_RARITIES[rarity].name+')', hexStr(PET_RARITIES[rarity].color));
  markDirty();
  updateHUD();
  renderEggs();
  renderPets();
}

function togglePetEquip(uid){
  const idx = state.equippedPets.indexOf(uid);
  if(idx >= 0){
    state.equippedPets.splice(idx,1);
  } else {
    if(state.equippedPets.length >= MAX_EQUIPPED_PETS){
      toast('Ya tenés '+MAX_EQUIPPED_PETS+' mascotas equipadas', '#ffb14e');
      return;
    }
    state.equippedPets.push(uid);
  }
  markDirty();
  updateHUD();
  renderPets();
}

function renderEggs(){
  petsCoins.textContent = '$' + fmt(state.coins);
  eggList.innerHTML = '';
  EGGS.forEach(egg=>{
    const row = document.createElement('div');
    row.className = 'shop-row';
    row.innerHTML = '<div class="shop-row-main"><b>'+egg.name+'</b><span>$'+fmt(egg.cost)+'</span></div>';
    const btn = document.createElement('button');
    btn.textContent = 'Abrir';
    btn.disabled = state.coins < egg.cost;
    btn.onclick = ()=> hatchEgg(egg);
    row.appendChild(btn);
    eggList.appendChild(row);
  });
}

function renderPets(){
  petSlotCount.textContent = '('+state.equippedPets.length+'/'+MAX_EQUIPPED_PETS+' equipadas)';
  petList.innerHTML = '';
  if(state.pets.length === 0){
    const note = document.createElement('div');
    note.className = 'footnote';
    note.textContent = 'Todavía no tenés mascotas. ¡Abrí un huevo!';
    petList.appendChild(note);
    return;
  }
  const order = {mythic:0, legendary:1, epic:2, rare:3, common:4};
  const sorted = [...state.pets].sort((a,b)=> order[a.rarity]-order[b.rarity]);
  sorted.forEach(p=>{
    const equipped = state.equippedPets.includes(p.uid);
    const rarityInfo = PET_RARITIES[p.rarity];
    const row = document.createElement('div');
    row.className = 'shop-row' + (equipped ? ' equipped' : '');
    row.innerHTML = '<div class="shop-row-main"><b><span class="rarity-dot" style="background:'+hexStr(rarityInfo.color)+';color:'+hexStr(rarityInfo.color)+'"></span>'+p.name+'</b>'+
      '<span>'+rarityInfo.name+' · +'+Math.round(p.coinMult*100)+'% monedas, +'+Math.round(p.dpsMult*100)+'% picado'+(p.luck>0?', +'+Math.round(p.luck*100)+'% suerte':'')+(p.cap>0?', +'+p.cap+' mochila':'')+'</span></div>';
    const btn = document.createElement('button');
    btn.textContent = equipped ? 'Quitar' : 'Equipar';
    btn.disabled = !equipped && state.equippedPets.length >= MAX_EQUIPPED_PETS;
    btn.onclick = ()=> togglePetEquip(p.uid);
    row.appendChild(btn);
    petList.appendChild(row);
  });
}

function openPets(){
  petsOpenFlag = true;
  isPaused = true;
  isMining = false;
  releaseLook();
  renderEggs();
  renderPets();
  petsModal.classList.remove('hidden');
}
function closePets(){
  petsModal.classList.add('hidden');
  petsOpenFlag = false;
  isPaused = false;
  requestLook();
}
document.getElementById('petsClose').onclick = closePets;

/* ======================= MULTIJUGADOR (adaptador: Firebase / Storage / offline) ======================= */
// Detecta automáticamente el mejor transporte disponible:
//  - Firebase Realtime Database (si firebase-config.js está cargado y tiene datos reales):
//    sync en vivo por eventos, sin polling — esto es lo que da multijugador fluido.
//    Solo existe cuando el juego está hosteado afuera de claude.ai (ej. GitHub Pages).
//  - window.storage compartido (disponible acá en la preview de claude.ai): polling cada
//    ~2.5s, con saltos — es el modo de respaldo dentro de este chat.
//  - Si ninguno está disponible: modo sin conexión, el juego funciona igual en solitario.
let myProfile = {
  id: 'p' + Math.random().toString(36).slice(2,9),
  name: 'Minero' + Math.floor(1000 + Math.random()*9000),
};

async function loadProfile(){
  try{
    if(typeof window.storage !== 'undefined' && window.storage){
      const res = await window.storage.get('profile', false);
      if(res && res.value){ myProfile = JSON.parse(res.value); }
      else { await window.storage.set('profile', JSON.stringify(myProfile), false); }
    } else if(typeof localStorage !== 'undefined'){
      const raw = localStorage.getItem('mina3d_profile');
      if(raw){ myProfile = JSON.parse(raw); }
      else { localStorage.setItem('mina3d_profile', JSON.stringify(myProfile)); }
    }
  }catch(e){ /* seguimos con el perfil generado en memoria */ }
  if(nameInput) nameInput.value = myProfile.name;
}

async function saveProfile(){
  try{
    if(typeof window.storage !== 'undefined' && window.storage){
      await window.storage.set('profile', JSON.stringify(myProfile), false);
    } else if(typeof localStorage !== 'undefined'){
      localStorage.setItem('mina3d_profile', JSON.stringify(myProfile));
    }
  }catch(e){ /* no crítico */ }
}

/* ---------- progreso del jugador (monedas, pico, mochila, mascotas, etapa...) ---------- */
// Se guarda personal (shared:false / localStorage), NUNCA compartido — es tuyo,
// nadie más lo ve. Se guarda con un pequeño retraso (no en cada evento) para no
// saturar el storage; "dirty" marca que hay cambios pendientes de guardar.
let progressDirty = false;
function markDirty(){ progressDirty = true; }

async function loadProgress(){
  try{
    let raw = null;
    if(typeof window.storage !== 'undefined' && window.storage){
      const res = await window.storage.get('progress', false);
      if(res && res.value) raw = res.value;
    } else if(typeof localStorage !== 'undefined'){
      raw = localStorage.getItem('mina3d_progress');
    }
    if(raw){
      const saved = JSON.parse(raw);
      Object.assign(state, saved);
    }
  }catch(e){ /* no había progreso guardado todavía, o falló — arrancamos de 0 */ }
}

async function persistProgress(){
  if(!progressDirty) return;
  progressDirty = false;
  const payload = JSON.stringify({
    coins: state.coins, rebirths: state.rebirths, multiplier: state.multiplier,
    pickaxeTier: state.pickaxeTier, backpackTier: state.backpackTier,
    inventory: state.inventory, stage: state.stage,
    pets: state.pets, equippedPets: state.equippedPets,
  });
  try{
    if(typeof window.storage !== 'undefined' && window.storage){
      await window.storage.set('progress', payload, false);
    } else if(typeof localStorage !== 'undefined'){
      localStorage.setItem('mina3d_progress', payload);
    }
  }catch(e){ progressDirty = true; /* reintentamos en el próximo ciclo */ }
}
setInterval(persistProgress, 3000);
window.addEventListener('beforeunload', persistProgress);

function hashColor(str){
  let h = 0;
  for(let i=0;i<str.length;i++){ h = (h*31 + str.charCodeAt(i)) >>> 0; }
  const hue = h % 360;
  return new THREE.Color().setHSL(hue/360, 0.55, 0.55).getHex();
}

const otherPlayersData = new Map();   // id -> {name,x,y,z,stage,coins,rebirths,ts}
const otherPlayerAvatars = new Map(); // id -> {group, target:Vector3}

function createAvatar(id, data){
  const color = hashColor(data.name || id);
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28,0.32,1.0,8),
    new THREE.MeshStandardMaterial({color, roughness:0.7})
  );
  body.position.y = 0.9;
  group.add(body);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.24,10,10),
    new THREE.MeshStandardMaterial({color, roughness:0.6})
  );
  head.position.y = 1.55;
  group.add(head);
  const tag = makeTextSprite(data.name || '???', '#f3e9da');
  tag.scale.set(1.3,0.5,1);
  tag.position.y = 2.15;
  group.add(tag);
  scene.add(group);
  otherPlayerAvatars.set(id, {group, target:new THREE.Vector3(data.x,data.y,data.z)});
}

function upsertOtherPlayer(id, data){
  if(id === myProfile.id) return;
  otherPlayersData.set(id, data);
  if(!otherPlayerAvatars.has(id)) createAvatar(id, data);
  const av = otherPlayerAvatars.get(id);
  av.target.set(data.x, data.y, data.z);
  av.group.visible = (data.stage === state.stage);
  onlineCountEl.textContent = 1 + otherPlayersData.size;
  if(stagesOpenFlag) renderRanking();
}
function removeOtherPlayer(id){
  const av = otherPlayerAvatars.get(id);
  if(av){ scene.remove(av.group); otherPlayerAvatars.delete(id); }
  otherPlayersData.delete(id);
  onlineCountEl.textContent = 1 + otherPlayersData.size;
  if(stagesOpenFlag) renderRanking();
}

/* ---------- adaptador de red ---------- */
const Net = { mode:'offline', _myRef:null, _onUpdate:null, _onRemove:null };
Net.onUpdate = function(cb){ Net._onUpdate = cb; };
Net.onRemove = function(cb){ Net._onRemove = cb; };

// decide qué transporte usar. Se puede llamar sin argumentos (detección automática)
// o forzar un modo para pruebas: detectNetMode({hasFirebase,hasConfig,hasStorage})
function detectNetMode(env){
  env = env || {
    hasFirebase: typeof firebase !== 'undefined',
    hasConfig: typeof FIREBASE_CONFIG !== 'undefined' && !!(FIREBASE_CONFIG && FIREBASE_CONFIG.databaseURL)
      && FIREBASE_CONFIG.databaseURL.indexOf('TU_PROYECTO') === -1,
    hasStorage: typeof window.storage !== 'undefined' && !!window.storage,
  };
  if(env.hasFirebase && env.hasConfig) return 'firebase';
  if(env.hasStorage) return 'storage';
  return 'offline';
}

async function initNet(){
  const mode = detectNetMode();
  if(mode === 'firebase'){
    try{
      firebase.initializeApp(FIREBASE_CONFIG);
      const db = firebase.database();
      const myRef = db.ref('players/'+myProfile.id);
      myRef.onDisconnect().remove().catch(()=>{});
      const playersRef = db.ref('players');
      playersRef.on('child_added',   snap => { if(Net._onUpdate) Net._onUpdate(snap.key, snap.val()); });
      playersRef.on('child_changed', snap => { if(Net._onUpdate) Net._onUpdate(snap.key, snap.val()); });
      playersRef.on('child_removed', snap => { if(Net._onRemove) Net._onRemove(snap.key); });
      Net._myRef = myRef;
      Net.mode = 'firebase';
      console.log('[MINA3D] Multijugador: Firebase Realtime Database (sync en vivo).');
      return;
    }catch(e){
      console.warn('[MINA3D] No se pudo inicializar Firebase, uso modo de respaldo.', e);
    }
  }
  if(detectNetMode() === 'storage' || (typeof window.storage !== 'undefined' && window.storage)){
    Net.mode = 'storage';
    console.log('[MINA3D] Multijugador: almacenamiento compartido de claude.ai (polling).');
    return;
  }
  Net.mode = 'offline';
  console.log('[MINA3D] Multijugador no disponible en este entorno, jugando en solitario.');
}

function netBroadcast(){
  if(!gameStarted) return;
  const data = {
    name: myProfile.name, x:player.x, y:player.y, z:player.z,
    stage: state.stage, coins: state.coins, rebirths: state.rebirths,
  };
  if(Net.mode === 'firebase'){
    Net._myRef.set(Object.assign({}, data, {ts: firebase.database.ServerValue.TIMESTAMP})).catch(()=>{});
  } else if(Net.mode === 'storage'){
    try{
      window.storage.set('players:'+myProfile.id, JSON.stringify(Object.assign({}, data, {ts:Date.now()})), true).catch(()=>{});
    }catch(e){ /* no crítico */ }
  }
}

async function netPollStorage(){
  if(Net.mode !== 'storage') return;
  try{
    const listRes = await window.storage.list('players:', true);
    if(!listRes || !listRes.keys) return;
    const myKey = 'players:'+myProfile.id;
    const seen = new Set();
    for(const k of listRes.keys){
      if(k === myKey) continue;
      const id = k.slice('players:'.length);
      seen.add(id);
      try{
        const r = await window.storage.get(k, true);
        if(!r || !r.value) continue;
        if(Net._onUpdate) Net._onUpdate(id, JSON.parse(r.value));
      }catch(e){ /* esta entrada falló, seguimos con las demás */ }
    }
    for(const id of otherPlayersData.keys()){
      if(!seen.has(id) && Net._onRemove) Net._onRemove(id);
    }
  }catch(e){ /* sin conexión al storage compartido este ciclo */ }
}

// red de seguridad para ambos modos: si un jugador no manda novedades en 15s,
// lo consideramos desconectado (Firebase ya lo maneja con onDisconnect, esto
// cubre cortes de red abruptos que a veces ese mecanismo no llega a detectar)
function sweepStalePlayers(){
  const now = Date.now();
  otherPlayersData.forEach((data, id)=>{
    if(now - (data.ts||0) > 15000) removeOtherPlayer(id);
  });
}

let presenceStarted = false;
async function startPresenceLoop(){
  if(presenceStarted) return;
  presenceStarted = true;
  Net.onUpdate((id, data)=> upsertOtherPlayer(id, data));
  Net.onRemove((id)=> removeOtherPlayer(id));
  await initNet();
  netBroadcast();
  const sendInterval = Net.mode === 'firebase' ? 150 : 2500;
  setInterval(netBroadcast, sendInterval);
  if(Net.mode === 'storage'){
    netPollStorage();
    setInterval(netPollStorage, 2500);
  }
  setInterval(sweepStalePlayers, 5000);
}

function updateAvatars(dt){
  const lerpSpeed = Net.mode === 'firebase' ? 10 : 3;
  otherPlayerAvatars.forEach(av=>{
    av.group.position.lerp(av.target, Math.min(1, dt*lerpSpeed));
  });
}

/* ======================= REINICIO PERIÓDICO DE LA MINA ======================= */
// Cada 30 minutos (alineado al reloj real, sin necesitar red) la mina activa
// se regenera por completo y los jugadores son teletransportados a la superficie.
const RESET_INTERVAL_MS = 30*60*1000;
function nextResetBoundary(now){ return Math.ceil(now/RESET_INTERVAL_MS)*RESET_INTERVAL_MS; }
let nextResetAt = nextResetBoundary(Date.now());

function doMineReset(){
  regenerateField();
  player.x = 0; player.y = 6; player.z = 8; vel.y = 0;
  toast('⛏️ ¡La mina se regeneró! Todos a la superficie.', '#6fe7ff');
  nextResetAt = nextResetBoundary(Date.now() + 1);
}

function updateResetCountdown(){
  const remain = Math.max(0, nextResetAt - Date.now());
  if(remain <= 0){ doMineReset(); return; }
  const mm = Math.floor(remain/60000);
  const ss = Math.floor((remain%60000)/1000);
  resetCountdownEl.textContent = String(mm).padStart(2,'0') + ':' + String(ss).padStart(2,'0');
  resetBadge.classList.toggle('warn', remain < 60000);
}

let resetTimerStarted = false;
function startResetTimer(){
  if(resetTimerStarted) return;
  resetTimerStarted = true;
  updateResetCountdown();
  setInterval(updateResetCountdown, 1000);
}

/* ======================= INPUT ======================= */
const startScreen = document.getElementById('startScreen');
const nameInput = document.getElementById('nameInput');
const playBtn = document.getElementById('playBtn');

// Pointer Lock real: esconde el cursor del sistema operativo y da movimiento
// relativo sin límite (antes, sin esto, el cursor chocaba contra el borde de
// la ventana y la cámara dejaba de girar — por eso "se sentía trabada").
// Si el entorno lo rechaza (pointerlockerror), cae solo a rotación libre
// (la que había antes) como red de seguridad.
let pointerLocked = false;
let pointerLockSupported = true;

function requestLook(){
  if(!pointerLockSupported || pointerLocked) return;
  try{ canvas.requestPointerLock(); }catch(e){ /* se resuelve vía pointerlockerror */ }
}
function releaseLook(){
  try{ if(document.pointerLockElement === canvas) document.exitPointerLock(); }catch(e){ /* no crítico */ }
}
document.addEventListener('pointerlockchange', ()=>{
  pointerLocked = (document.pointerLockElement === canvas);
});
document.addEventListener('pointerlockerror', ()=>{
  pointerLockSupported = false;
  console.warn('[MINA3D] Pointer Lock no disponible en este entorno, uso rotación libre sin bloqueo de cursor.');
});

playBtn.disabled = true;
playBtn.textContent = 'Cargando...';
function timeout(ms){ return new Promise(res=>setTimeout(res, ms)); }
(async ()=>{
  await Promise.race([
    (async ()=>{ await loadProfile(); await loadProgress(); })(),
    timeout(4000), // red de seguridad: si el storage no responde, igual dejamos jugar
  ]);
  if(state.stage !== 0) applyStageTheme(state.stage);
  updateHUD();
  playBtn.disabled = false;
  playBtn.textContent = 'JUGAR';
})();

playBtn.onclick = ()=>{
  const typed = nameInput.value.trim();
  if(typed) myProfile.name = typed.slice(0,16);
  saveProfile();
  startScreen.classList.add('hidden');
  hud.classList.remove('hidden');
  gameStarted = true;
  equipPickaxeVisual();
  startPresenceLoop();
  startResetTimer();
  requestLook();
};

canvas.addEventListener('contextmenu', (e)=> e.preventDefault());

canvas.addEventListener('mousedown', (e)=>{
  if(!gameStarted || isPaused) return;
  if(e.button === 0){ isMining = true; }
});
window.addEventListener('mouseup', (e)=>{
  if(e.button === 0) isMining = false;
});
window.addEventListener('blur', ()=>{ isMining=false; });

canvas.addEventListener('click', ()=>{
  if(gameStarted && !isPaused) requestLook();
});

window.addEventListener('mousemove', (e)=>{
  if(!gameStarted || isPaused) return;
  yaw -= e.movementX * 0.0032;
  pitch -= e.movementY * 0.0032;
  pitch = Math.max(-Math.PI/2+0.05, Math.min(Math.PI/2-0.05, pitch));
});

let nearSell = false, nearShop = false, nearPortal = false, nearEgg = false;
window.addEventListener('keydown', (e)=>{
  const k = e.key.toLowerCase();
  if(k==='w') keysState.w=true;
  if(k==='a') keysState.a=true;
  if(k==='s') keysState.s=true;
  if(k==='d') keysState.d=true;
  if(k==='shift') keysState.shift=true;
  if(k===' '){ keysState.space=true; e.preventDefault(); }
  if(k==='e' && !e.repeat && gameStarted && !isPaused){
    if(nearSell) sellAll();
    else if(nearShop) openShop();
    else if(nearPortal) openStages();
    else if(nearEgg) openPets();
  }
  if(k==='escape'){
    if(shopOpenFlag) closeShop();
    if(rebirthOpenFlag) closeRebirth();
    if(stagesOpenFlag) closeStages();
    if(petsOpenFlag) closePets();
  }
});
window.addEventListener('keyup', (e)=>{
  const k = e.key.toLowerCase();
  if(k==='w') keysState.w=false;
  if(k==='a') keysState.a=false;
  if(k==='s') keysState.s=false;
  if(k==='d') keysState.d=false;
  if(k==='shift') keysState.shift=false;
  if(k===' ') keysState.space=false;
});

function updateProximity(){
  const dSell = Math.hypot(player.x-SELL_POS.x, player.z-SELL_POS.z);
  const dShop = Math.hypot(player.x-SHOP_POS.x, player.z-SHOP_POS.z);
  const dPortal = Math.hypot(player.x-PORTAL_POS.x, player.z-PORTAL_POS.z);
  const dEgg = Math.hypot(player.x-EGG_POS.x, player.z-EGG_POS.z);
  nearSell = dSell < 3;
  nearShop = dShop < 3;
  nearPortal = dPortal < 3;
  nearEgg = dEgg < 3;
  promptSell.style.display = nearSell ? 'block' : 'none';
  promptShop.style.display = (!nearSell && nearShop) ? 'block' : 'none';
  promptPortal.style.display = (!nearSell && !nearShop && nearPortal) ? 'block' : 'none';
  promptEgg.style.display = (!nearSell && !nearShop && !nearPortal && nearEgg) ? 'block' : 'none';
}

/* ======================= MAIN LOOP ======================= */
let lastTime = performance.now();
function animate(now){
  requestAnimationFrame(animate);
  const dt = Math.min((now-lastTime)/1000, 0.05);
  lastTime = now;
  const t = now/1000;

  if(gameStarted && !isPaused){
    updatePlayer(dt);
    camera.position.set(player.x, player.y+EYE_HEIGHT, player.z);
    camera.rotation.set(pitch, yaw, 0);
    headlamp.position.set(player.x, player.y+EYE_HEIGHT, player.z);

    const hit = getTarget();
    if(hit && hit.distance <= REACH){
      crosshair.classList.add('active');
      if(isMining){ mine(hit, dt); }
    } else {
      crosshair.classList.remove('active');
    }
    updateTargetPanel(hit);

    updateParticles(dt);
    updateProximity();
  } else {
    isMining = false;
    targetInfo.classList.remove('show');
  }

  const moving = keysState.w||keysState.a||keysState.s||keysState.d;
  updateViewmodel(dt, now, moving && gameStarted && !isPaused);

  sellIcon.rotation.y += dt*0.8;
  sellIcon.position.y = 1.9 + Math.sin(t*1.4)*0.08;
  shopIcon.rotation.y += dt*0.8;
  shopIcon.position.y = 1.9 + Math.sin(t*1.4+1.5)*0.08;
  portalIcon.rotation.y += dt*0.6;
  portalIcon.rotation.x += dt*0.4;
  portalIcon.position.y = 1.9 + Math.sin(t*1.4+3)*0.08;
  eggIcon.rotation.y += dt*0.8;
  eggIcon.position.y = 1.9 + Math.sin(t*1.4+4.5)*0.08;

  updateGlow(t);
  updateTorchFlicker(t);
  updateDust(dt);
  updateAvatars(dt);

  renderer.render(scene, camera);
}
updateHUD();
requestAnimationFrame(animate);

})();
