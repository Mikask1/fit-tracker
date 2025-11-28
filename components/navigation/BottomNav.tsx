'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Dumbbell, ListChecks, Calendar, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  {
    href: '/',
    icon: Home,
    label: 'Home',
  },
  {
    href: '/movements',
    icon: Dumbbell,
    label: 'Movements',
  },
  {
    href: '/routines',
    icon: ListChecks,
    label: 'Routines',
  },
  {
    href: '/calendar',
    icon: Calendar,
    label: 'Calendar',
  },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border">
      <div className="flex justify-around items-center h-16 pb-safe">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 min-w-16 min-h-12 px-2 transition-colors',
                isActive
                  ? 'text-primary font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
