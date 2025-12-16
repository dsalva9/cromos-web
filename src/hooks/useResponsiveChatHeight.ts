import { useState, useEffect } from 'react';

export function useResponsiveChatHeight() {
  const [chatHeight, setChatHeight] = useState('500px');

  useEffect(() => {
    const updateHeight = () => {
      if (window.innerWidth < 768) {
        // Mobile: Full viewport minus chrome
        // header(60) + listing-card(120) + composer(180) + bottom-nav(80)
        const height = window.innerHeight - 60 - 120 - 180 - 80;
        setChatHeight(`${height}px`);
      } else {
        setChatHeight('500px');
      }
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  return chatHeight;
}
