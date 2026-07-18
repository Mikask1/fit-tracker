'use client';

import { useState, Suspense } from 'react';
import { trpc } from '@/lib/trpc/client';
import { MovementsList } from '@/components/movements/MovementsList';
import { MovementDrawer } from '@/components/movements/MovementDrawer';
import { ShareTargetHandler } from '@/components/movements/ShareTargetHandler';
import { ConfirmDrawer } from '@/components/shared/ConfirmDrawer';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

export default function MovementsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [sharedData, setSharedData] = useState<{ name?: string; note?: string; image?: string } | null>(null);

  const { data: movements, isLoading } = trpc.movements.list.useQuery();
  const utils = trpc.useUtils();

  const { data: usage } = trpc.movements.checkUsage.useQuery(
    { id: deletingId! },
    { enabled: !!deletingId }
  );

  const deleteMutation = trpc.movements.delete.useMutation({
    onSuccess: async () => {
      await utils.movements.list.invalidate();
      setIsDeleteDialogOpen(false);
      setDeletingId(null);
      setIsDialogOpen(false);
      setEditingId(null);
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
    setSharedData(null);
    setIsDialogOpen(true);
  };

  const handleSharedContent = (data: { name?: string; note?: string; image?: string }) => {
    setSharedData(data);
    setEditingId(null);
    setIsDialogOpen(true);
  };

  return (
    <>
      <Suspense fallback={null}>
        <ShareTargetHandler onShare={handleSharedContent} />
      </Suspense>
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
        onAddMovement={handleAddMovement}
      />

      {/* Create/Edit Drawer */}
      <MovementDrawer
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        editingId={editingId}
        initialData={sharedData || undefined}
        onSuccess={() => {
          setIsDialogOpen(false);
          setEditingId(null);
          setSharedData(null);
        }}
        onDelete={handleDelete}
      />

      {/* Delete Confirmation Drawer */}
      <ConfirmDrawer
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        title="Delete Movement"
        description={
          usage?.routineCount
            ? `This movement is used in ${usage.routineCount} routine${usage.routineCount > 1 ? 's' : ''} and will be removed from them. ${usage.sessionCount > 0 ? `Historical workout data (${usage.sessionCount} session${usage.sessionCount > 1 ? 's' : ''}) will be preserved. ` : ''}This action cannot be undone.`
            : 'Are you sure you want to delete this movement? This action cannot be undone.'
        }
        confirmText="Delete"
        variant="destructive"
      />
      </div>
    </>
  );
}
