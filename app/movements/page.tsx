'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { MovementsList } from '@/components/movements/MovementsList';
import { MovementDialog } from '@/components/movements/MovementDialog';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

export default function MovementsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: movements, isLoading } = trpc.movements.list.useQuery();
  const utils = trpc.useUtils();

  const deleteMutation = trpc.movements.delete.useMutation({
    onSuccess: async () => {
      await utils.movements.list.invalidate();
      toast.success('Movement deleted successfully');
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const handleEdit = (id: string) => {
    setEditingId(id);
    setIsDialogOpen(true);
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

  const handleAddMovement = () => {
    setEditingId(null);
    setIsDialogOpen(true);
  };

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold">Movements Library</h1>
          <p className="text-muted-foreground mt-1">
            Manage your exercise movements
          </p>
        </div>
        <Button
          onClick={handleAddMovement}
          className="h-11 min-h-11"
          size="lg"
        >
          <Plus className="mr-2 h-5 w-5" />
          Add Movement
        </Button>
      </div>

      {/* Movements List */}
      <MovementsList
        movements={movements}
        isLoading={isLoading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onAddMovement={handleAddMovement}
      />

      {/* Create/Edit Dialog */}
      <MovementDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        editingId={editingId}
        onSuccess={() => {
          setIsDialogOpen(false);
          setEditingId(null);
        }}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        title="Delete Movement"
        description="Are you sure you want to delete this movement? This action cannot be undone."
        confirmText="Delete"
        variant="destructive"
      />
    </div>
  );
}
