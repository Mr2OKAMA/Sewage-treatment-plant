import { playerState, getCheckpoint } from './gameState.js';

const STORAGE_KEY = 'sewage_deaths';

// 死亡図鑑マスター（死にパターンを増やすときはここに追記）
export const DEATHS = {
  DEATH_001: { no: '001', name: '硫化水素中毒' },
};

// --- 図鑑（localStorage）---
export function getCollectedDeaths() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function recordDeath(deathId) {
  const list = getCollectedDeaths();
  if (!list.includes(deathId)) {
    list.push(deathId);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch { /* 保存不可環境では無視 */ }
  }
  return list;
}

// --- DOM ---
let root, titleEl, reasonEl, bookEl, restartBtn;
let onRestartCb = () => {};
let active = false;
let audioCtx = null;

export function isGameOver() {
  return active;
}

export function initGameOver({ onRestart } = {}) {
  if (onRestart) onRestartCb = onRestart;

  root = document.createElement('div');
  root.id = 'gameover';
  root.className = 'hidden';
  root.innerHTML = `
    <div class="go-inner">
      <div class="go-title"></div>
      <div class="go-reason"></div>
      <div class="go-book"></div>
      <button class="go-restart" type="button">直前からやり直す</button>
    </div>`;
  document.body.appendChild(root);

  titleEl = root.querySelector('.go-title');
  reasonEl = root.querySelector('.go-reason');
  bookEl = root.querySelector('.go-book');
  restartBtn = root.querySelector('.go-restart');
  restartBtn.addEventListener('click', restart);
}

function playNoise(duration = 0.7) {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const len = Math.floor(audioCtx.sampleRate * duration);
    const buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = audioCtx.createBufferSource();
    src.buffer = buf;
    const gain = audioCtx.createGain();
    gain.gain.value = 0.25;
    src.connect(gain).connect(audioCtx.destination);
    src.start();
  } catch { /* オーディオ不可でも続行 */ }
}

function renderBook(collected) {
  const entries = Object.entries(DEATHS).map(([id, d]) =>
    collected.includes(id)
      ? `<li>No.${d.no} ${d.name}</li>`
      : '<li class="locked">No.??? ？？？</li>'
  );
  const got = Object.keys(DEATHS).filter((id) => collected.includes(id)).length;
  bookEl.innerHTML =
    `<div class="go-book-title">― 死亡図鑑 ${got}/${Object.keys(DEATHS).length} ―</div><ul>${entries.join('')}</ul>`;
}

/**
 * ゲームオーバーを発火する。
 * @param {string} deathId 例: 'DEATH_001'
 * @param {string} reasonText 死因の説明文
 */
export function triggerGameOver(deathId, reasonText) {
  if (active || !root) return;
  active = true;
  playerState.uiOpen = true; // 移動・インタラクト停止

  const info = DEATHS[deathId] ?? { no: deathId.replace(/\D/g, '') || '???', name: '不明' };
  const collected = recordDeath(deathId);

  titleEl.textContent = `GAME OVER - No.${info.no} [${info.name}]`;
  reasonEl.textContent = reasonText;
  renderBook(collected);

  // 即時暗転 + シェイク + ノイズ
  document.exitPointerLock?.(); // ボタンをクリックできるようにロック解除
  root.classList.remove('hidden');
  root.classList.add('shake');
  document.body.classList.add('shake');
  playNoise();
  setTimeout(() => {
    root.classList.remove('shake');
    document.body.classList.remove('shake');
  }, 700);
}

function restart() {
  if (!active) return;
  active = false;
  playerState.uiOpen = false;
  root.classList.add('hidden');
  onRestartCb(getCheckpoint());
}
