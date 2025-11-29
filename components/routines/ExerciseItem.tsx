'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { GripVertical, Trash2 } from 'lucide-react';
import { trpc } from '@/lib/trpc/client';
import type { ExerciseFormData } from './RoutineDialog';

interface ExerciseItemProps {
  exercise: ExerciseFormData;
  index: number;
  totalExercises: number;
  onUpdate: (updates: Partial<ExerciseFormData>) => void;
  onDelete: () => void;
  onToggleSuperset: (targetId: string) => void;
  nextExercise?: ExerciseFormData;
}

export function ExerciseItem({
  exercise,
  index,
  totalExercises,
  onUpdate,
  onDelete,
  onToggleSuperset,
  nextExercise,
}: ExerciseItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `${exercise.movementId}-${exercise.order}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Fetch movement data to display name
  const { data: movement } = trpc.movements.getById.useQuery(
    { id: exercise.movementId },
    { enabled: !!exercise.movementId }
  );

  const isSuperset = exercise.supersetWith.length > 0;
  const canSuperset = index < totalExercises - 1 && nextExercise;
  const isSupersetWithNext =
    nextExercise && exercise.supersetWith.includes(nextExercise.movementId);

  const handleDelete = () => {
    onDelete();
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`p-4 ${
        isSuperset ? 'border-l-4 border-primary' : ''
      }`}
    >
      <div className="flex gap-3">
        {/* Drag Handle */}
        <button
          type="button"
          className="touch-none cursor-grab active:cursor-grabbing min-w-11 min-h-11 flex items-center justify-center text-muted-foreground hover:text-foreground"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-5 w-5" />
        </button>

        <div className="flex-1 space-y-4">
          {/* Exercise Name */}
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="font-medium">
                {index + 1}. {movement?.name || 'Loading...'}
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isSuperset && 'Supersetted • '}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleDelete}
              className="h-9 w-9 text-destructive hover:text-destructive shrink-0"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          {/* Inputs: Sets, Reps, Weight */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor={`sets-${exercise.movementId}`} className="text-xs">
                Sets
              </Label>
              <Input
                id={`sets-${exercise.movementId}`}
                type="number"
                min={1}
                max={20}
                value={exercise.targetSets}
                onChange={(e) =>
                  onUpdate({ targetSets: parseInt(e.target.value) || 1 })
                }
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`reps-${exercise.movementId}`} className="text-xs">
                Reps
              </Label>
              <Input
                id={`reps-${exercise.movementId}`}
                type="number"
                min={1}
                max={999}
                value={exercise.targetReps}
                onChange={(e) =>
                  onUpdate({ targetReps: parseInt(e.target.value) || 1 })
                }
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`weight-${exercise.movementId}`} className="text-xs">
                Weight (kg)
              </Label>
              <Input
                id={`weight-${exercise.movementId}`}
                type="number"
                step="0.5"
                min={0}
                max={9999}
                value={exercise.targetWeight}
                onChange={(e) =>
                  onUpdate({ targetWeight: parseFloat(e.target.value) || 0 })
                }
                className="h-9"
              />
            </div>
          </div>

          {/* Superset Checkbox */}
          {canSuperset && (
            <div className="flex items-center space-x-2 pt-1">
              <Checkbox
                id={`superset-${exercise.movementId}`}
                checked={isSupersetWithNext}
                onCheckedChange={() =>
                  nextExercise && onToggleSuperset(nextExercise.movementId)
                }
              />
              <Label
                htmlFor={`superset-${exercise.movementId}`}
                className="text-sm cursor-pointer"
              >
                Superset with next exercise
              </Label>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
