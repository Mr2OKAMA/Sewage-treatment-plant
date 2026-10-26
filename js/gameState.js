// ゲーム全体の状態・フラグ管理

// アイテムID -> 表示名
export const ITEM_NAMES = {
  gas_detector: 'ガス検知器',
  key: '鍵',
};

export const playerState = {
  inventory: [],                       // アイテムIDの配列 例: ['gas_detector']
  uiOpen: false,                       // ダイアログ/ゲームオーバー中は操作不可
  position: { x: 0, y: 1.6, z: 0 },    // 毎フレーム app.js から更新
};

export const gameState = {
  phoneRinging: true,
  flags: {
    hasGasDetector: false,
    pumpStopped: false,
  },
  checkpoint: { label: 'start', position: { x: 0, y: 1.6, z: 0 } },
};

// --- アイテム ---
export function hasItem(id) {
  return playerState.inventory.includes(id);
}

export function addItemToState(id) {
  if (!hasItem(id)) playerState.inventory.push(id);
  if (id === 'gas_detector') setFlag('hasGasDetector', true);
}

// --- フラグ ---
export function setFlag(name, value = true) {
  gameState.flags[name] = value;
}

export function getFlag(name) {
  return !!gameState.flags[name];
}

// --- チェックポイント ---
export function saveCheckpoint(label, position) {
  gameState.checkpoint = {
    label,
    position: { x: position.x, y: position.y, z: position.z },
  };
}

export function getCheckpoint() {
  return gameState.checkpoint;
}
