'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { trpc } from '@/lib/trpc/client';
import {
  FullScreenEditor,
  FullScreenEditorHeader,
  FullScreenEditorBody,
} from '@/components/ui/full-screen-editor';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ExerciseList } from './ExerciseList';
import { AddExerciseDrawer } from './AddExerciseDrawer';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import { isReservedRoutineName } from '@/lib/constants';

const alternativeMovementSchema = z.object({
  movementId: z.string(),
  order: z.number().min(0),
});

const exerciseSchema = z.object({
  movementId: z.string(),
  alternativeMovements: z.array(alternativeMovementSchema)
    .max(5, 'Cannot have more than 5 alternative movements')
    .default([])
    .refine(
      (alternatives) => {
        if (alternatives.length === 0) return true;
        const ids = alternatives.map(a => a.movementId);
        return ids.length === new Set(ids).size;
      },
      { message: 'Alternative movements must be unique' }
    ),
  targetSets: z.number().min(1).max(20),
  targetReps: z.number().min(1).max(999),
  targetWeight: z.number().min(0).max(9999),
  order: z.number().min(0),
});

const routineSchema = z.object({
  name: z.string()
    .min(1, 'Routine name is required')
    .refine(
      (name) => !isReservedRoutineName(name),
      { message: 'This routine name is reserved. Please choose a different name.' }
    ),
  exercises: z.array(exerciseSchema),
});

export type AlternativeMovementFormData = z.infer<typeof alternativeMovementSchema>;

// Manually override ExerciseFormData to make alternativeMovements required
export type ExerciseFormData = {
  movementId: string;
  alternativeMovements: AlternativeMovementFormData[];
  targetSets: number;
  targetReps: number;
  targetWeight: number;
  order: number;
};

type RoutineFormData = {
  name: string;
  exercises: ExerciseFormData[];
};

interface RoutineDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingId: string | null;
  onSuccess?: () => void;
  onDelete?: (id: string) => void;
}

export function RoutineDrawer({
  open,
  onOpenChange,
  editingId,
  onSuccess,
  onDelete,
}: RoutineDrawerProps) {
  const utils = trpc.useUtils();
  const isEditing = !!editingId;
  const [isAddExerciseOpen, setIsAddExerciseOpen] = useState(false);

  const form = useForm<RoutineFormData>({
    resolver: zodResolver(routineSchema) as any,
    defaultValues: {
      name: '',
      exercises: [],
    },
  });

  // Load routine data for editing
  const { data: routineData } = trpc.routines.getById.useQuery(
    { id: editingId! },
    { enabled: isEditing && open }
  );

  // Reset form when dialog opens/closes or when editing different routine
  useEffect(() => {
    if (open) {
      if (isEditing && routineData) {
        // Edit mode: pre-fill form
        // Transform populated movementId to string ID
        form.reset({
          name: routineData.name,
          exercises: routineData.exercises.map((ex: any) => ({
            movementId: typeof ex.movementId === 'object' && ex.movementId !== null
              ? ex.movementId._id
              : ex.movementId?.toString() ?? '',
            alternativeMovements: ex.alternativeMovements?.map((alt: any) => ({
              movementId: typeof alt.movementId === 'object' && alt.movementId !== null
                ? alt.movementId._id
                : alt.movementId?.toString() ?? '',
              order: alt.order,
            })) || [],
            targetSets: ex.targetSets,
            targetReps: ex.targetReps,
            targetWeight: ex.targetWeight || 0,
            order: ex.order,
          })),
        });
      } else if (!isEditing) {
        // Create mode: reset to defaults
        form.reset({
          name: '',
          exercises: [],
        });
      }
    }
  }, [open, isEditing, routineData, form]);

  const createMutation = trpc.routines.create.useMutation({
    onSuccess: async () => {
      await utils.routines.list.invalidate();
      toast.success('Routine created successfully!');
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const updateMutation = trpc.routines.update.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.routines.list.invalidate(),
        utils.routines.getById.invalidate({ id: editingId! }),
      ]);
      toast.success('Routine updated successfully!');
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const onSubmit = async (data: RoutineFormData) => {
    if (isEditing) {
      await updateMutation.mutateAsync({
        id: editingId,
        ...data,
      });
    } else {
      await createMutation.mutateAsync(data);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;
  const exercises = form.watch('exercises');

  const handleAddExercise = (newExercise: ExerciseFormData) => {
    const currentExercises = form.getValues('exercises');
    form.setValue('exercises', [
      ...currentExercises,
      { ...newExercise, order: currentExercises.length },
    ]);
    setIsAddExerciseOpen(false);
  };

  const handleUpdateExercises = (updatedExercises: ExerciseFormData[]) => {
    form.setValue('exercises', updatedExercises);
  };

  // Calculate total estimated duration
  const calculateTotalDuration = () => {
    if (exercises.length === 0) return null;

    const setDuration = 60; // seconds per set
    const restBetweenSets = 180; // 3 minutes rest (fixed)

    const totalSeconds = exercises.reduce((total, exercise) => {
      const exerciseSeconds = (exercise.targetSets * setDuration) +
                             ((exercise.targetSets - 1) * restBetweenSets);
      return total + exerciseSeconds;
    }, 0);

    const minutes = Math.floor(totalSeconds / 60);
    return `~${minutes} min`;
  };

  return (
    <>
      <FullScreenEditor open={open} onOpenChange={onOpenChange} hasDescription>
        <FullScreenEditorHeader
          title={isEditing ? 'Edit Routine' : 'Create New Routine'}
          description={
            isEditing
              ? 'Update the routine details and exercises below.'
              : 'Add a new workout routine to your library.'
          }
          onCancel={() => onOpenChange(false)}
          action={
            <Button
              type="button"
              disabled={isLoading}
              onClick={form.handleSubmit(onSubmit)}
              className="min-h-11"
            >
              {isLoading ? 'Saving...' : 'Save'}
            </Button>
          }
        />

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-1 flex-col overflow-hidden"
          >
            {/* Routine Name - fixed under the header */}
            <div className="border-b px-4 pt-4 pb-3">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Routine Name *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="e.g., Full Body A, Push Day"
                        className="h-11"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Movements Header - fixed under the name field */}
            <div className="bg-background flex items-center justify-between border-b px-4 py-3">
              <div className="flex flex-col">
                <FormLabel>Movements</FormLabel>
                {exercises.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {exercises.length} exercise{exercises.length !== 1 ? 's' : ''} • {calculateTotalDuration()}
                  </p>
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAddExerciseOpen(true)}
                className="h-9"
              >
                Add Movement
              </Button>
            </div>

            {/* Exercise List - Scrollable */}
            <FullScreenEditorBody className="py-4">
              {exercises.length === 0 ? (
                <div className="border-2 border-dashed rounded-lg p-8 text-center text-muted-foreground">
                  <p>No exercises added yet</p>
                  <p className="text-sm mt-1">Click "Add Movement" to get started</p>
                </div>
              ) : (
                <ExerciseList
                  exercises={exercises}
                  onChange={handleUpdateExercises}
                />
              )}

              {isEditing && onDelete && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => onDelete(editingId)}
                  disabled={isLoading}
                  className="mt-6 min-h-11 w-full"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Routine
                </Button>
              )}
            </FullScreenEditorBody>
          </form>
        </Form>
      </FullScreenEditor>

      {/* Add Exercise Drawer */}
      <AddExerciseDrawer
        open={isAddExerciseOpen}
        onOpenChange={setIsAddExerciseOpen}
        onAddExercise={handleAddExercise}
        excludeMovementIds={exercises.map((ex) => ex.movementId)}
      />
    </>
  );
}
