'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Exercise {
  movementId: any;
  targetSets: number;
  targetReps: number;
  supersetWith: string[];
  order: number;
}

interface Routine {
  _id: string;
  name: string;
  exercises: Exercise[];
  createdAt: Date;
  updatedAt: Date;
}

interface RoutineCardProps {
  routine: Routine;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: (newName: string) => void;
}

export function RoutineCard({ routine, onEdit, onDelete, onDuplicate }: RoutineCardProps) {
  const [isDuplicateDialogOpen, setIsDuplicateDialogOpen] = useState(false);
  const [duplicateName, setDuplicateName] = useState('');
  const previewLimit = 3;
  const hasMoreExercises = routine.exercises.length > previewLimit;
  const remainingCount = routine.exercises.length - previewLimit;

  // Calculate total estimated duration
  const handleDuplicateClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDuplicateName(`${routine.name} (copy)`);
    setIsDuplicateDialogOpen(true);
  };

  const handleDuplicateConfirm = () => {
    onDuplicate(duplicateName);
    setIsDuplicateDialogOpen(false);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete();
  };

  const calculateTotalDuration = () => {
    const setDuration = 60; // seconds per set

    // Build superset groups
    const processedIds = new Set<string>();
    const supersetGroups: string[][] = [];

    routine.exercises.forEach((exercise) => {
      const exerciseId = typeof exercise.movementId === 'object'
        ? exercise.movementId._id
        : exercise.movementId;

      if (processedIds.has(exerciseId)) return;

      if (exercise.supersetWith.length > 0) {
        // Build the superset group
        const group = [exerciseId, ...exercise.supersetWith.map(id =>
          typeof id === 'object' ? ((id as any)._id) : id
        )];
        supersetGroups.push(group);
        group.forEach(id => processedIds.add(id));
      }
    });

    const totalSeconds = routine.exercises.reduce((total, exercise) => {
      const exerciseId = typeof exercise.movementId === 'object'
        ? exercise.movementId._id
        : exercise.movementId;

      // Find superset group size
      const supersetGroup = supersetGroups.find(group => group.includes(exerciseId));
      const supersetSize = supersetGroup ? supersetGroup.length : 1;

      // Rest formula: (4 - superset_size) minutes
      // 1 exercise (regular): 3 min rest
      // 2 exercise superset: 2 min rest
      // 3 exercise superset: 1 min rest
      const restMinutes = 4 - supersetSize;
      const restBetweenSets = restMinutes * 60; // convert to seconds

      const exerciseSeconds = (exercise.targetSets * setDuration) + ((exercise.targetSets - 1) * restBetweenSets);
      return total + exerciseSeconds;
    }, 0);

    const minutes = Math.floor(totalSeconds / 60);
    return `~${minutes} min`;
  };

  return (
    <>
      <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={onEdit}>
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
          <div className="flex-1">
            <h3 className="text-lg font-semibold line-clamp-1">
              {routine.name}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {routine.exercises.length} exercise{routine.exercises.length !== 1 ? 's' : ''} •{' '}
              {routine.exercises.length > 0 && `${calculateTotalDuration()} • `}
              Created {formatDistanceToNow(new Date(routine.createdAt), { addSuffix: true })}
            </p>
          </div>
          <div className="flex gap-1 ml-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDuplicateClick}
              className="h-9 w-9"
            >
              <Copy className="h-4 w-2" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDeleteClick}
              className="h-9 w-9 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent>
        {routine.exercises.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">
            No exercises added yet
          </p>
        ) : (
          <div className="space-y-2">
            {routine.exercises
              .slice(0, previewLimit)
              .sort((a, b) => a.order - b.order)
              .map((exercise, index) => {
                const isSuperset = exercise.supersetWith.length > 0;
                const movementName = typeof exercise.movementId === 'object'
                  ? exercise.movementId?.name || 'Unknown'
                  : 'Unknown';

                return (
                  <div
                    key={index}
                    className={`text-sm ${
                      isSuperset
                        ? 'border-l-4 border-primary pl-3 py-1'
                        : 'pl-1'
                    }`}
                  >
                    <span className="font-medium">
                      {index + 1}. {movementName}
                    </span>
                    <span className="text-muted-foreground ml-2">
                      {exercise.targetSets}×{exercise.targetReps}
                    </span>
                  </div>
                );
              })}
            {hasMoreExercises && (
              <p className="text-sm text-muted-foreground italic pl-1">
                and {remainingCount} more...
              </p>
            )}
          </div>
        )}
        </CardContent>
      </Card>

      {/* Duplicate Confirmation Dialog */}
      <Dialog open={isDuplicateDialogOpen} onOpenChange={setIsDuplicateDialogOpen}>
        <DialogContent onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Duplicate Routine</DialogTitle>
            <DialogDescription>
              Create a copy of this routine with a new name.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="duplicate-name">Routine Name</Label>
              <Input
                id="duplicate-name"
                value={duplicateName}
                onChange={(e) => setDuplicateName(e.target.value)}
                placeholder="Enter routine name"
                className="h-11"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDuplicateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleDuplicateConfirm}
              disabled={!duplicateName.trim()}
            >
              Duplicate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
