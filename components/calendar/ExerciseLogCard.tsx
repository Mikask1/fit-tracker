'use client';

import { format } from 'date-fns';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExerciseLogCardProps {
  log: {
    movementId: string;
    movementName: string;
    sets: Array<{ weight: number; reps: number }>;
  };
  index: number;
  exerciseDetails?: {
    targetSets: number;
    targetReps: number;
  };
  isSupersetStart: boolean;
  isSupersetContinuation: boolean;
  onAddSet: (index: number) => void;
  onRemoveSet: (index: number, setIndex: number) => void;
  onUpdateSet: (index: number, setIndex: number, field: 'weight' | 'reps', value: number) => void;
}

export function ExerciseLogCard({
  log,
  index,
  exerciseDetails,
  isSupersetStart,
  isSupersetContinuation,
  onAddSet,
  onRemoveSet,
  onUpdateSet,
}: ExerciseLogCardProps) {
  // Fetch last completed session for this movement (progressive overload)
  const { data: lastCompleted } = trpc.sessions.getLastCompletedForMovement.useQuery(
    { movementId: log.movementId },
    { enabled: !!log.movementId }
  );

  return (
    <div
      className={cn(
        'border rounded-lg p-4 space-y-3 bg-card',
        (isSupersetStart || isSupersetContinuation) && 'border-l-4 border-primary'
      )}
    >
      {/* Exercise Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-semibold text-lg">{log.movementName}</h3>
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
          {(isSupersetStart || isSupersetContinuation) && (
            <p className="text-xs text-primary mt-1">
              Supersetted
            </p>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onAddSet(index)}
          className="h-9 w-9 p-0"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Sets */}
      <div className="space-y-3">
        {log.sets.map((set, setIndex) => (
          <div key={setIndex} className="flex items-center gap-1">
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
      </div>
    </div>
  );
}
