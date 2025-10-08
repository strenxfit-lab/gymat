"use client";

import { useState, useEffect } from 'react';
import { Button } from './button';
import { Download, Share } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from './alert';

export function InstallPWA() {
  const [installPrompt, setInstallPrompt] = useState<Event | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };

    const isIosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIosDevice);
    if (typeof window !== 'undefined') {
      setIsStandalone((window.navigator as any).standalone === true);
    }
    
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(registration => {
          console.log('ServiceWorker registration successful with scope: ', registration.scope);
        }, err => {
          console.log('ServiceWorker registration failed: ', err);
        });
      });
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = () => {
    if (!installPrompt) return;

    (installPrompt as any).prompt();

    (installPrompt as any).userChoice.then((choiceResult: { outcome: 'accepted' | 'dismissed' }) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt');
      } else {
        console.log('User dismissed the install prompt');
      }
      setInstallPrompt(null);
    });
  };

  if (isIOS && !isStandalone) {
    return (
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-11/12 max-w-md z-50">
        <Alert>
          <Share className="h-4 w-4" />
          <AlertTitle>Install Strenx!</AlertTitle>
          <AlertDescription>
            Tap the Share icon, then "Add to Home Screen" to install the app for a better experience.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (installPrompt) {
    return (
      <Button
        onClick={handleInstallClick}
        className="fixed bottom-4 right-4 z-50 shadow-lg"
      >
        <Download className="mr-2 h-4 w-4" />
        Install App
      </Button>
    );
  }

  return null;
}
