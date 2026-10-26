import * as THREE from 'three';
import { playerState } from './state.js';

/**
 * 画面中央からRaycasterを飛ばし、interactableObjects にフォーカスしたら
 * クロスヘアの色変更 + プロンプト表示。E / 左クリックで onInteract を実行。
 *
 * interactable の userData: { prompt: string, onInteract: (obj) => void }
 */
export function setupInteraction({ camera, interactableObjects, walls, controls, phoneUI, maxDistance = 3 }) {
  const raycaster = new THREE.Raycaster(undefined, undefined, 0, maxDistance);
  const center = new THREE.Vector2(0, 0);
  const crosshair = document.getElementById('crosshair');
  const promptEl = document.getElementById('interact-prompt');

  let focused = null;

  function findInteractable(object) {
    let o = object;
    while (o) {
      if (o.userData && o.userData.onInteract) return o;
      o = o.parent;
    }
    return null;
  }

  function updateFocus() {
    focused = null;
    if (controls.isLocked && !playerState.uiOpen) {
      raycaster.setFromCamera(center, camera);
      // 壁越しに反応しないよう、壁も含めて最も近いヒットを判定
      const hits = raycaster.intersectObjects([...interactableObjects, ...walls], true);
      if (hits.length > 0) focused = findInteractable(hits[0].object);
    }

    if (focused) {
      crosshair.classList.add('active');
      promptEl.textContent = focused.userData.prompt;
      promptEl.style.display = 'block';
    } else {
      crosshair.classList.remove('active');
      promptEl.style.display = 'none';
    }
  }

  function interact() {
    if (!controls.isLocked) return;
    if (phoneUI.isOpen) {
      phoneUI.advance();
      return;
    }
    if (focused) focused.userData.onInteract(focused);
  }

  window.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'e' && !e.repeat) interact();
  });
  window.addEventListener('mousedown', (e) => {
    if (e.button === 0) interact();
  });

  return { update: updateFocus };
}
