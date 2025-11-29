'use client';

import { usePathname } from 'next/navigation';
import { BottomNav } from './BottomNav';

const AUTH_ROUTES = ['/login', '/signup'];

export function BottomNavWrapper() {
  const pathname = usePathname();
  const shouldHideNav = AUTH_ROUTES.includes(pathname);

  if (shouldHideNav) {
    return null;
  }

  return <BottomNav />;
}
