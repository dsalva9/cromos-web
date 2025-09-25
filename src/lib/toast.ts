import { toast as sonnerToast, type ExternalToast } from 'sonner';

type ToastType = 'success' | 'error' | 'info';

type ToastOptions = ExternalToast;

type CompatToast = typeof sonnerToast & {
  (message: string, type?: ToastType, options?: ToastOptions): string | number;
};

const compatToast = ((
  message: string,
  type: ToastType = 'info',
  options: ToastOptions = {}
) => {
  switch (type) {
    case 'success':
      return sonnerToast.success(message, options);
    case 'error':
      return sonnerToast.error(message, options);
    default:
      return sonnerToast.info(message, options);
  }
}) as CompatToast;

Object.assign(compatToast, sonnerToast);

export { compatToast as toast };
export type { ToastOptions, ToastType };
