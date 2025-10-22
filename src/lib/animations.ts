/**
 * Animation utility functions and configurations
 */

export const animations = {
  // Stagger animation for lists
  staggerChildren: (index: number, delay = 50) => ({
    style: {
      animationDelay: `${index * delay}ms`,
    },
    className: 'animate-fade-in',
  }),

  // Number counter animation
  countUp: (
    start: number,
    end: number,
    duration: number,
    onUpdate: (value: number) => void
  ) => {
    const startTime = Date.now();
    const difference = end - start;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease out cubic function
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + difference * easeOut);

      onUpdate(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  },
};

// CSS classes for common animations
export const animationClasses = {
  fadeIn: 'animate-in fade-in duration-300',
  slideUp: 'animate-in slide-in-from-bottom-4 duration-300',
  slideDown: 'animate-in slide-in-from-top-4 duration-300',
  scaleIn: 'animate-in zoom-in-95 duration-200',
  stagger: 'animate-in fade-in slide-in-from-bottom-2',
  smooth: 'transition-all duration-300 ease-in-out',
  spring: 'transition-all duration-500 ease-out',
  ripple: 'relative overflow-hidden',
};

// Ripple effect for buttons
export const createRipple = (
  event: React.MouseEvent<HTMLElement>,
  color: string = 'rgba(255, 255, 255, 0.3)'
) => {
  const button = event.currentTarget;
  const rect = button.getBoundingClientRect();

  const circle = document.createElement('span');
  const diameter = Math.max(rect.width, rect.height);
  const radius = diameter / 2;

  circle.style.width = circle.style.height = `${diameter}px`;
  circle.style.left = `${event.clientX - rect.left - radius}px`;
  circle.style.top = `${event.clientY - rect.top - radius}px`;
  circle.style.position = 'absolute';
  circle.style.borderRadius = '50%';
  circle.style.backgroundColor = color;
  circle.style.transform = 'scale(0)';
  circle.style.animation = 'ripple 600ms ease-out';
  circle.style.pointerEvents = 'none';

  const ripple = button.getElementsByClassName('ripple')[0];
  if (ripple) {
    ripple.remove();
  }

  circle.className = 'ripple';
  button.appendChild(circle);

  setTimeout(() => {
    circle.remove();
  }, 600);
};
