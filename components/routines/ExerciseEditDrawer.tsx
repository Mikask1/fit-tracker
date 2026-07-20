'use client';

import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc/client';
import {
  FullScreenEditor,
  FullScreenEditorHeader,
  FullScreenEditorBody,
} from '@/components/ui/full-screen-editor';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ConfirmDrawer } from '@/components/shared/ConfirmDrawer';
import { AlternativeMovementItem } from './AlternativeMovementItem';
import { AddAlternativeDrawer } from './AddAlternativeDrawer';
import { Trash2, Plus } from 'lucide-react';
import type { ExerciseFormData, AlternativeMovementFormData } from './RoutineDrawer';

interface ExerciseEditDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exercise: ExerciseFormData | null;
  onSave: (updates: Partial<ExerciseFormData>) => void;
  onDelete: () => void;
}

export function ExerciseEditDrawer({
  open,
  onOpenChange,
  exercise,
  onSave,
  onDelete,
}: ExerciseEditDrawerProps) {
  const [sets, setSets] = useState(exercise?.targetSets || 3);
  const [reps, setReps] = useState(exercise?.targetReps || 10);
  const [weight, setWeight] = useState(exercise?.targetWeight || 0);
  const [alternatives, setAlternatives] = useState<AlternativeMovementFormData[]>(
    exercise?.alternativeMovements || []
  );
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAddAlternativeOpen, setIsAddAlternativeOpen] = useState(false);

  // Fetch movement data to display name
  const { data: movement } = trpc.movements.getById.useQuery(
    { id: exercise?.movementId || '' },
    { enabled: !!exercise?.movementId }
  );

  // Reset form when exercise changes
  useEffect(() => {
    if (exercise) {
      setSets(exercise.targetSets);
      setReps(exercise.targetReps);
      setWeight(exercise.targetWeight);
      setAlternatives(exercise.alternativeMovements || []);
    }
  }, [exercise]);

  const handleSave = () => {
    if (exercise) {
      onSave({
        targetSets: sets,
        targetReps: reps,
        targetWeight: weight,
        alternativeMovements: alternatives,
      });
      onOpenChange(false);
    }
  };

  const handleAddAlternative = (movementId: string) => {
    const newOrder = alternatives.length > 0
      ? Math.max(...alternatives.map(a => a.order)) + 1
      : 0;
    setAlternatives([...alternatives, { movementId, order: newOrder }]);
  };

  const handleRemoveAlternative = (index: number) => {
    setAlternatives(alternatives.filter((_, i) => i !== index));
  };

  const handleDelete = () => {
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    onDelete();
    setIsDeleteDialogOpen(false);
    onOpenChange(false);
  };

  // Get list of movement IDs to exclude from alternative picker
  const excludeMovementIds = exercise
    ? [exercise.movementId, ...alternatives.map(a => a.movementId)]
    : [];

  return (
    <>
      <FullScreenEditor open={open} onOpenChange={onOpenChange}>
        <FullScreenEditorHeader
          title="Edit Exercise"
          onCancel={() => onOpenChange(false)}
          action={
            <Button type="button" onClick={handleSave} className="min-h-11">
              Save
            </Button>
          }
        />

        <FullScreenEditorBody className="py-4">
            <div className="space-y-4">
              {/* Exercise Name */}
              <div>
                <p className="font-medium">{movement?.name || 'Loading...'}</p>
                <p className="text-xs text-muted-foreground">Primary Movement</p>
              </div>

              {/* Form Inputs */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-sets">Sets</Label>
                  <Input
                    id="edit-sets"
                    type="number"
                    min={1}
                    max={20}
                    value={sets}
                    onChange={(e) => setSets(parseInt(e.target.value) || 1)}
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-reps">Reps</Label>
                  <Input
                    id="edit-reps"
                    type="number"
                    min={1}
                    max={999}
                    value={reps}
                    onChange={(e) => setReps(parseInt(e.target.value) || 1)}
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-weight">Weight (kg)</Label>
                  <Input
                    id="edit-weight"
                    type="number"
                    step="0.5"
                    min={0}
                    max={9999}
                    value={weight}
                    onChange={(e) => setWeight(parseFloat(e.target.value) || 0)}
                    className="h-11"
                  />
                </div>
              </div>

              {/* Alternatives Section */}
              <Separator />
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <Label>Alternative Movements</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Options to substitute during workouts
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAddAlternativeOpen(true)}
                    disabled={alternatives.length >= 5}
                    className="h-8"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </div>

                {alternatives.length === 0 ? (
                  <div className="border-2 border-dashed rounded-lg p-4 text-center text-muted-foreground text-sm">
                    No alternatives added
                  </div>
                ) : (
                  <div className="space-y-2">
                    {alternatives
                      .sort((a, b) => a.order - b.order)
                      .map((alt, index) => (
                        <AlternativeMovementItem
                          key={`${alt.movementId}-${alt.order}`}
                          alternative={alt}
                          index={index}
                          onRemove={() => handleRemoveAlternative(index)}
                        />
                      ))}
                  </div>
                )}
              </div>

              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                className="mt-2 min-h-11 w-full"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Exercise
              </Button>
            </div>
        </FullScreenEditorBody>
      </FullScreenEditor>

      {/* Delete Confirmation Drawer */}
      <ConfirmDrawer
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        title="Delete Exercise"
        description="Are you sure you want to remove this exercise from the routine? This action cannot be undone."
        confirmText="Delete"
        variant="destructive"
      />

      {/* Add Alternative Drawer */}
      <AddAlternativeDrawer
        open={isAddAlternativeOpen}
        onOpenChange={setIsAddAlternativeOpen}
        onAddAlternative={handleAddAlternative}
        excludeMovementIds={excludeMovementIds}
      />
    </>
  );
}
