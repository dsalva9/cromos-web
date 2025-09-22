// Simple toast utility - can be replaced with sonner or other toast library
let toastContainer: HTMLDivElement | null = null;

const createToastContainer = () => {
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'fixed top-4 right-4 z-50 space-y-2 max-w-sm';
    document.body.appendChild(toastContainer);
  }
  return toastContainer;
};

const createToast = (
  message: string,
  type: 'success' | 'error' | 'info' = 'info'
) => {
  const container = createToastContainer();
  const toast = document.createElement('div');

  const baseClasses =
    'px-4 py-3 rounded-lg shadow-lg text-white font-medium flex items-center space-x-2 animate-slide-in-right transform transition-all duration-300';

  const typeClasses = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
  };

  const icons = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
  };

  toast.className = `${baseClasses} ${typeClasses[type]}`;
  toast.innerHTML = `
    <span class="flex-shrink-0 w-5 h-5 flex items-center justify-center bg-white/20 rounded-full text-xs">
      ${icons[type]}
    </span>
    <span class="flex-1">${message}</span>
  `;

  container.appendChild(toast);

  // Auto remove after 4 seconds
  setTimeout(() => {
    toast.style.transform = 'translateX(100%)';
    toast.style.opacity = '0';
    setTimeout(() => {
      if (container.contains(toast)) {
        container.removeChild(toast);
      }
    }, 300);
  }, 4000);

  // Click to dismiss
  toast.addEventListener('click', () => {
    toast.style.transform = 'translateX(100%)';
    toast.style.opacity = '0';
    setTimeout(() => {
      if (container.contains(toast)) {
        container.removeChild(toast);
      }
    }, 300);
  });
};

export const toast = {
  success: (message: string) => createToast(message, 'success'),
  error: (message: string) => createToast(message, 'error'),
  info: (message: string) => createToast(message, 'info'),
};
