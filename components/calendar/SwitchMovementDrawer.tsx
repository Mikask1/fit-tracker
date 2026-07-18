'use client';

import { trpc } from '@/lib/trpc/client';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SwitchMovementDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentMovementId: string;
  primaryMovementId: string;
  alternatives: Array<{ movementId: string; order: number }>;
  onSwitch: (newMovementId: string, newMovementName: string) => void;
}

export function SwitchMovementDrawer({
  open,
  onOpenChange,
  currentMovementId,
  primaryMovementId,
  alternatives,
  onSwitch,
}: SwitchMovementDrawerProps) {
  // Build list: [primary, ...alternatives]
  const allOptions = [
    { movementId: primaryMovementId, order: -1, isPrimary: true },
    ...alternatives.map(alt => ({ ...alt, isPrimary: false })),
  ].sort((a, b) => a.order - b.order);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader>
          <DrawerTitle>Switch Movement</DrawerTitle>
          <DrawerDescription>
            Your logged sets will be preserved. Sets/reps/weight targets will update.
          </DrawerDescription>
        </DrawerHeader>

        <ScrollArea className="max-h-[60vh] overflow-y-auto">
          <div className="space-y-2 px-4 pb-4">
            {allOptions.map((option) => (
              <MovementOptionCard
                key={option.movementId}
                movementId={option.movementId}
                isPrimary={option.isPrimary}
                isSelected={option.movementId === currentMovementId}
                onClick={(id, name) => {
                  onSwitch(id, name);
                  onOpenChange(false);
                }}
              />
            ))}
          </div>
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
}

interface MovementOptionCardProps {
  movementId: string;
  isPrimary: boolean;
  isSelected: boolean;
  onClick: (movementId: string, movementName: string) => void;
}

function MovementOptionCard({
  movementId,
  isPrimary,
  isSelected,
  onClick,
}: MovementOptionCardProps) {
  const { data: movement, isLoading } = trpc.movements.getById.useQuery(
    { id: movementId },
    { enabled: !!movementId }
  );

  return (
    <Card
      className={`p-4 cursor-pointer transition-all ${
        isSelected
          ? 'border-primary bg-primary/5'
          : 'hover:border-primary/50'
      }`}
      onClick={() => {
        if (movement) {
          onClick(movementId, movement.name);
        }
      }}
    >
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium truncate">
              {isLoading ? 'Loading...' : movement?.name || 'Unknown'}
            </p>
            {isPrimary && (
              <Badge variant="outline" className="text-xs">
                Primary
              </Badge>
            )}
          </div>
          {!isLoading && movement?.muscleGroups && movement.muscleGroups.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {movement.muscleGroups.map((mg, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs">
                  {mg.sub || mg.main}
                </Badge>
              ))}
            </div>
          )}
        </div>
        {isSelected && (
          <div className="shrink-0">
            <Check className="h-5 w-5 text-primary" />
          </div>
        )}
      </div>
    </Card>
  );
}
