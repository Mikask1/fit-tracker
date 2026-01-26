'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { WifiOff, RefreshCw } from 'lucide-react';

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    setIsOnline(navigator.onLine);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleRetry = () => {
    if (navigator.onLine) {
      window.location.reload();
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <WifiOff className="h-16 w-16 text-muted-foreground" />
          </div>
          <CardTitle>You're Offline</CardTitle>
          <CardDescription>
            This page is not available offline. Please check your internet connection.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground text-center">
            {isOnline
              ? 'Connection restored! You can reload the page.'
              : 'Waiting for connection...'
            }
          </div>
          <Button
            onClick={handleRetry}
            className="w-full"
            disabled={!isOnline}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            {isOnline ? 'Reload Page' : 'Offline'}
          </Button>
          <div className="text-center">
            <Button variant="link" onClick={() => window.history.back()}>
              Go Back
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
