import * as THREE from 'three';
import { playerState, hasItem } from './gameState.js';
import { triggerGameOver } from './gameOver.js';

/**
 * エリアイベント判定。zones に追加していけば死にパターンを増やせる。
 * エリアに「入った縮間」に一度だけ onEnter を実行する。
 */
export const PIT_STAIRS_BOX = new THREE.Box3(
  new THREE.Vector3(6, 0, -9),
  new THREE.Vector3(9, 3, -5)
);

export function setupEvents() {
  const zones = [
    {
      id: 'pit_stairs',
      box: PIT_STAIRS_BOX,
      onEnter() {
        // 検知器を持たずに地下ピットへ→即死
        if (!hasItem('gas_detector')) {
          triggerGameOver('DEATH_001', '検知器なしで地下へ降り、高濃度硫化水素を吸って即死した');
        }
      },
    },
  ];

  const inside = new Set();
  const p = new THREE.Vector3();

  function update() {
    p.set(playerState.position.x, playerState.position.y, playerState.position.z);
    for (const z of zones) {
      const now = z.box.containsPoint(p);
      const was = inside.has(z.id);
      if (now && !was) {
        inside.add(z.id);
        z.onEnter();
      } else if (!now && was) {
        inside.delete(z.id);
      }
    }
  }

  return { update };
}
