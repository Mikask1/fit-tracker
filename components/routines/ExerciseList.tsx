'use client';

import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
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
import { ExerciseEditDialog } from './ExerciseEditDialog';
import type { ExerciseFormData } from './RoutineDialog';

interface ExerciseListProps {
  exercises: ExerciseFormData[];
  onChange: (exercises: ExerciseFormData[]) => void;
}

export function ExerciseList({ exercises, onChange }: ExerciseListProps) {
  const [editingExercise, setEditingExercise] = useState<ExerciseFormData | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const sensors = useSensors(
    // Mouse/Desktop: Small distance for accidental drag prevention
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    // Touch/Mobile: Long-press activation
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 500,      // 500ms long-press
        tolerance: 5,    // Allow 5px movement during delay
      },
    }),
    // Keyboard: Accessibility
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragStart() {
    // Trigger haptic feedback on drag start (mobile long-press)
    if ('vibrate' in navigator) {
      navigator.vibrate(100); // 50ms vibration
    }
  }

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

  function handleEditExercise(exercise: ExerciseFormData) {
    setEditingExercise(exercise);
    setIsEditDialogOpen(true);
  }

  function handleSaveEdit(updates: Partial<ExerciseFormData>) {
    if (editingExercise) {
      handleUpdateExercise(editingExercise.movementId, updates);
    }
  }

  function handleDeleteFromDialog() {
    if (editingExercise) {
      handleDeleteExercise(editingExercise.movementId);
    }
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={exercises.map((ex) => `${ex.movementId}-${ex.order}`)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-3">
            {exercises
              .sort((a, b) => a.order - b.order)
              .map((exercise) => (
                <ExerciseItem
                  key={`${exercise.movementId}-${exercise.order}`}
                  exercise={exercise}
                  onEdit={handleEditExercise}
                />
              ))}
          </div>
        </SortableContext>
      </DndContext>

      <ExerciseEditDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        exercise={editingExercise}
        onSave={handleSaveEdit}
        onDelete={handleDeleteFromDialog}
      />
    </>
  );
}
