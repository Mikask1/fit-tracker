'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { trpc } from '@/lib/trpc/client';
import { SessionStatus, type IWorkoutSession } from '@/types';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';

const sessionSchema = z.object({
  routineId: z.string().optional(),
  logs: z.array(z.object({
    movementId: z.string(),
    movementName: z.string(),
    sets: z.array(z.object({
      weight: z.number().min(0),
      reps: z.number().min(0),
    })),
  })),
});

type SessionFormData = z.infer<typeof sessionSchema>;

type DrawerMode = 'VIEW' | 'EDIT' | 'TODAY' | 'CREATE';

interface SessionDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date;
  sessionId: string | null;
  scheduledRoutineId?: string;
  onSuccess?: () => void;
}

export function SessionDrawer({
  open,
  onOpenChange,
  date,
  sessionId,
  scheduledRoutineId,
  onSuccess,
}: SessionDrawerProps) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const [drawerMode, setDrawerMode] = useState<DrawerMode>('VIEW');
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const form = useForm<SessionFormData>({
    resolver: zodResolver(sessionSchema),
    defaultValues: {
      routineId: scheduledRoutineId || undefined,
      logs: [],
    },
  });

  // Fetch existing session if editing/viewing
  const { data: session, isLoading: sessionLoading } = trpc.sessions.getById.useQuery(
    { id: sessionId! },
    { enabled: !!sessionId && open }
  );

  // Determine drawer mode based on session status only (ignore date)
  useEffect(() => {
    if (!open) return;

    if (sessionId) {
      // Only 2 states for existing sessions: COMPLETED or everything else
      if (session?.status === SessionStatus.COMPLETED) {
        setDrawerMode('VIEW'); // LOGGED: Edit & Delete
      } else {
        setDrawerMode('TODAY'); // PLANNED: Log Workout
      }
    } else {
      setDrawerMode('CREATE'); // EMPTY: Create Session
    }
  }, [open, sessionId, session]);

  // Fetch routines for CREATE mode
  const { data: routines } = trpc.routines.list.useQuery(undefined, {
    enabled: open && drawerMode === 'CREATE',
  });

  // Mutations
  const createMutation = trpc.sessions.create.useMutation({
    onSuccess: async () => {
      await utils.sessions.listByDateRange.invalidate();
      toast.success('Session created successfully!');
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const updateMutation = trpc.sessions.update.useMutation({
    onSuccess: async () => {
      await utils.sessions.listByDateRange.invalidate();
      toast.success('Session updated successfully!');
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const deleteMutation = trpc.sessions.delete.useMutation({
    onSuccess: async () => {
      await utils.sessions.listByDateRange.invalidate();
      toast.success('Session deleted successfully!');
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  // Load session data when available
  useEffect(() => {
    if (session && open) {
      form.reset({
        routineId: session.sourceRoutineId?.toString(),
        logs: session.logs.map((log: any) => ({
          movementId: typeof log.movementId === 'object' ? log.movementId._id.toString() : log.movementId.toString(),
          movementName: log.movementName,
          sets: log.sets,
        })),
      });
    }
  }, [session, open, form]);

  const handleDelete = async () => {
    if (!sessionId) return;
    await deleteMutation.mutateAsync({ id: sessionId });
    setIsDeleteConfirmOpen(false);
  };

  const handleCreateSession = async (data: SessionFormData) => {
    if (!data.routineId) {
      toast.error('Please select a routine');
      return;
    }

    await createMutation.mutateAsync({
      date,
      sourceRoutineId: data.routineId,
      status: SessionStatus.PLANNED,
      logs: [],
    });
    onOpenChange(false);
  };

  const onSubmit = async (data: SessionFormData) => {
    if (drawerMode === 'CREATE') {
      await handleCreateSession(data);
    } else if (drawerMode === 'EDIT') {
      // TODO: Handle edit mode
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  // Render different content based on mode
  const renderContent = () => {
    if (sessionLoading) {
      return <div className="p-4 text-center text-muted-foreground">Loading session...</div>;
    }

    switch (drawerMode) {
      case 'VIEW':
        return renderViewMode();
      case 'EDIT':
        return renderEditMode();
      case 'TODAY':
        return renderTodayMode();
      case 'CREATE':
        return renderCreateMode();
      default:
        return null;
    }
  };

  const renderViewMode = () => (
    <div className="p-4">
      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-medium text-muted-foreground">Status</h4>
          <p className="text-lg font-semibold">{session?.status}</p>
        </div>
        {session?.logs && session.logs.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Exercises</h4>
            <div className="space-y-3">
              {session.logs.map((log: any, index: number) => (
                <div key={index} className="border rounded-lg p-3">
                  <h5 className="font-medium">{log.movementName}</h5>
                  <div className="mt-2 space-y-1">
                    {log.sets.map((set: any, setIndex: number) => (
                      <div key={setIndex} className="text-sm text-muted-foreground">
                        Set {setIndex + 1}: {set.weight} kg × {set.reps} reps
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderEditMode = () => (
    <div className="p-4">
      <p className="text-muted-foreground">Edit mode coming soon...</p>
      {/* TODO: Implement edit mode */}
    </div>
  );

  const renderTodayMode = () => (
    <div className="p-4">
      <p className="text-muted-foreground text-center">
        Ready to log this workout? Click the button below to track your sets, reps, and weight.
      </p>
    </div>
  );

  const renderCreateMode = () => (
    <div className="p-4">
      <div className="space-y-4">
        <div>
          <label htmlFor="routine" className="text-sm font-medium">
            Select Routine
          </label>
          <Select
            value={form.watch('routineId')}
            onValueChange={(value) => form.setValue('routineId', value)}
          >
            <SelectTrigger className="mt-1.5">
              <SelectValue placeholder="Choose a routine" />
            </SelectTrigger>
            <SelectContent>
              {routines?.map((routine: any) => (
                <SelectItem key={routine._id.toString()} value={routine._id.toString()}>
                  {routine.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {scheduledRoutineId && (
          <p className="text-sm text-muted-foreground">
            Pre-filled with scheduled routine
          </p>
        )}
      </div>
    </div>
  );

  return (
    <>
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh] flex flex-col">
        <DrawerHeader>
          <DrawerTitle>
            {drawerMode === 'CREATE' && 'Create Workout'}
            {drawerMode === 'VIEW' && 'Logged Workout'}
            {drawerMode === 'TODAY' && 'Planned Workout'}
          </DrawerTitle>
          <DrawerDescription>
            {format(date, 'EEEE, MMMM d, yyyy')}
          </DrawerDescription>
        </DrawerHeader>

        <ScrollArea className="flex-1 overflow-auto">
          {renderContent()}
        </ScrollArea>

        <DrawerFooter className="border-t">
          <div className="flex flex-col gap-2 w-full">
            {/* Action buttons based on mode */}
            {drawerMode === 'VIEW' && (
              <>
                {session?.status === SessionStatus.COMPLETED && (
                  <Button
                    onClick={() => router.push(`/calendar/session/${sessionId}`)}
                    disabled={isLoading}
                    className="min-h-11"
                  >
                    Edit Session
                  </Button>
                )}
                <Button
                  variant="destructive"
                  onClick={() => setIsDeleteConfirmOpen(true)}
                  disabled={isLoading}
                  className="min-h-11"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Session
                </Button>
              </>
            )}

            {drawerMode === 'EDIT' && (
              <>
                <Button
                  variant="destructive"
                  onClick={() => setIsDeleteConfirmOpen(true)}
                  disabled={isLoading}
                  className="min-h-11"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Session
                </Button>
              </>
            )}

            {drawerMode === 'TODAY' && (
              <>
                <Button
                  onClick={() => router.push(`/calendar/session/${sessionId}`)}
                  disabled={isLoading}
                  className="min-h-11"
                >
                  Log Workout
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setIsDeleteConfirmOpen(true)}
                  disabled={isLoading}
                  className="min-h-11"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Session
                </Button>
              </>
            )}

            {drawerMode === 'CREATE' && (
              <>
                <Button
                  onClick={form.handleSubmit(onSubmit)}
                  disabled={isLoading}
                  className="min-h-11"
                >
                  {isLoading ? 'Creating...' : 'Create Session'}
                </Button>
              </>
            )}
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>

    {/* Confirm Dialog */}
    <ConfirmDialog
      open={isDeleteConfirmOpen}
      onOpenChange={setIsDeleteConfirmOpen}
      onConfirm={handleDelete}
      title="Delete Session?"
      description="This will permanently delete this workout session. This action cannot be undone."
      confirmText="Delete"
      variant="destructive"
    />
  </>
  );
}
