import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { playerState } from './state.js';

const SPEED = 4.0;        // m/s
const PLAYER_RADIUS = 0.35;

export function setupControls({ camera, domElement, overlay, flashlight, walls }) {
  const controls = new PointerLockControls(camera, domElement);

  // クリックでポインタロック
  overlay.addEventListener('click', () => controls.lock());
  controls.addEventListener('lock', () => (overlay.style.display = 'none'));
  controls.addEventListener('unlock', () => (overlay.style.display = 'flex'));

  // キー入力
  const keys = { w: false, a: false, s: false, d: false };
  window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (k in keys) keys[k] = true;
    if (k === 'f' && !e.repeat) flashlight.visible = !flashlight.visible;
  });
  window.addEventListener('keyup', (e) => {
    const k = e.key.toLowerCase();
    if (k in keys) keys[k] = false;
  });

  // 当たり判定: 壁のバウンディングボックスとプレイヤーのAABBで判定
  const wallBoxes = walls.map((m) => new THREE.Box3().setFromObject(m));
  const playerBox = new THREE.Box3();

  function collides(pos) {
    playerBox.min.set(pos.x - PLAYER_RADIUS, 0, pos.z - PLAYER_RADIUS);
    playerBox.max.set(pos.x + PLAYER_RADIUS, 2, pos.z + PLAYER_RADIUS);
    return wallBoxes.some((b) => b.intersectsBox(playerBox));
  }

  const dir = new THREE.Vector3();

  function update(delta) {
    if (!controls.isLocked || playerState.uiOpen) return; // ダイアログ中は移動不可

    dir.set(
      Number(keys.d) - Number(keys.a), // 右/左
      0,
      Number(keys.w) - Number(keys.s)  // 前/後
    );
    if (dir.lengthSq() === 0) return;
    dir.normalize().multiplyScalar(SPEED * delta);

    const obj = controls.getObject();

    // 軸ごとに移動 → 壁に沿ってスライドできる
    const prev = obj.position.clone();

    controls.moveRight(dir.x);
    if (collides(obj.position)) obj.position.x = prev.x;

    const afterX = obj.position.clone();
    controls.moveForward(dir.z);
    if (collides(obj.position)) {
      obj.position.z = prev.z;
      obj.position.x = afterX.x;
    }
  }

  return { controls, update };
}
