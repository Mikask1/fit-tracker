'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Minus, Trash2, ArrowLeftRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { SwitchMovementDialog } from './SwitchMovementDialog';

interface ExerciseLogCardProps {
  log: {
    movementId: string;
    movementName: string;
    sets: Array<{ weight: number; reps: number }>;
    isCompleted?: boolean;
    completedAt?: number;
  };
  index: number;
  exerciseDetails?: {
    targetSets: number;
    targetReps: number;
    movementId?: string; // Primary movement ID
    alternativeMovements?: Array<{ movementId: string; order: number }>;
  };
  onAddSet: (index: number) => void;
  onRemoveSet: (index: number, setIndex: number) => void;
  onUpdateSet: (index: number, setIndex: number, field: 'weight' | 'reps', value: number) => void;
  onToggleExerciseCompletion: (index: number, isCompleted: boolean) => void;
  onRemove?: (index: number) => void;
  onSwitchMovement?: (index: number, newMovementId: string, newMovementName: string) => void;
  canRemove?: boolean;
}

export function ExerciseLogCard({
  log,
  index,
  exerciseDetails,
  onAddSet,
  onRemoveSet,
  onUpdateSet,
  onToggleExerciseCompletion,
  onRemove,
  onSwitchMovement,
  canRemove = true,
}: ExerciseLogCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSwitchDialog, setShowSwitchDialog] = useState(false);

  // Fetch last completed session for this movement (progressive overload)
  const { data: lastCompleted } = trpc.sessions.getLastCompletedForMovement.useQuery(
    { movementId: log.movementId },
    { enabled: !!log.movementId }
  );

  const handleDelete = () => {
    if (onRemove) {
      onRemove(index);
    }
  };

  const handleSwitch = (newMovementId: string, newMovementName: string) => {
    if (onSwitchMovement) {
      onSwitchMovement(index, newMovementId, newMovementName);
    }
  };

  // Check if this is an alternative movement
  const isAlternative = exerciseDetails?.movementId &&
    log.movementId !== exerciseDetails.movementId;

  // Check if alternatives are available
  const hasAlternatives = exerciseDetails?.alternativeMovements &&
    exerciseDetails.alternativeMovements.length > 0;

  return (
    <>
      <div
        className="border rounded-lg p-4 space-y-3 bg-card"
      >
        {/* Exercise Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1 flex items-center gap-2">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={log.isCompleted || false}
                  onCheckedChange={(checked) =>
                    onToggleExerciseCompletion(index, checked === true)
                  }
                  className="h-5 w-5 mt-0.5"
                  aria-label={`Mark ${log.movementName} as ${log.isCompleted ? 'incomplete' : 'complete'}`}
                />
                <h3 className={cn(
                  "font-semibold text-lg",
                  log.isCompleted && "line-through opacity-60"
                )}>
                  {log.movementName}
                </h3>
                {isAlternative && (
                  <Badge variant="secondary" className="text-xs">
                    Alternative
                  </Badge>
                )}
              </div>
              {exerciseDetails && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  Target: {exerciseDetails.targetSets} sets × {exerciseDetails.targetReps} reps
                </p>
              )}
              {/* Progressive Overload Hint */}
              {lastCompleted?.log && (
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  Last: {lastCompleted.log.sets.map((s: any) =>
                    `${s.weight}kg × ${s.reps}`
                  ).join(', ')}
                  {lastCompleted.date && (
                    <span className="text-muted-foreground ml-1">
                      ({format(new Date(lastCompleted.date), 'MMM d')})
                    </span>
                  )}
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-1">
            {/* Switch Movement Button - Only if alternatives exist */}
            {hasAlternatives && exerciseDetails?.movementId && onSwitchMovement && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowSwitchDialog(true)}
                className="h-9 w-9 p-0"
                title="Switch to alternative movement"
              >
                <ArrowLeftRight className="h-4 w-4" />
              </Button>
            )}
            {canRemove && onRemove && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
                className="h-9 w-9 p-0 text-destructive hover:text-destructive"
                title='Delete Movement'
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Sets */}
        <div className="space-y-3">
          {log.sets.map((set, setIndex) => (
            <div
              key={setIndex}
              className="flex items-center gap-1"
            >
              <span className="text-sm font-medium text-muted-foreground w-10">
                Set {setIndex + 1}
              </span>
              <div className="flex-1 grid grid-cols-2 gap-1">
                <div>
                  <Label htmlFor={`log-${index}-set-${setIndex}-weight`} className="sr-only">
                    Weight
                  </Label>
                  <div className="relative">
                    <Input
                      id={`log-${index}-set-${setIndex}-weight`}
                      type="number"
                      step="0.5"
                      min="0"
                      placeholder="Weight"
                      value={set.weight || ''}
                      onChange={(e) => onUpdateSet(index, setIndex, 'weight', parseFloat(e.target.value) || 0)}
                      className="pr-10"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      kg
                    </span>
                  </div>
                </div>
                <div>
                  <Label htmlFor={`log-${index}-set-${setIndex}-reps`} className="sr-only">
                    Reps
                  </Label>
                  <div className="relative">
                    <Input
                      id={`log-${index}-set-${setIndex}-reps`}
                      type="number"
                      min="0"
                      placeholder="Reps"
                      value={set.reps || ''}
                      onChange={(e) => onUpdateSet(index, setIndex, 'reps', parseInt(e.target.value) || 0)}
                      className="pr-16"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      reps
                    </span>
                  </div>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onRemoveSet(index, setIndex)}
                disabled={log.sets.length === 1}
                className="h-9 w-9 p-0"
              >
                <Minus className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <div className='flex justify-end'>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onAddSet(index)}
              className="px-2 h-9 gap-2"
            >
              <Plus className="h-4 w-4" />
              <span>Add Set</span>
            </Button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        onConfirm={handleDelete}
        title="Remove Exercise"
        description={`Are you sure you want to remove "${log.movementName}" from this workout? You can always add it back later.`}
        confirmText="Remove"
        cancelText="Cancel"
        variant="destructive"
      />

      {/* Switch Movement Dialog */}
      {hasAlternatives && exerciseDetails?.movementId && (
        <SwitchMovementDialog
          open={showSwitchDialog}
          onOpenChange={setShowSwitchDialog}
          currentMovementId={log.movementId}
          primaryMovementId={exerciseDetails.movementId}
          alternatives={exerciseDetails.alternativeMovements || []}
          onSwitch={handleSwitch}
        />
      )}
    </>
  );
}
