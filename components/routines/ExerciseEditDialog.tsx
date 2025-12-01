'use client';

import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Trash2 } from 'lucide-react';
import type { ExerciseFormData } from './RoutineDialog';

interface ExerciseEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exercise: ExerciseFormData | null;
  onSave: (updates: Partial<ExerciseFormData>) => void;
  onDelete: () => void;
}

export function ExerciseEditDialog({
  open,
  onOpenChange,
  exercise,
  onSave,
  onDelete,
}: ExerciseEditDialogProps) {
  const [sets, setSets] = useState(exercise?.targetSets || 3);
  const [reps, setReps] = useState(exercise?.targetReps || 10);
  const [weight, setWeight] = useState(exercise?.targetWeight || 0);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

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
    }
  }, [exercise]);

  const handleSave = () => {
    if (exercise) {
      onSave({
        targetSets: sets,
        targetReps: reps,
        targetWeight: weight,
      });
      onOpenChange(false);
    }
  };

  const handleDelete = () => {
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    onDelete();
    setIsDeleteDialogOpen(false);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Edit Exercise
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Exercise Name */}
            <div>
              <p className="font-medium">{movement?.name || 'Loading...'}</p>
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
          </div>

          <DialogFooter className="flex-row gap-2">
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              className="min-h-11"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <div className="flex-1 flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="min-h-11 flex-1"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                className="min-h-11 flex-1"
              >
                Save
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        title="Delete Exercise"
        description="Are you sure you want to remove this exercise from the routine? This action cannot be undone."
        confirmText="Delete"
        variant="destructive"
      />
    </>
  );
}
