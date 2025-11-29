'use client';

import { use, useEffect } from 'react';
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
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

const loggingSchema = z.object({
  logs: z.array(z.object({
    movementId: z.string(),
    movementName: z.string(),
    sets: z.array(z.object({
      weight: z.number().min(0),
      reps: z.number().min(0),
    })),
  })),
});

type LoggingFormData = z.infer<typeof loggingSchema>;

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function SessionLoggingPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const router = useRouter();
  const utils = trpc.useUtils();
  const { getDraft, saveDraft, clearDraft } = useSessionDraftStore();

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
      const exMovementId = typeof ex.movementId === 'object' ? ex.movementId._id.toString() : ex.movementId.toString();
      return exMovementId === movementId;
    });
  };

  // Update mutation
  const updateMutation = trpc.sessions.update.useMutation({
    onSuccess: async () => {
      await utils.sessions.listByDateRange.invalidate();
      toast.success('Workout logged successfully!');
      router.push('/calendar');
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  // Initialize form with routine exercises
  useEffect(() => {
    if (!routine || !session) return;

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
      toast.info('Restored your unsaved changes', { duration: 2000 });
    } else {
      // Clear stale draft if exists
      if (draft) {
        clearDraft(sessionId);
      }

      // If session already has logs, use them; otherwise initialize from routine
      if (session.logs && session.logs.length > 0) {
        form.reset({
          logs: session.logs.map((log: any) => ({
            movementId: typeof log.movementId === 'object' ? log.movementId._id.toString() : log.movementId.toString(),
            movementName: log.movementName,
            sets: log.sets,
          })),
        });
      } else {
        // Initialize new session - fetch last completed data for each movement
        const initializeWithLastCompleted = async () => {
          const logsWithPrefill = await Promise.all(
            routine.exercises.map(async (ex: any) => {
              const movementId = typeof ex.movementId === 'object' ? ex.movementId._id.toString() : ex.movementId.toString();

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
    // Update the workout session
    await updateMutation.mutateAsync({
      id: resolvedParams.id,
      status: SessionStatus.COMPLETED,
      logs: data.logs,
    });

    // Clear draft after successful save
    clearDraft(resolvedParams.id);

    // Update the routine template with actual performed values
    if (session?.sourceRoutineId && routine) {
      try {
        // Build updated exercises array with actual performed values
        const updatedExercises = routine.exercises.map((ex: any) => {
          const exMovementId = typeof ex.movementId === 'object' ? ex.movementId._id.toString() : ex.movementId.toString();

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
    const exerciseDetails = getExerciseDetails(log.movementId);
    return { log, index, exerciseDetails };
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
          </div>
        </div>
      </div>

      {/* Body - Scrollable exercise list */}
      <ScrollArea className="flex-1">
        <div className="container mx-auto px-4 py-6 pb-32 space-y-4">
          {exerciseLogs.map(({ log, index, exerciseDetails }) => (
            <ExerciseLogCard
              key={index}
              log={log}
              index={index}
              exerciseDetails={exerciseDetails}
              onAddSet={addSet}
              onRemoveSet={removeSet}
              onUpdateSet={updateSet}
            />
          ))}
        </div>
      </ScrollArea>

      {/* Footer - Sticky action buttons */}
      <div className="border-t bg-background sticky bottom-0 z-50 pb-20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col gap-2">
            <Button
              onClick={form.handleSubmit(handleCompleteWorkout)}
              disabled={updateMutation.isPending}
              className="w-full min-h-11"
            >
              {updateMutation.isPending ? 'Saving...' : 'Complete Workout'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
