import * as THREE from 'three';
import { setupControls } from './controls.js';

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

// --- Controls ---
const controls = setupControls({
  camera,
  domElement: renderer.domElement,
  overlay: document.getElementById('overlay'),
  flashlight,
  walls,
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
  renderer.render(scene, camera);
}
animate();
