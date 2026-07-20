'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, isToday } from 'date-fns';
import { trpc } from '@/lib/trpc/client';
import { SessionStatus } from '@/types';
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
import { MenuDrawer } from '@/components/shared/MenuDrawer';
import { NoteEditor } from '@/components/shared/NoteEditor';
import { ConfirmDrawer } from '@/components/shared/ConfirmDrawer';
import { toast } from 'sonner';
import { EllipsisVertical } from 'lucide-react';
import { CUSTOM_ROUTINE_ID } from '@/lib/constants';

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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNoteDrawerOpen, setIsNoteDrawerOpen] = useState(false);

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

  // Saving a workout note should refresh the session but keep the drawer open.
  const noteMutation = trpc.sessions.update.useMutation({
    onSuccess: async () => {
      if (sessionId) {
        await utils.sessions.getById.invalidate({ id: sessionId });
      }
      await utils.sessions.listByDateRange.invalidate();
      toast.success('Note saved');
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
          movementId: typeof log.movementId === 'object' && log.movementId !== null
            ? log.movementId._id.toString()
            : log.movementId?.toString() ?? '',
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

  const handleSaveNote = async (notes: string) => {
    if (!sessionId) return;
    await noteMutation.mutateAsync({ id: sessionId, notes });
  };

  const handleCreateSession = async (data: SessionFormData) => {
    if (!data.routineId) {
      toast.error('Please select a routine');
      return;
    }

    const created = await createMutation.mutateAsync({
      date,
      sourceRoutineId: data.routineId === CUSTOM_ROUTINE_ID
        ? undefined
        : data.routineId,
      status: SessionStatus.PLANNED,
      logs: [],
    });

    // For today's session, jump straight into the Log Workout view.
    // For any other day, keep the current behaviour (just close the drawer).
    if (isToday(date) && created?._id) {
      router.push(`/calendar/session/${created._id.toString()}`);
    } else {
      onOpenChange(false);
    }
  };

  const onSubmit = async (data: SessionFormData) => {
    if (drawerMode === 'CREATE') {
      await handleCreateSession(data);
    } else if (drawerMode === 'EDIT') {
      // TODO: Handle edit mode
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending || noteMutation.isPending;

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
        {session?.notes && (
          <div>
            <h4 className="text-sm font-medium text-muted-foreground">Note</h4>
            <p className="text-sm whitespace-pre-wrap">{session.notes}</p>
          </div>
        )}
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
                  {log.note && (
                    <p className="mt-2 text-xs text-muted-foreground whitespace-pre-wrap">
                      {log.note}
                    </p>
                  )}
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
              {/* Custom Routine Option */}
              <SelectItem value={CUSTOM_ROUTINE_ID}>
                <div className="flex items-center gap-2">
                  <span>Custom Routine</span>
                  <span className="text-xs text-muted-foreground">(blank workout)</span>
                </div>
              </SelectItem>

              {/* Separator if routines exist */}
              {routines && routines.length > 0 && (
                <div className="border-t my-1" />
              )}

              {/* User's routines */}
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

        {/* ⋮ Options menu (add note / delete) for existing sessions */}
        {sessionId && drawerMode !== 'CREATE' && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setIsMenuOpen(true)}
            disabled={isLoading}
            className="absolute right-3 top-3 h-9 w-9"
            title="Options"
          >
            <EllipsisVertical className="h-5 w-5" />
          </Button>
        )}

        <ScrollArea className="flex-1 overflow-auto">
          {renderContent()}
        </ScrollArea>

        <DrawerFooter className="border-t">
          <div className="flex flex-col gap-2 w-full">
            {/* Action buttons based on mode. Delete & note live in the ⋮ menu. */}
            {drawerMode === 'VIEW' && session?.status === SessionStatus.COMPLETED && (
              <Button
                onClick={() => router.push(`/calendar/session/${sessionId}`)}
                disabled={isLoading}
                className="min-h-11"
              >
                Edit Session
              </Button>
            )}

            {drawerMode === 'TODAY' && (
              <Button
                onClick={() => router.push(`/calendar/session/${sessionId}`)}
                disabled={isLoading}
                className="min-h-11"
              >
                Log Workout
              </Button>
            )}

            {drawerMode === 'CREATE' && (
              <Button
                onClick={form.handleSubmit(onSubmit)}
                disabled={isLoading}
                className="min-h-11"
              >
                {isLoading ? 'Creating...' : 'Create Session'}
              </Button>
            )}
          </div>
        </DrawerFooter>

        {/* ⋮ Options menu + note + delete confirm, nested inside this drawer */}
        <MenuDrawer
          nested
          open={isMenuOpen}
          onOpenChange={setIsMenuOpen}
          title="Workout options"
          hasNote={!!session?.notes}
          onAddNote={() => setIsNoteDrawerOpen(true)}
          onDelete={() => setIsDeleteConfirmOpen(true)}
        />

        <NoteEditor
          open={isNoteDrawerOpen}
          onOpenChange={setIsNoteDrawerOpen}
          title="Workout note"
          initialValue={session?.notes ?? ''}
          onSave={handleSaveNote}
        />

        <ConfirmDrawer
          nested
          open={isDeleteConfirmOpen}
          onOpenChange={setIsDeleteConfirmOpen}
          onConfirm={handleDelete}
          title="Delete Session?"
          description="This will permanently delete this workout session. This action cannot be undone."
          confirmText="Delete"
          variant="destructive"
        />
      </DrawerContent>
    </Drawer>
  </>
  );
}
