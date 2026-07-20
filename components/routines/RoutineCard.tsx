'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import {
  FullScreenEditor,
  FullScreenEditorHeader,
  FullScreenEditorBody,
} from '@/components/ui/full-screen-editor';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Exercise {
  movementId: any;
  targetSets: number;
  targetReps: number;
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
  onDuplicate: (newName: string) => void;
}

export function RoutineCard({ routine, onEdit, onDuplicate }: RoutineCardProps) {
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

  const calculateTotalDuration = () => {
    const setDuration = 60; // seconds per set
    const restBetweenSets = 180; // 3 minutes rest (fixed)

    const totalSeconds = routine.exercises.reduce((total, exercise) => {
      const exerciseSeconds = (exercise.targetSets * setDuration) +
                             ((exercise.targetSets - 1) * restBetweenSets);
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
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDuplicateClick}
            className="h-9 w-9 ml-2"
            title='Duplicate Routine'
          >
            <Copy className="h-4 w-4" />
          </Button>
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
                const movementName = typeof exercise.movementId === 'object'
                  ? exercise.movementId?.name || 'Unknown'
                  : 'Unknown';

                return (
                  <div
                    key={index}
                    className="text-sm pl-1"
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

      {/* Duplicate Routine editor */}
      <FullScreenEditor
        open={isDuplicateDialogOpen}
        onOpenChange={setIsDuplicateDialogOpen}
        hasDescription
      >
        {/* Stop clicks bubbling (through the React portal tree) to the card's onEdit. */}
        <div
          className="flex min-h-0 flex-1 flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <FullScreenEditorHeader
            title="Duplicate Routine"
            description="Create a copy of this routine with a new name."
            onCancel={() => setIsDuplicateDialogOpen(false)}
            action={
              <Button
                type="button"
                onClick={handleDuplicateConfirm}
                disabled={!duplicateName.trim()}
                className="min-h-11"
              >
                Duplicate
              </Button>
            }
          />
          <FullScreenEditorBody className="py-4">
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
          </FullScreenEditorBody>
        </div>
      </FullScreenEditor>
    </>
  );
}
