'use client';

import { trpc } from '@/lib/trpc/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

interface AlternativeMovementItemProps {
  alternative: { movementId: string; order: number };
  index: number;
  onRemove: () => void;
}

export function AlternativeMovementItem({
  alternative,
  index,
  onRemove,
}: AlternativeMovementItemProps) {
  const { data: movement, isLoading } = trpc.movements.getById.useQuery(
    { id: alternative.movementId },
    { enabled: !!alternative.movementId }
  );

  return (
    <Card className="p-3">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="shrink-0">
          {index + 1}
        </Badge>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">
            {isLoading ? 'Loading...' : movement?.name || 'Unknown movement'}
          </p>
          <p className="text-xs text-muted-foreground">
            Inherits sets/reps/weight
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="h-8 w-8 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}
