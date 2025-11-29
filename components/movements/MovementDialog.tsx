'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { trpc } from '@/lib/trpc/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { MuscleGroupSelector } from './MuscleGroupSelector';
import { YouTubePreview } from './YouTubePreview';
import { MuscleGroupSelection } from '@/lib/constants/muscleGroups';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';

const movementSchema = z.object({
  name: z.string().min(1, 'Movement name is required'),
  muscleGroups: z
    .array(
      z.object({
        main: z.enum(['Core', 'Cardio', 'Chest', 'Back', 'Legs', 'Shoulders', 'Arms']),
        sub: z.enum([
          'Core', 'Cardio',
          'Upper Chest', 'Middle Chest', 'Lower Chest',
          'Traps', 'Rhomboids', 'Spinal Erectors', 'Lats',
          'Upper Glutes', 'Middle Glutes', 'Lower Glutes', 'Quads', 'Hamstring', 'Calves',
          'Front Delt', 'Side Delt', 'Rear Delt',
          'Bicep', 'Tricep', 'Forearm'
        ]).nullable(),
      })
    )
    .min(1, 'At least one muscle group is required'),
  youtubeLink: z.union([
    z.string().url('Must be a valid URL'),
    z.literal('')
  ]).optional(),
  image: z.union([
    z.string().url('Must be a valid URL'),
    z.literal('')
  ]).optional(),
  note: z.string().optional(),
});

type MovementFormData = z.infer<typeof movementSchema>;

interface MovementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingId: string | null;
  onSuccess?: () => void;
  onDelete?: (id: string) => void;
}

export function MovementDialog({
  open,
  onOpenChange,
  editingId,
  onSuccess,
  onDelete,
}: MovementDialogProps) {
  const utils = trpc.useUtils();
  const isEditing = !!editingId;

  const form = useForm<MovementFormData>({
    resolver: zodResolver(movementSchema),
    defaultValues: {
      name: '',
      muscleGroups: [],
      youtubeLink: '',
      image: '',
      note: '',
    },
  });

  // Load movement data for editing
  const { data: movementData } = trpc.movements.getById.useQuery(
    { id: editingId! },
    { enabled: isEditing && open }
  );

  // Reset form when dialog opens/closes or when editing different movement
  useEffect(() => {
    if (open) {
      if (isEditing && movementData) {
        // Edit mode: pre-fill form
        form.reset({
          name: movementData.name,
          muscleGroups: movementData.muscleGroups as MuscleGroupSelection[],
          youtubeLink: movementData.youtubeLink || '',
          image: movementData.image || '',
          note: movementData.note || '',
        });
      } else if (!isEditing) {
        // Create mode: reset to defaults
        form.reset({
          name: '',
          muscleGroups: [],
          youtubeLink: '',
          image: '',
          note: '',
        });
      }
    }
  }, [open, isEditing, movementData, form]);

  const createMutation = trpc.movements.create.useMutation({
    onSuccess: async () => {
      await utils.movements.list.invalidate();
      toast.success('Movement created successfully!');
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const updateMutation = trpc.movements.update.useMutation({
    onSuccess: async () => {
      await utils.movements.list.invalidate();
      toast.success('Movement updated successfully!');
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const onSubmit = async (data: MovementFormData) => {
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
  const youtubeLink = form.watch('youtubeLink');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Movement' : 'Create New Movement'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the movement details below.'
              : 'Add a new exercise movement to your library.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Movement Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Movement Name *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="e.g., Bench Press"
                      className="h-11"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Muscle Groups Selector */}
            <FormField
              control={form.control}
              name="muscleGroups"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Muscle Groups *</FormLabel>
                  <FormControl>
                    <div className="border rounded-lg p-4">
                      <MuscleGroupSelector
                        value={field.value}
                        onChange={field.onChange}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Note */}
            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Add any notes about this movement..."
                      className="h-11"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* YouTube Link */}
            <FormField
              control={form.control}
              name="youtubeLink"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>YouTube Link (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="url"
                      placeholder="https://youtube.com/watch?v=..."
                      className="h-11"
                    />
                  </FormControl>
                  <FormMessage />
                  {/* YouTube Preview */}
                  {youtubeLink && <YouTubePreview url={youtubeLink} />}
                </FormItem>
              )}
            />

            {/* Image URL */}
            <FormField
              control={form.control}
              name="image"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Image URL (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="url"
                      placeholder="https://example.com/image.jpg"
                      className="h-11"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Footer */}
            <DialogFooter className="gap-2 flex-row">
              {isEditing && onDelete && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => onDelete(editingId)}
                  disabled={isLoading}
                  className="min-h-11 w-auto"
                >
                  <Trash2 />
                </Button>
              )}
              <div className='w-full'>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="min-h-11 w-full"
                >
                  {isLoading
                    ? 'Saving...'
                    : isEditing
                      ? 'Update Movement'
                      : 'Create Movement'}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog >
  );
}
