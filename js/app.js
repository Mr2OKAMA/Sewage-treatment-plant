import * as THREE from 'three';
import { setupControls } from './controls.js';
import { setupInteraction } from './interaction.js';
import { PhoneUI } from './phone.js';
import { addItem } from './inventory.js';
import { gameState, playerState, ITEM_NAMES, saveCheckpoint } from './gameState.js';
import { initGameOver } from './gameOver.js';
import { setupEvents, PIT_STAIRS_BOX } from './events.js';

// --- Renderer（低解像度化）---
const RENDER_SCALE = 0.4; // 小さいほど荒くなる
const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setPixelRatio(RENDER_SCALE);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// --- Scene / Fog ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
scene.fog = new THREE.FogExp2(0x050505, 0.12);

// --- Camera ---
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 1.6, 0);
scene.add(camera);

// --- 弱い環境光 ---
scene.add(new THREE.AmbientLight(0x111111));

// --- 懐中電灯（カメラに追従）---
const flashlight = new THREE.SpotLight(0xffffee, 60, 25, Math.PI / 7, 0.4, 1.5);
flashlight.position.set(0, 0, 0);
flashlight.target.position.set(0, 0, -1);
camera.add(flashlight);
camera.add(flashlight.target);

// --- 簡易マップ ---
const walls = []; // 当たり判定用 Mesh
const wallMat = new THREE.MeshStandardMaterial({ color: 0x555a55, roughness: 0.9 });

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(40, 40),
  new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 1 })
);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), wallMat);
ceiling.position.y = 3;
ceiling.rotation.x = Math.PI / 2;
scene.add(ceiling);

function addWall(x, z, w, d, h = 3) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
  mesh.position.set(x, h / 2, z);
  scene.add(mesh);
  walls.push(mesh);
}
// 外周
addWall(0, -10, 20, 1);
addWall(0, 10, 20, 1);
addWall(-10, 0, 1, 20);
addWall(10, 0, 1, 20);
// 内部
addWall(-3, -3, 6, 1);
addWall(4, 3, 1, 6);

// --- 地下ピットへの階段エリア（視覚マーカー：暗い穴）---
const pitCenter = new THREE.Vector3();
PIT_STAIRS_BOX.getCenter(pitCenter);
const pitMarker = new THREE.Mesh(
  new THREE.PlaneGeometry(3, 4),
  new THREE.MeshBasicMaterial({ color: 0x000000 })
);
pitMarker.rotation.x = -Math.PI / 2;
pitMarker.position.set(pitCenter.x, 0.02, pitCenter.z);
scene.add(pitMarker);

// --- インタラクト対象 ---
const interactableObjects = [];

// 電話機（壁掛け・西壁の内側）
const phoneMat = new THREE.MeshStandardMaterial({
  color: 0x222222, emissive: 0xff0000, emissiveIntensity: 0, roughness: 0.6,
});
const phone = new THREE.Group();
const phoneBody = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.3, 0.25), phoneMat);
const phoneHandset = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.3), phoneMat);
phoneHandset.position.set(0.08, 0.1, 0);
phone.add(phoneBody, phoneHandset);
phone.position.set(-9.4, 1.4, -6);
scene.add(phone);
interactableObjects.push(phone);

// ガス検知器・鍵（床に落ちているアイテム） — id は ITEM_NAMES のキー
function spawnItem(id, color, x, z, size) {
  const name = ITEM_NAMES[id] ?? id;
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(...size),
    new THREE.MeshStandardMaterial({ color, roughness: 0.5 })
  );
  mesh.position.set(x, size[1] / 2, z);
  mesh.userData.prompt = `E: 拾う（${name}）`;
  mesh.userData.onInteract = (obj) => {
    addItem(id);
    scene.remove(obj);
    interactableObjects.splice(interactableObjects.indexOf(obj), 1);
  };
  scene.add(mesh);
  interactableObjects.push(mesh);
}
spawnItem('gas_detector', 0x3a8f3a, 3, -6, [0.15, 0.25, 0.08]);
spawnItem('key', 0xd4af37, -6, 6, [0.12, 0.03, 0.05]);

// --- 電話UI ---
const phoneUI = new PhoneUI({
  root: document.getElementById('phone-ui'),
  textEl: document.getElementById('phone-text'),
  lines: [
    '……もしもし？ 聞こえるか。新人だな。',
    '第3ポンプ室でガス漏れの警報が出ている。点検に行ってくれ。',
    '床にガス検知器が落ちているはずだ。必ず持っていけ。',
    '……それと、奥の扉の鍵も忘れるなよ。いいか、絶対に一人で深入りするな。',
  ],
  onClose: () => {
    gameState.phoneRinging = false;
    phone.userData.prompt = '(通話は終わった)';
    // 通話完了をチェックポイントにする
    saveCheckpoint('phone_done', camera.position);
  },
});

phone.userData.prompt = 'E: 電話に出る';
phone.userData.onInteract = () => {
  if (!gameState.phoneRinging) return;
  stopRingSound();
  phoneUI.open();
};

// --- 着信音（WebAudio）と点滅 ---
let audioCtx = null;
let ringTimer = null;

function beep() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'square';
  osc.frequency.value = 880;
  gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.4);
}

function startRingSound() {
  if (ringTimer) return;
  ringTimer = setInterval(() => {
    if (gameState.phoneRinging) beep();
  }, 1500);
}

function stopRingSound() {
  clearInterval(ringTimer);
  ringTimer = null;
}

// --- Controls / Interaction ---
const controls = setupControls({
  camera,
  domElement: renderer.domElement,
  overlay: document.getElementById('overlay'),
  flashlight,
  walls,
});

const interaction = setupInteraction({
  camera,
  interactableObjects,
  walls,
  controls: controls.controls,
  phoneUI,
});

// --- GameOver / Events ---
initGameOver({
  // チェックポイントへ復帰（所持品・フラグは保持したまま）
  onRestart: (cp) => {
    camera.position.set(cp.position.x, cp.position.y, cp.position.z);
  },
});
const events = setupEvents();

// ポインタロック開始後（ユーザー操作後）に着信音を開始
controls.controls.addEventListener('lock', () => {
  if (gameState.phoneRinging) startRingSound();
});

// --- Resize ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Loop ---
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  controls.update(Math.min(clock.getDelta(), 0.05));

  // プレイヤー位置を状態に反映
  playerState.position.x = camera.position.x;
  playerState.position.y = camera.position.y;
  playerState.position.z = camera.position.z;

  events.update();
  interaction.update();

  // 着信中は電話機を赤く点滅
  phoneMat.emissiveIntensity = gameState.phoneRinging
    ? (Math.sin(clock.elapsedTime * 10) > 0 ? 1.5 : 0)
    : 0;

  renderer.render(scene, camera);
}
animate();
