'use client';

import { useState, useMemo } from 'react';
import { trpc } from '@/lib/trpc/client';
import {
  FullScreenEditor,
  FullScreenEditorHeader,
  FullScreenEditorBody,
} from '@/components/ui/full-screen-editor';
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
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { MAIN_MUSCLE_GROUPS, normalizeMuscleGroup } from '@/lib/constants/muscleGroups';
import { Dumbbell, Plus } from 'lucide-react';
import { MovementDrawer } from '@/components/movements/MovementDrawer';

interface AddMovementDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddMovement: (movementId: string, movementName: string) => void;
  excludeMovementIds: string[];
}

export function AddMovementDrawer({
  open,
  onOpenChange,
  onAddMovement,
  excludeMovementIds,
}: AddMovementDrawerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [muscleFilter, setMuscleFilter] = useState<string>('all');
  const [isMovementDialogOpen, setIsMovementDialogOpen] = useState(false);

  const utils = trpc.useUtils();
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

  const handleSelectMovement = (movementId: string, movementName: string) => {
    onAddMovement(movementId, movementName);
    // Reset filters
    setSearchQuery('');
    setMuscleFilter('all');
    onOpenChange(false);
  };

  const handleMovementCreated = async () => {
    // Refresh the movements list when a new movement is created
    await utils.movements.list.invalidate();
    setIsMovementDialogOpen(false);
  };

  return (
    <>
      <FullScreenEditor open={open} onOpenChange={onOpenChange} hasDescription>
        <FullScreenEditorHeader
          title="Add Exercise"
          description="Select a movement from your library to add to this session"
          onCancel={() => onOpenChange(false)}
        />

        {/* Filters - fixed under the header */}
        <div className="flex flex-col gap-3 border-b px-4 py-3 sm:flex-row">
          <Input
            placeholder="Search movements..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-11 flex-1"
          />
          <Select value={muscleFilter} onValueChange={setMuscleFilter}>
            <SelectTrigger className="h-11 py-5 sm:w-48">
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
          <Button
            type="button"
            onClick={() => setIsMovementDialogOpen(true)}
            className="h-11 sm:w-auto"
          >
            <Plus className="mr-2 h-5 w-5" />
            Create New
          </Button>
        </div>

        {/* Movement List */}
        <FullScreenEditorBody className="py-4">
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
                  ? 'All movements have been added to this session'
                  : 'Try adjusting your search or filter criteria'
              }
              icon={<Dumbbell className="h-12 w-12" />}
            />
          ) : (
            <div className="space-y-2">
              {availableMovements.map((movement) => (
                <Card
                  key={movement._id.toString()}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleSelectMovement(movement._id.toString(), movement.name)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <h4 className="font-medium">{movement.name}</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Will be pre-filled with your last workout data
                        </p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {movement.muscleGroups.map((mg, idx) => {
                            const normalized = normalizeMuscleGroup(mg);
                            const display = normalized.specific || normalized.category || normalized.main;
                            const fullPath = [normalized.main, normalized.category, normalized.specific]
                              .filter(Boolean)
                              .join(' → ');

                            return (
                              <Badge key={idx} variant="secondary" className="text-xs" title={fullPath}>
                                {display}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </FullScreenEditorBody>
      </FullScreenEditor>

      {/* Movement Creation Drawer */}
      <MovementDrawer
        open={isMovementDialogOpen}
        onOpenChange={setIsMovementDialogOpen}
        editingId={null}
        onSuccess={handleMovementCreated}
        onDelete={() => {}}
      />
    </>
  );
}
