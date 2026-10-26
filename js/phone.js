import { playerState } from './state.js';

/** レトロ電話ダイアログ（タイプライター表示） */
export class PhoneUI {
  constructor({ root, textEl, lines, charDelay = 45, onClose = () => {} }) {
    this.root = root;
    this.textEl = textEl;
    this.lines = lines;
    this.charDelay = charDelay;
    this.onClose = onClose;
    this.isOpen = false;
    this.lineIndex = 0;
    this.typing = false;
    this.timer = null;
  }

  open() {
    this.isOpen = true;
    playerState.uiOpen = true;
    this.root.classList.remove('hidden');
    this.lineIndex = 0;
    this._type(this.lines[0]);
  }

  /** E / クリックで呼ぶ: タイプ中なら全文表示、完了後なら次の行 or 終了 */
  advance() {
    if (!this.isOpen) return;
    if (this.typing) {
      this._finishTyping();
      return;
    }
    this.lineIndex++;
    if (this.lineIndex >= this.lines.length) {
      this.close();
    } else {
      this._type(this.lines[this.lineIndex]);
    }
  }

  close() {
    clearInterval(this.timer);
    this.typing = false;
    this.isOpen = false;
    playerState.uiOpen = false;
    this.root.classList.add('hidden');
    this.onClose();
  }

  _type(text) {
    clearInterval(this.timer);
    this.textEl.textContent = '';
    this.typing = true;
    this._current = text;
    let i = 0;
    this.timer = setInterval(() => {
      i++;
      this.textEl.textContent = text.slice(0, i);
      if (i >= text.length) this._finishTyping();
    }, this.charDelay);
  }

  _finishTyping() {
    clearInterval(this.timer);
    this.typing = false;
    this.textEl.textContent = this._current;
  }
}
