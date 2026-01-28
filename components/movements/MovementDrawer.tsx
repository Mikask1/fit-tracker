'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { trpc } from '@/lib/trpc/client';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from '@/components/ui/drawer';
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
import { MuscleGroupSelection, normalizeMuscleGroup } from '@/lib/constants/muscleGroups';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';

const movementSchema = z.object({
  name: z.string().min(1, 'Movement name is required'),
  muscleGroups: z
    .array(
      z.object({
        main: z.string().min(1),
        category: z.string().nullable(),
        specific: z.string().nullable(),
        sub: z.string().nullable().optional(), // backward compat
      })
    )
    .min(1, 'At least one muscle group is required'),
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
  initialData?: {
    name?: string;
    note?: string;
    image?: string;
  };
}

export function MovementDialog({
  open,
  onOpenChange,
  editingId,
  onSuccess,
  onDelete,
  initialData,
}: MovementDialogProps) {
  const utils = trpc.useUtils();
  const isEditing = !!editingId;

  const form = useForm<MovementFormData>({
    resolver: zodResolver(movementSchema),
    defaultValues: {
      name: '',
      muscleGroups: [],
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
          muscleGroups: movementData.muscleGroups.map(normalizeMuscleGroup) as MuscleGroupSelection[],
          image: movementData.image || '',
          note: movementData.note || '',
        });
      } else if (!isEditing) {
        // Create mode: use shared data or defaults
        form.reset({
          name: initialData?.name || '',
          muscleGroups: [],
          image: initialData?.image || '',
          note: initialData?.note || '',
        });
      }
    }
  }, [open, isEditing, movementData, form, initialData]);

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

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader>
          <DrawerTitle>
            {isEditing ? 'Edit Movement' : 'Create New Movement'}
          </DrawerTitle>
          <DrawerDescription>
            {isEditing
              ? 'Update the movement details below.'
              : 'Add a new exercise movement to your library.'}
          </DrawerDescription>
        </DrawerHeader>

        <div className="overflow-y-auto px-4">
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

            </form>
          </Form>
        </div>

        <DrawerFooter className="gap-2">
          <Button
            onClick={form.handleSubmit(onSubmit)}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading
              ? 'Saving...'
              : isEditing
                ? 'Update Movement'
                : 'Create Movement'}
          </Button>
          {isEditing && onDelete && (
            <Button
              type="button"
              variant="destructive"
              onClick={() => onDelete(editingId)}
              disabled={isLoading}
              className="w-full"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Movement
            </Button>
          )}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
