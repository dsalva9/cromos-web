type ToastType = 'success' | 'error' | 'info';

interface ToastOptions {
  duration?: number;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

export function toast(
  message: string,
  type: ToastType = 'info',
  options: ToastOptions = {}
) {
  const { duration = 4000, position = 'top-right' } = options;

  // Remove any existing toasts
  const existingToasts = document.querySelectorAll('[data-toast]');
  existingToasts.forEach(toast => toast.remove());

  // Create toast element
  const toastElement = document.createElement('div');
  toastElement.setAttribute('data-toast', 'true');

  // Position classes
  const positionClasses = {
    'top-right': 'top-20 right-4',
    'top-left': 'top-20 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
  };

  // Color classes based on type
  const colorClasses = {
    success: 'bg-green-500 border-green-600',
    error: 'bg-red-500 border-red-600',
    info: 'bg-blue-500 border-blue-600',
  };

  toastElement.className = `
    fixed ${positionClasses[position]} z-50 
    ${colorClasses[type]} text-white 
    px-4 py-3 rounded-lg shadow-lg border-l-4
    max-w-sm animate-in slide-in-from-right duration-300
    cursor-pointer transition-all hover:scale-105
  `.trim();

  toastElement.innerHTML = `
    <div class="flex items-center space-x-2">
      <div class="flex-1">
        <p class="text-sm font-medium">${message}</p>
      </div>
      <button class="ml-2 text-white/80 hover:text-white" aria-label="Cerrar">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>
    </div>
  `;

  // Add click to dismiss
  toastElement.addEventListener('click', () => {
    removeToast(toastElement);
  });

  // Add to DOM
  document.body.appendChild(toastElement);

  // Auto-remove after duration
  setTimeout(() => {
    removeToast(toastElement);
  }, duration);
}

function removeToast(element: HTMLElement) {
  element.style.transform = 'translateX(100%)';
  element.style.opacity = '0';
  setTimeout(() => {
    if (element.parentNode) {
      element.parentNode.removeChild(element);
    }
  }, 300);
}

// Convenience methods
toast.success = (message: string, options?: ToastOptions) =>
  toast(message, 'success', options);
toast.error = (message: string, options?: ToastOptions) =>
  toast(message, 'error', options);
toast.info = (message: string, options?: ToastOptions) =>
  toast(message, 'info', options);
