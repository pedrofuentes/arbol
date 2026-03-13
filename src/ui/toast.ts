let toastStack = 0;

export function showToast(
  message: string,
  type: 'error' | 'success' | 'info' = 'info',
  duration = 4000,
): void {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.setAttribute('role', 'alert');
  toast.textContent = message;

  const offset = 60 + toastStack * 50;
  toastStack++;

  Object.assign(toast.style, {
    position: 'fixed',
    bottom: `${offset}px`,
    left: '50%',
    transform: 'translateX(-50%)',
    padding: '10px 20px',
    borderRadius: 'var(--radius-lg, 10px)',
    zIndex: '10000',
    maxWidth: '400px',
    textAlign: 'center',
    fontSize: 'var(--text-base, 14px)',
    fontFamily: 'var(--font-sans)',
    pointerEvents: 'none',
    opacity: '0',
    transition: 'opacity 0.2s ease',
  });

  document.body.appendChild(toast);
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
  });

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => {
      toast.remove();
      toastStack = Math.max(0, toastStack - 1);
    }, 200);
  }, duration);
}
