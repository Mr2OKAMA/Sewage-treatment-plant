import { playerState, ITEM_NAMES, addItemToState } from './gameState.js';

const el = document.getElementById('inventory');

/** アイテムIDを受け取ってインベントリに追加 */
export function addItem(id) {
  addItemToState(id);
  renderInventory();
}

export function renderInventory() {
  const list = playerState.inventory.length
    ? playerState.inventory.map((id) => `<div>・${ITEM_NAMES[id] ?? id}</div>`).join('')
    : '<div>(なし)</div>';
  el.innerHTML = `<div class="title">所持品</div>${list}`;
}

renderInventory();
