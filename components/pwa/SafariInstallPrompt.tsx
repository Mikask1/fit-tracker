'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Share, Plus, X } from 'lucide-react';

export function SafariInstallPrompt() {
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    // Check if already installed (running in standalone mode)
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(isInStandaloneMode);

    // Check if prompt was dismissed
    const dismissed = localStorage.getItem('safariInstallPromptDismissed');
    const dismissedTime = dismissed ? parseInt(dismissed, 10) : 0;
    const daysSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);

    // Show prompt if:
    // - It's iOS
    // - Not already installed
    // - Not dismissed, or dismissed more than 7 days ago
    if (isIOSDevice && !isInStandaloneMode && (!dismissed || daysSinceDismissed > 7)) {
      setShowPrompt(true);
    }
  }, []);

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('safariInstallPromptDismissed', Date.now().toString());
  };

  if (!isIOS || isStandalone || !showPrompt) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <CardTitle className="text-lg">Install FitTrack</CardTitle>
            <Button variant="ghost" size="icon" onClick={handleDismiss} className="h-6 w-6">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription className="space-y-2 pt-2">
            <p>Install this app on your iPhone for a better experience:</p>
            <ol className="space-y-1 text-sm">
              <li className="flex items-start gap-2">
                <span className="font-semibold">1.</span>
                <span className="flex items-center gap-1">
                  Tap the <Share className="inline h-4 w-4" /> Share button below
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold">2.</span>
                <span className="flex items-center gap-1">
                  Scroll and tap <Plus className="inline h-4 w-4" /> Add to Home Screen
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold">3.</span>
                <span>Tap &quot;Add&quot; in the top-right corner</span>
              </li>
            </ol>
          </CardDescription>
        </CardHeader>
        <CardFooter className="pt-3">
          <Button onClick={handleDismiss} variant="outline" className="w-full">
            Got it!
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
