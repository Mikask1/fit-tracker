/**
 * Notification utilities for PWA
 * Handles permission requests and sending system notifications
 */

export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  vibrate?: number[];
  requireInteraction?: boolean;
}

/**
 * Check if browser supports notifications
 */
export function isNotificationSupported(): boolean {
  return 'Notification' in window && 'serviceWorker' in navigator;
}

/**
 * Check current notification permission status
 */
export function getNotificationPermission(): NotificationPermission {
  if (!isNotificationSupported()) {
    return 'denied';
  }
  return Notification.permission;
}

/**
 * Request notification permission from user
 * Returns true if granted, false otherwise
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!isNotificationSupported()) {
    console.warn('Notifications not supported in this browser');
    return false;
  }

  // Already granted
  if (Notification.permission === 'granted') {
    return true;
  }

  // Already denied
  if (Notification.permission === 'denied') {
    console.warn('Notification permission denied');
    return false;
  }

  // Request permission
  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (error) {
    console.error('Failed to request notification permission:', error);
    return false;
  }
}

/**
 * Send a system notification
 * Automatically requests permission if not granted
 */
export async function sendNotification(options: NotificationOptions): Promise<boolean> {
  if (!isNotificationSupported()) {
    console.warn('Notifications not supported');
    return false;
  }

  // Request permission if needed
  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) {
    console.warn('Notification permission not granted');
    return false;
  }

  try {
    // Get service worker registration
    const registration = await navigator.serviceWorker.ready;

    // Show notification via service worker (works even when app is closed)
    const notificationOptions: any = {
      body: options.body,
      icon: options.icon || '/icons/web-app-manifest-192x192.png',
      badge: options.badge || '/icons/favicon-96x96.png',
      tag: options.tag || 'fittrack-notification',
      requireInteraction: options.requireInteraction || false,
      silent: false,
      data: {
        url: window.location.origin,
      },
    };

    // Add vibrate if supported
    if (options.vibrate) {
      notificationOptions.vibrate = options.vibrate;
    }

    await registration.showNotification(options.title, notificationOptions);

    return true;
  } catch (error) {
    console.error('Failed to show notification:', error);

    // Fallback: try basic notification API (won't work when app is closed)
    try {
      new Notification(options.title, {
        body: options.body,
        icon: options.icon || '/icons/web-app-manifest-192x192.png',
        tag: options.tag,
      });
      return true;
    } catch (fallbackError) {
      console.error('Fallback notification also failed:', fallbackError);
      return false;
    }
  }
}

/**
 * Update app badge count (shows number on app icon)
 * Only works on supported platforms (Android, Windows)
 */
export async function updateBadge(count: number): Promise<void> {
  if ('setAppBadge' in navigator) {
    try {
      if (count > 0) {
        await (navigator as any).setAppBadge(count);
      } else {
        await (navigator as any).clearAppBadge();
      }
    } catch (error) {
      console.error('Failed to update badge:', error);
    }
  }
}

/**
 * Clear app badge
 */
export async function clearBadge(): Promise<void> {
  await updateBadge(0);
}

/**
 * Vibrate device (mobile only)
 */
export function vibrate(pattern: number | number[] = 200): void {
  if ('vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
}
