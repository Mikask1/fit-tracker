'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { trpc } from '@/lib/trpc/client';
import { SessionStatus } from '@/types';
import { useSessionDraftStore } from '@/store/sessionDraftStore';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LoadingState } from '@/components/shared/LoadingState';
import { ErrorState } from '@/components/shared/ErrorState';
import { ExerciseLogCard } from '@/components/calendar/ExerciseLogCard';
import { AddMovementDrawer } from '@/components/calendar/AddMovementDrawer';
import { ArrowLeft, Plus, GripVertical, AlarmClock, Ellipsis, EllipsisVertical } from 'lucide-react';
import { toast } from 'sonner';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const loggingSchema = z.object({
  logs: z.array(z.object({
    movementId: z.string(),
    movementName: z.string(),
    sets: z.array(z.object({
      weight: z.number().min(0),
      reps: z.number().min(0),
    })),
    isCompleted: z.boolean().optional(),
    completedAt: z.number().optional(),
  })),
});

type LoggingFormData = z.infer<typeof loggingSchema>;

interface PageProps {
  params: Promise<{ id: string }>;
}

// Sortable wrapper for ExerciseLogCard
function SortableExerciseLogCard({
  log,
  index,
  exerciseDetails,
  onAddSet,
  onRemoveSet,
  onUpdateSet,
  onToggleExerciseCompletion,
  onRemove,
  onSwitchMovement,
  canRemove,
}: {
  log: { movementId: string; movementName: string; sets: Array<{ weight: number; reps: number }>; isCompleted?: boolean; completedAt?: number };
  index: number;
  exerciseDetails?: {
    targetSets: number;
    targetReps: number;
    movementId?: string;
    alternativeMovements?: Array<{ movementId: string; order: number }>;
  };
  onAddSet: (index: number) => void;
  onRemoveSet: (index: number, setIndex: number) => void;
  onUpdateSet: (index: number, setIndex: number, field: 'weight' | 'reps', value: number) => void;
  onToggleExerciseCompletion: (index: number, isCompleted: boolean) => void;
  onRemove?: (index: number) => void;
  onSwitchMovement?: (index: number, newMovementId: string, newMovementName: string) => void;
  canRemove?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: index });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      {/* Drag Handle */}
      <button
        type="button"
        className="absolute left-0 top-0 bottom-0 -translate-x-full pr-2 touch-none cursor-grab active:cursor-grabbing flex items-center justify-center text-muted-foreground hover:text-foreground z-10"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-5 w-5" />
      </button>

      <ExerciseLogCard
        log={log}
        index={index}
        exerciseDetails={exerciseDetails}
        onAddSet={onAddSet}
        onRemoveSet={onRemoveSet}
        onUpdateSet={onUpdateSet}
        onToggleExerciseCompletion={onToggleExerciseCompletion}
        onRemove={onRemove}
        onSwitchMovement={onSwitchMovement}
        canRemove={canRemove}
      />
    </div>
  );
}

