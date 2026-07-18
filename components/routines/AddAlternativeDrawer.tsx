'use client';

import { useState, useMemo } from 'react';
import { trpc } from '@/lib/trpc/client';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { MAIN_MUSCLE_GROUPS } from '@/lib/constants/muscleGroups';
import { Dumbbell } from 'lucide-react';

interface AddAlternativeDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddAlternative: (movementId: string) => void;
  excludeMovementIds: string[]; // Primary + existing alternatives
  /** Render as a nested drawer (when opened from inside another drawer). */
  nested?: boolean;
}

export function AddAlternativeDrawer({
  open,
  onOpenChange,
  onAddAlternative,
  excludeMovementIds,
  nested = false,
}: AddAlternativeDrawerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [muscleFilter, setMuscleFilter] = useState<string>('all');

  const { data: movements, isLoading } = trpc.movements.list.useQuery(
    undefined,
    { enabled: open }
  );

  const availableMovements = useMemo(() => {
    if (!movements) return [];

    return movements
      .filter((movement) => !excludeMovementIds.includes(movement._id.toString()))
      .filter((movement) => {
        const matchesSearch = movement.name
          .toLowerCase()
          .includes(searchQuery.toLowerCase());
        const matchesFilter =
          muscleFilter === 'all' ||
          movement.muscleGroups.some((mg) => mg.main === muscleFilter);
        return matchesSearch && matchesFilter;
      });
  }, [movements, excludeMovementIds, searchQuery, muscleFilter]);

  const handleSelectMovement = (movementId: string) => {
    onAddAlternative(movementId);
    // Reset filters
    setSearchQuery('');
    setMuscleFilter('all');
    onOpenChange(false);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange} nested={nested}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader>
          <DrawerTitle>Add Alternative Movement</DrawerTitle>
          <DrawerDescription>
            Select a movement to use as an alternative. It will inherit sets, reps, and weight from the primary exercise.
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-4 space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              placeholder="Search movements..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-11 flex-1"
            />
            <Select value={muscleFilter} onValueChange={setMuscleFilter}>
              <SelectTrigger className="h-11 sm:w-48">
                <SelectValue placeholder="Filter by muscle group" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Muscle Groups</SelectItem>
                {MAIN_MUSCLE_GROUPS.map((group) => (
                  <SelectItem key={group} value={group}>
                    {group}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Movement List */}
          <ScrollArea className="h-[50vh]">
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : availableMovements.length === 0 ? (
              <EmptyState
                title="No movements available"
                description={
                  searchQuery || muscleFilter !== 'all'
                    ? 'Try adjusting your search or filter criteria'
                    : 'All movements have been added'
                }
                icon={<Dumbbell className="h-12 w-12" />}
              />
            ) : (
              <div className="space-y-2 pb-4">
                {availableMovements.map((movement) => (
                  <Card
                    key={movement._id.toString()}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => handleSelectMovement(movement._id.toString())}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <h4 className="font-medium">{movement.name}</h4>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Alternative option
                          </p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {movement.muscleGroups.map((mg, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {mg.sub || mg.main}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        <DrawerFooter className="border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full min-h-11"
          >
            Cancel
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
