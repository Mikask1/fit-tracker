'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GripVertical, Edit } from 'lucide-react';
import { trpc } from '@/lib/trpc/client';
import type { ExerciseFormData } from './RoutineDrawer';

interface ExerciseItemProps {
  exercise: ExerciseFormData;
  onEdit: (exercise: ExerciseFormData) => void;
}

export function ExerciseItem({
  exercise,
  onEdit,
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

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className="p-3"
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

        {/* Exercise Content */}
        <div className="flex-1 min-w-0">
          {/* Name */}
          <div className="flex items-center gap-2">
            <h4 className="font-medium line-clamp-1">
              {movement?.name || 'Loading...'}
            </h4>
            {exercise.alternativeMovements && exercise.alternativeMovements.length > 0 && (
              <Badge variant="secondary" className="text-xs shrink-0">
                +{exercise.alternativeMovements.length} alt
              </Badge>
            )}
          </div>

          {/* Compact Stats */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
            <span>
              <span className="font-medium text-foreground">
                {exercise.targetSets}
              </span>{' '}
              sets
            </span>
            <span>
              <span className="font-medium text-foreground">
                {exercise.targetReps}
              </span>{' '}
              reps
            </span>
            {exercise.targetWeight > 0 && (
              <span>
                <span className="font-medium text-foreground">
                  {exercise.targetWeight}
                </span>{' '}
                kg
              </span>
            )}
          </div>
        </div>

        {/* Edit Button */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onEdit(exercise)}
          className="h-9 w-9 shrink-0"
        >
          <Edit className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}
