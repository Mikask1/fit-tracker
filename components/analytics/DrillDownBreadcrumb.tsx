'use client';

import { ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DrillDownBreadcrumbProps {
  path: string[];
  onNavigate: (index: number) => void;
}

export function DrillDownBreadcrumb({
  path,
  onNavigate,
}: DrillDownBreadcrumbProps) {
  // Build breadcrumb items: ["All", ...path]
  const items = ['All', ...path];

  return (
    <nav className="mb-4 min-h-8">
      <div className="flex items-center flex-wrap gap-1 text-sm">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const targetIndex = index - 1; // -1 for "All" → [], 0 for first path element, etc.

          return (
            <div key={index} className="flex items-center shrink-0">
              {index > 0 && (
                <ChevronRight className="h-4 w-4 text-muted-foreground mx-1" />
              )}
              {isLast ? (
                <span className="font-medium text-foreground whitespace-nowrap">
                  {item}
                </span>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onNavigate(targetIndex)}
                  className="h-auto p-1 hover:underline text-muted-foreground hover:text-foreground whitespace-nowrap shrink-0"
                >
                  {item}
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
}
