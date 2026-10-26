import { playerState } from './state.js';

const el = document.getElementById('inventory');

export function addItem(name) {
  playerState.inventory.push(name);
  renderInventory();
}

export function renderInventory() {
  const list = playerState.inventory.length
    ? playerState.inventory.map((n) => `<div>・${n}</div>`).join('')
    : '<div>(なし)</div>';
  el.innerHTML = `<div class="title">所持品</div>${list}`;
}

renderInventory();
