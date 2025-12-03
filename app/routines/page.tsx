'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { RoutinesList } from '@/components/routines/RoutinesList';
import { RoutineDrawer } from '@/components/routines/RoutineDialog';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

export default function RoutinesPage() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: routines, isLoading } = trpc.routines.list.useQuery();
  const utils = trpc.useUtils();

  const deleteMutation = trpc.routines.delete.useMutation({
    onSuccess: async () => {
      await utils.routines.list.invalidate();
      toast.success('Routine deleted successfully');
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const createMutation = trpc.routines.create.useMutation({
    onSuccess: async () => {
      await utils.routines.list.invalidate();
      toast.success('Routine duplicated successfully');
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const handleEdit = (id: string) => {
    setEditingId(id);
    setIsDrawerOpen(true);
  };

  const handleDelete = (id: string) => {
    setDeletingId(id);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (deletingId) {
      await deleteMutation.mutateAsync({ id: deletingId });
      setDeletingId(null);
    }
  };

  const handleDuplicate = async (id: string, newName: string) => {
    try {
      // Find the routine to duplicate from the current list
      const routineToDuplicate = routines?.find((r: any) => r._id.toString() === id);

      if (!routineToDuplicate) {
        toast.error('Routine not found');
        return;
      }

      // Create a new routine with the same exercises
      await createMutation.mutateAsync({
        name: newName,
        exercises: routineToDuplicate.exercises.map((ex: any) => ({
          movementId: typeof ex.movementId === 'object' && ex.movementId !== null
            ? ex.movementId._id.toString()
            : ex.movementId?.toString() ?? '',
          alternativeMovements: ex.alternativeMovements?.map((alt: any) => ({
            movementId: typeof alt.movementId === 'object' && alt.movementId !== null
              ? alt.movementId._id.toString()
              : alt.movementId?.toString() ?? '',
            order: alt.order,
          })) || [],
          targetSets: ex.targetSets,
          targetReps: ex.targetReps,
          targetWeight: ex.targetWeight || 0,
          order: ex.order,
        })),
      });
    } catch (error) {
      // Error toast is already handled by the mutation
    }
  };

  const handleAddRoutine = () => {
    setEditingId(null);
    setIsDrawerOpen(true);
  };

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold">Workout Routines</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage your workout programs
          </p>
        </div>
        <Button
          onClick={handleAddRoutine}
          className="h-11 min-h-11"
          size="lg"
        >
          <Plus className="mr-2 h-5 w-5" />
          Add Routine
        </Button>
      </div>

      {/* Routines List */}
      <RoutinesList
        routines={routines}
        isLoading={isLoading}
        onEdit={handleEdit}
        onDuplicate={handleDuplicate}
        onAddRoutine={handleAddRoutine}
      />

      {/* Create/Edit Drawer */}
      <RoutineDrawer
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        editingId={editingId}
        onSuccess={() => {
          setIsDrawerOpen(false);
          setEditingId(null);
        }}
        onDelete={handleDelete}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        title="Delete Routine"
        description="Are you sure you want to delete this routine? This action cannot be undone."
        confirmText="Delete"
        variant="destructive"
      />
    </div>
  );
}
