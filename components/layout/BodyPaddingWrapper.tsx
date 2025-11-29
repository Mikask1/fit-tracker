'use client';

import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';

const AUTH_ROUTES = ['/login', '/signup'];

interface BodyPaddingWrapperProps {
  children: ReactNode;
}

export function BodyPaddingWrapper({ children }: BodyPaddingWrapperProps) {
  const pathname = usePathname();
  const shouldRemovePadding = AUTH_ROUTES.includes(pathname);

  return (
    <div className={shouldRemovePadding ? '' : 'pb-16'}>
      {children}
    </div>
  );
}
