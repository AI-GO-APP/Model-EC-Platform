/**
 * 示範商城 — Toast 通知元件
 */

let toastContainer = null;

function ensureContainer() {
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
  }
}

/**
 * 顯示 Toast 通知
 * @param {string} message - 訊息文字
 * @param {'success'|'error'|'info'} type - 類型
 * @param {number} duration - 持續時間 (ms)
 */
export function showToast(message, type = 'success', duration = 3000) {
  ensureContainer();

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  
  const icons = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
  };

  toast.innerHTML = `
    <span class="toast__icon">${icons[type] || 'ℹ'}</span>
    <span class="toast__message">${message}</span>
  `;

  toastContainer.appendChild(toast);

  // 觸發動畫
  requestAnimationFrame(() => toast.classList.add('toast--visible'));

  setTimeout(() => {
    toast.classList.remove('toast--visible');
    toast.addEventListener('transitionend', () => toast.remove());
  }, duration);
}
