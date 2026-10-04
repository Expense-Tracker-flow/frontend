'use client';

import { useEffect } from 'react';

export const PwaRegistrar: React.FC = () => {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .catch((err) => {
            console.debug('PWA ServiceWorker registration failed:', err);
          });
      });
    }
  }, []);

  return null;
};
