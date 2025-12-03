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
import type { ExerciseFormData } from './RoutineDialog';

interface AddExerciseDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddExercise: (exercise: ExerciseFormData) => void;
  excludeMovementIds: string[];
}

export function AddExerciseDrawer({
  open,
  onOpenChange,
  onAddExercise,
  excludeMovementIds,
}: AddExerciseDrawerProps) {
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

  // Calculate default estimated duration for new exercises
  // Default: 3 sets, no superset (3 min rest)
  const calculateDefaultDuration = () => {
    const setDuration = 60; // seconds per set
    const defaultSets = 3;
    const restBetweenSets = 180; // 3 minutes for non-superset
    const totalSeconds = (defaultSets * setDuration) + ((defaultSets - 1) * restBetweenSets);
    const minutes = Math.floor(totalSeconds / 60);
    return `~${minutes} min`;
  };

  const handleSelectMovement = (movementId: string) => {
    const newExercise: ExerciseFormData = {
      movementId,
      alternativeMovements: [],
      targetSets: 3,
      targetReps: 12,
      targetWeight: 0,
      order: 0, // Will be set by parent
    };
    onAddExercise(newExercise);
    // Reset filters
    setSearchQuery('');
    setMuscleFilter('all');
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader>
          <DrawerTitle>Add Movement</DrawerTitle>
          <DrawerDescription>
            Select a movement from your library to add to this routine
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
                title={
                  excludeMovementIds.length > 0
                    ? 'No more movements available'
                    : 'No movements found'
                }
                description={
                  excludeMovementIds.length > 0
                    ? 'All movements have been added to this routine'
                    : 'Try adjusting your search or filter criteria'
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
                            Default: 3 sets × 12 reps • {calculateDefaultDuration()}
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
