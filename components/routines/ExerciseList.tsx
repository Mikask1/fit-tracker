'use client';

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { ExerciseItem } from './ExerciseItem';
import type { ExerciseFormData } from './RoutineDrawer';

interface ExerciseListProps {
  exercises: ExerciseFormData[];
  onChange: (exercises: ExerciseFormData[]) => void;
}

export function ExerciseList({ exercises, onChange }: ExerciseListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 10, // Prevent accidental drags on mobile
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = exercises.findIndex(
        (ex) => `${ex.movementId}-${ex.order}` === active.id
      );
      const newIndex = exercises.findIndex(
        (ex) => `${ex.movementId}-${ex.order}` === over.id
      );

      if (oldIndex !== -1 && newIndex !== -1) {
        const reordered = arrayMove(exercises, oldIndex, newIndex);
        // Update order field for each exercise
        const withUpdatedOrder = reordered.map((ex, index) => ({
          ...ex,
          order: index,
        }));
        onChange(withUpdatedOrder);
      }
    }
  }

  function handleUpdateExercise(
    movementId: string,
    updates: Partial<ExerciseFormData>
  ) {
    const updated = exercises.map((ex) =>
      ex.movementId === movementId ? { ...ex, ...updates } : ex
    );
    onChange(updated);
  }

  function handleDeleteExercise(movementId: string) {
    const filtered = exercises.filter((ex) => ex.movementId !== movementId);
    // Recalculate order
    const reordered = filtered.map((ex, index) => ({ ...ex, order: index }));
    onChange(reordered);
  }

  function handleToggleSuperset(sourceId: string, targetId: string) {
    const updated = exercises.map((ex) => {
      if (ex.movementId === sourceId) {
        const isCurrentlySuperset = ex.supersetWith.includes(targetId);
        return {
          ...ex,
          supersetWith: isCurrentlySuperset
            ? ex.supersetWith.filter((id) => id !== targetId)
            : [...ex.supersetWith, targetId],
        };
      }
      if (ex.movementId === targetId) {
        const isCurrentlySuperset = ex.supersetWith.includes(sourceId);
        return {
          ...ex,
          supersetWith: isCurrentlySuperset
            ? ex.supersetWith.filter((id) => id !== sourceId)
            : [...ex.supersetWith, sourceId],
        };
      }
      return ex;
    });
    onChange(updated);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={exercises.map((ex) => `${ex.movementId}-${ex.order}`)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-3" style={{ touchAction: 'none' }}>
          {exercises
            .sort((a, b) => a.order - b.order)
            .map((exercise, index) => (
              <ExerciseItem
                key={`${exercise.movementId}-${exercise.order}`}
                exercise={exercise}
                index={index}
                totalExercises={exercises.length}
                onUpdate={(updates) =>
                  handleUpdateExercise(exercise.movementId, updates)
                }
                onDelete={() => handleDeleteExercise(exercise.movementId)}
                onToggleSuperset={(targetId) =>
                  handleToggleSuperset(exercise.movementId, targetId)
                }
                nextExercise={exercises[index + 1]}
              />
            ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