export default function SessionLoggingPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const router = useRouter();
  const utils = trpc.useUtils();
  const { getDraft, saveDraft, clearDraft } = useSessionDraftStore();
  const [addMovementDrawerOpen, setAddMovementDrawerOpen] = useState(false);

  // Drag-and-drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 500,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Fetch session data
  const { data: session, isLoading: sessionLoading, error: sessionError } = trpc.sessions.getById.useQuery(
    { id: resolvedParams.id }
  );

  // Fetch routine details
  const { data: routine } = trpc.routines.getById.useQuery(
    { id: session?.sourceRoutineId?.toString() || '' },
    { enabled: !!session?.sourceRoutineId }
  );

  const form = useForm<LoggingFormData>({
    resolver: zodResolver(loggingSchema),
    defaultValues: {
      logs: [],
    },
  });

  const logs = form.watch('logs');
  const routineExercises = routine?.exercises || [];

  // Helper to find exercise details from routine
  const getExerciseDetails = (movementId: string) => {
    return routineExercises.find((ex: any) => {
      const exMovementId = typeof ex.movementId === 'object' && ex.movementId !== null
        ? ex.movementId._id.toString()
        : ex.movementId?.toString() ?? '';

      // Check if movementId matches primary
      if (exMovementId === movementId) return true;

      // Check if movementId matches any alternative
      if (ex.alternativeMovements) {
        return ex.alternativeMovements.some((alt: any) => {
          const altMovementId = typeof alt.movementId === 'object' && alt.movementId !== null
            ? alt.movementId._id.toString()
            : alt.movementId?.toString() ?? '';
          return altMovementId === movementId;
        });
      }

      return false;
    });
  };

  // Update mutation
  const updateMutation = trpc.sessions.update.useMutation({
    onSuccess: async () => {
      // Invalidate marks the query as stale
      await utils.sessions.listByDateRange.invalidate();
      // Explicitly refetch to ensure fresh data before navigation
      await utils.sessions.listByDateRange.refetch();
      toast.success('Workout logged successfully!');
      router.push('/calendar');
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  // Initialize form with routine exercises
  useEffect(() => {
    if (!session) return;

    const sessionId = resolvedParams.id;
    const draft = getDraft(sessionId);

    // Compare timestamps to determine freshness
    const sessionUpdatedAt = session.updatedAt
      ? new Date(session.updatedAt).getTime()
      : 0;
    const draftIsNewer = draft && draft.timestamp > sessionUpdatedAt;

    if (draftIsNewer) {
      // Draft is more recent than server data - restore it
      form.reset({ logs: draft.logs });
    } else {
      // Clear stale draft if exists
      if (draft) {
        clearDraft(sessionId);
      }

      // If session already has logs, use them; otherwise initialize from routine
      if (session.logs && session.logs.length > 0) {
        form.reset({
          logs: session.logs.map((log: any) => ({
            movementId: typeof log.movementId === 'object' && log.movementId !== null
              ? log.movementId._id.toString()
              : log.movementId?.toString() ?? '',
            movementName: log.movementName,
            sets: log.sets,
          })),
        });
      } else if (routine) {
        // Initialize new session from routine - fetch last completed data for each movement
        const initializeWithLastCompleted = async () => {
          const logsWithPrefill = await Promise.all(
            routine.exercises.map(async (ex: any) => {
              const movementId = typeof ex.movementId === 'object' && ex.movementId !== null
                ? ex.movementId._id.toString()
                : ex.movementId?.toString() ?? '';

              // Fetch last completed session for this movement
              const lastCompleted = await utils.sessions.getLastCompletedForMovement.fetch({ movementId });

              console.log('Last completed for movement:', movementId, lastCompleted);

              // Pre-fill sets with target reps and weight (from last workout or routine template)
              const sets = Array.from({ length: ex.targetSets }, (_, i) => {
                const lastSet = lastCompleted?.log?.sets?.[i];
                console.log(`Set ${i} - lastSet:`, lastSet, `weight: ${lastSet?.weight || ex.targetWeight}, reps: ${ex.targetReps}`);
                return {
                  weight: lastSet?.weight || ex.targetWeight || 0,
                  reps: ex.targetReps || 0, // Pre-fill with target reps from routine
                };
              });

              return {
                movementId,
                movementName: typeof ex.movementId === 'object' ? ex.movementId.name : '',
                sets,
              };
            })
          );

          console.log('Final logs with prefill:', logsWithPrefill);
          form.reset({ logs: logsWithPrefill });
        };

        initializeWithLastCompleted();
      } else {
        // Custom routine - initialize with empty logs
        form.reset({ logs: [] });
      }
    }
  }, [routine, session, form, utils, getDraft, clearDraft, resolvedParams.id]);

  // Auto-save draft on form changes (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (logs && logs.length > 0) {
        saveDraft(resolvedParams.id, logs);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [logs, saveDraft, resolvedParams.id]);

  const handleCompleteWorkout = async (data: LoggingFormData) => {
    // Mark all exercises as completed
    const completedLogs = data.logs.map(log => ({
      ...log,
      isCompleted: true,
      completedAt: Date.now(),
    }));

    // Update the workout session
    await updateMutation.mutateAsync({
      id: resolvedParams.id,
      status: SessionStatus.COMPLETED,
      logs: completedLogs,
    });

    // Clear draft after successful save
    clearDraft(resolvedParams.id);

    // Update the routine template with actual performed values
    if (session?.sourceRoutineId && routine) {
      try {
        // Build updated exercises array with actual performed values
        const updatedExercises = routine.exercises.map((ex: any) => {
          const exMovementId = typeof ex.movementId === 'object' && ex.movementId !== null
            ? ex.movementId._id.toString()
            : ex.movementId?.toString() ?? '';

          // Find the corresponding log for this exercise
          const log = data.logs.find(l => l.movementId === exMovementId);

          if (log && log.sets.length > 0) {
            // Calculate average weight and reps from performed sets
            const totalWeight = log.sets.reduce((sum, set) => sum + set.weight, 0);
            const totalReps = log.sets.reduce((sum, set) => sum + set.reps, 0);
            const avgWeight = totalWeight / log.sets.length;
            const avgReps = Math.round(totalReps / log.sets.length);

            return {
              movementId: exMovementId,
              targetSets: log.sets.length, // Actual number of sets performed
              targetReps: avgReps, // Average reps performed
              targetWeight: avgWeight, // Average weight used
              order: ex.order,
            };
          }

          // Exercise not performed in this session, keep existing values
          return {
            movementId: exMovementId,
            targetSets: ex.targetSets,
            targetReps: ex.targetReps,
            targetWeight: ex.targetWeight || 0,
            order: ex.order,
          };
        });

        // Update the routine
        await utils.client.routines.update.mutate({
          id: session.sourceRoutineId.toString(),
          exercises: updatedExercises,
        });

        await utils.routines.getById.invalidate({ id: session.sourceRoutineId.toString() });
      } catch (error) {
        console.error('Failed to update routine:', error);
        // Don't block the user, workout was already saved
      }
    }
  };

  const addSet = (logIndex: number) => {
    const currentLogs = form.getValues('logs');
    const updatedLogs = [...currentLogs];
    const log = updatedLogs[logIndex];

    // Get exercise details to pre-fill with target reps and weight
    const exerciseDetails = getExerciseDetails(log.movementId);

    // Pre-fill with last set's weight (or routine's target weight) and target reps
    const lastSet = log.sets[log.sets.length - 1];
    updatedLogs[logIndex].sets.push({
      weight: lastSet?.weight || exerciseDetails?.targetWeight || 0,
      reps: exerciseDetails?.targetReps || 0,
    });
    form.setValue('logs', updatedLogs);
  };

  const removeSet = (logIndex: number, setIndex: number) => {
    const currentLogs = form.getValues('logs');
    const updatedLogs = [...currentLogs];
    if (updatedLogs[logIndex].sets.length > 1) {
      updatedLogs[logIndex].sets = updatedLogs[logIndex].sets.filter((_, i) => i !== setIndex);
      form.setValue('logs', updatedLogs);
    }
  };

  const updateSet = (logIndex: number, setIndex: number, field: 'weight' | 'reps', value: number) => {
    const currentLogs = form.getValues('logs');
    const updatedLogs = [...currentLogs];
    updatedLogs[logIndex].sets[setIndex][field] = value;
    form.setValue('logs', updatedLogs);
  };

  const toggleExerciseCompletion = (logIndex: number, isCompleted: boolean) => {
    const currentLogs = form.getValues('logs');
    const updatedLogs = [...currentLogs];
    updatedLogs[logIndex] = {
      ...updatedLogs[logIndex],
      isCompleted,
      completedAt: isCompleted ? Date.now() : undefined,
    };
    form.setValue('logs', updatedLogs);
  };

  const addMovement = async (movementId: string, movementName: string) => {
    const currentLogs = form.getValues('logs');

    // Fetch last completed data for progressive overload
    const lastCompleted = await utils.sessions.getLastCompletedForMovement.fetch({ movementId });

    // Get exercise details from routine (if exists)
    const exerciseDetails = getExerciseDetails(movementId);

    // Pre-fill sets based on last workout or defaults
    const sets = Array.from(
      { length: exerciseDetails?.targetSets || 3 },
      (_, i) => ({
        weight: lastCompleted?.log?.sets?.[i]?.weight || exerciseDetails?.targetWeight || 0,
        reps: exerciseDetails?.targetReps || 10,
      })
    );

    // Add new log entry
    const newLog = {
      movementId,
      movementName,
      sets,
    };

    form.setValue('logs', [...currentLogs, newLog]);
    toast.success(`Added ${movementName}`);
  };

  const removeMovement = (logIndex: number) => {
    const currentLogs = form.getValues('logs');
    const removed = currentLogs[logIndex];
    const updatedLogs = currentLogs.filter((_, i) => i !== logIndex);
    form.setValue('logs', updatedLogs);
    toast.success(`Removed ${removed.movementName}`);
  };

  const handleSwitchMovement = async (
    logIndex: number,
    newMovementId: string,
    newMovementName: string
  ) => {
    const currentLogs = form.getValues('logs');
    const updatedLogs = [...currentLogs];

    // Update movement, keep existing sets
    updatedLogs[logIndex] = {
      ...updatedLogs[logIndex],
      movementId: newMovementId,
      movementName: newMovementName,
    };

    form.setValue('logs', updatedLogs);
    toast.success(`Switched to ${newMovementName}`);
  };

  const handleDragStart = () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(100);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const currentLogs = form.getValues('logs');
      const oldIndex = active.id as number;
      const newIndex = over.id as number;

      const reordered = arrayMove(currentLogs, oldIndex, newIndex);
      form.setValue('logs', reordered);
    }
  };

  if (sessionLoading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <LoadingState />
      </div>
    );
  }

  if (sessionError || !session) {
    return (
      <div className="container mx-auto px-4 py-6">
        <ErrorState message="Session not found" />
      </div>
    );
  }

  // Map exercises for display
  const exerciseLogs = logs.map((log, index) => {
    const exerciseDetails: any = getExerciseDetails(log.movementId);

    // Format exercise details with primary movementId and alternatives
    const formattedDetails = exerciseDetails ? {
      targetSets: exerciseDetails.targetSets,
      targetReps: exerciseDetails.targetReps,
      movementId: typeof exerciseDetails.movementId === 'object' && exerciseDetails.movementId !== null
        ? exerciseDetails.movementId._id.toString()
        : exerciseDetails.movementId?.toString() ?? '',
      alternativeMovements: exerciseDetails.alternativeMovements?.map((alt: any) => ({
        movementId: typeof alt.movementId === 'object' && alt.movementId !== null
          ? alt.movementId._id.toString()
          : alt.movementId?.toString() ?? '',
        order: alt.order,
      })) || [],
    } : undefined;

    return { log, index, exerciseDetails: formattedDetails };
  });

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="border-b bg-background sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/calendar')}
              className="h-9 w-9"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-xl font-bold">Log Workout</h1>
              <p className="text-sm text-muted-foreground">
                {format(new Date(session.date), 'EEEE, MMMM d, yyyy')}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/timer')}
              className="h-9 w-9"
              title="Timer/Stopwatch"
            >
              <AlarmClock className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </div>

      {/* Body - Scrollable exercise list */}
      <ScrollArea className="flex-1">
        <div className="container mx-auto px-4 py-6 space-y-4">
          {logs.length === 0 ? (
            // Empty state for custom routines
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="border-2 border-dashed rounded-lg p-8 max-w-md w-full">
                <div className="text-center space-y-4">
                  <div className="flex justify-center">
                    <div className="rounded-full bg-muted p-4">
                      <Plus className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">No exercises added yet</h3>
                    <p className="text-sm text-muted-foreground">
                      Tap "Add Movement" below to start building your workout
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="default"
                    onClick={() => setAddMovementDrawerOpen(true)}
                    className="w-full"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Movement
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            // Exercise list
            <>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={logs.map((_, idx) => idx)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-4 pl-8">
                    {exerciseLogs.map(({ log, index, exerciseDetails }) => (
                      <SortableExerciseLogCard
                        key={index}
                        log={log}
                        index={index}
                        exerciseDetails={exerciseDetails}
                        onAddSet={addSet}
                        onRemoveSet={removeSet}
                        onUpdateSet={updateSet}
                        onToggleExerciseCompletion={toggleExerciseCompletion}
                        onRemove={removeMovement}
                        onSwitchMovement={handleSwitchMovement}
                        canRemove={logs.length > 1}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
              <div className='flex flex-col items-center gap-2'>
                <EllipsisVertical className="h-4 w-4 text-muted-foreground" />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAddMovementDrawerOpen(true)}
                  className="min-h-11"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Movement
                </Button>
              </div>
            </>
          )}
        </div>
      </ScrollArea>

      {/* Footer - Sticky action buttons */}
      <div className="border-t bg-background sticky bottom-0 z-50 pb-20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col gap-2">
            <Button
              onClick={form.handleSubmit(handleCompleteWorkout)}
              disabled={updateMutation.isPending || logs.length === 0}
              className="w-full min-h-11"
            >
              {updateMutation.isPending ? 'Saving' : 'Complete Workout'}
            </Button>

            {logs.length === 0 && (
              <p className="text-sm text-muted-foreground text-center">
                Add at least one exercise to complete workout
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Add Movement Drawer */}
      <AddMovementDrawer
        open={addMovementDrawerOpen}
        onOpenChange={setAddMovementDrawerOpen}
        onAddMovement={addMovement}
        excludeMovementIds={logs.map(l => l.movementId)}
      />
    </div>
  );
}
