'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { trpc } from '@/lib/trpc/client';
import { cn } from '@/lib/utils';
import { useEnsureSessionBuffer } from '@/lib/utils/session-generator';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const scheduleSchema = z.object({
  routineId: z.string().min(1, 'Please select a routine'),
  daysOfWeek: z.array(z.number()).min(1, 'Please select at least one day'),
  startDate: z.date(),
  endDate: z.date().optional(),
});

type ScheduleFormData = z.infer<typeof scheduleSchema>;

interface ScheduleDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scheduleId?: string | null;
  onSuccess?: () => void;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sun', fullLabel: 'Sunday' },
  { value: 1, label: 'Mon', fullLabel: 'Monday' },
  { value: 2, label: 'Tue', fullLabel: 'Tuesday' },
  { value: 3, label: 'Wed', fullLabel: 'Wednesday' },
  { value: 4, label: 'Thu', fullLabel: 'Thursday' },
  { value: 5, label: 'Fri', fullLabel: 'Friday' },
  { value: 6, label: 'Sat', fullLabel: 'Saturday' },
];

export function ScheduleDrawer({
  open,
  onOpenChange,
  scheduleId,
  onSuccess,
}: ScheduleDrawerProps) {
  const utils = trpc.useUtils();
  const { mutate: generateSessions } = useEnsureSessionBuffer();

  // Fetch routines for dropdown
  const { data: routines } = trpc.routines.list.useQuery(undefined, {
    enabled: open,
  });

  // Fetch existing schedule if editing
  const { data: schedule, isLoading: scheduleLoading } = trpc.schedules.getById.useQuery(
    { id: scheduleId! },
    { enabled: !!scheduleId && open }
  );

  const form = useForm<ScheduleFormData>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: {
      routineId: '',
      daysOfWeek: [],
      startDate: new Date(),
      endDate: undefined,
    },
  });

  // Mutations
  const createMutation = trpc.schedules.create.useMutation({
    onSuccess: async () => {
      await utils.schedules.list.invalidate();
      toast.success('Schedule created successfully!');
      // Auto-generate sessions after schedule creation
      generateSessions(undefined, {
        onSuccess: async () => {
          await utils.sessions.listByDateRange.invalidate();
        },
      });
      onSuccess?.();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const updateMutation = trpc.schedules.update.useMutation({
    onSuccess: async () => {
      await utils.schedules.list.invalidate();
      toast.success('Schedule updated successfully!');
      // Auto-generate sessions after schedule update
      generateSessions(undefined, {
        onSuccess: async () => {
          await utils.sessions.listByDateRange.invalidate();
        },
      });
      onSuccess?.();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  // Load schedule data when editing
  useEffect(() => {
    if (schedule && open) {
      form.reset({
        routineId: schedule.routineId?._id?.toString() || schedule.routineId?.toString() || '',
        daysOfWeek: schedule.recurrenceRule.daysOfWeek,
        startDate: new Date(schedule.recurrenceRule.startDate),
        endDate: schedule.recurrenceRule.endDate ? new Date(schedule.recurrenceRule.endDate) : undefined,
      });
    } else if (!scheduleId && open) {
      // Reset form for create mode
      form.reset({
        routineId: '',
        daysOfWeek: [],
        startDate: new Date(),
        endDate: undefined,
      });
    }
  }, [schedule, scheduleId, open, form]);

  const onSubmit = async (data: ScheduleFormData) => {
    if (scheduleId) {
      // Update existing schedule
      await updateMutation.mutateAsync({
        id: scheduleId,
        daysOfWeek: data.daysOfWeek,
        startDate: data.startDate,
        endDate: data.endDate,
      });
    } else {
      // Create new schedule
      await createMutation.mutateAsync(data);
    }
  };

  const toggleDay = (dayValue: number) => {
    const currentDays = form.getValues('daysOfWeek');
    if (currentDays.includes(dayValue)) {
      form.setValue(
        'daysOfWeek',
        currentDays.filter((d) => d !== dayValue)
      );
    } else {
      form.setValue('daysOfWeek', [...currentDays, dayValue].sort());
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;
  const selectedDays = form.watch('daysOfWeek');

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh] flex flex-col">
        <DrawerHeader>
          <DrawerTitle>
            {scheduleId ? 'Edit Schedule' : 'Create Recurring Schedule'}
          </DrawerTitle>
          <DrawerDescription>
            Set up a recurring workout schedule for a routine
          </DrawerDescription>
        </DrawerHeader>

        <ScrollArea className="flex-1 overflow-auto">
          <div className="p-4 space-y-6">
            {scheduleLoading ? (
              <div className="text-center text-muted-foreground">Loading schedule...</div>
            ) : (
              <>
                {/* Routine Selection */}
                <div className="space-y-2">
                  <Label htmlFor="routine">Routine</Label>
                  <Select
                    value={form.watch('routineId')}
                    onValueChange={(value) => form.setValue('routineId', value)}
                    disabled={isLoading}
                  >
                    <SelectTrigger id="routine">
                      <SelectValue placeholder="Select a routine" />
                    </SelectTrigger>
                    <SelectContent>
                      {routines?.map((routine: any) => (
                        <SelectItem key={routine._id.toString()} value={routine._id.toString()}>
                          {routine.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.routineId && (
                    <p className="text-sm text-destructive">{form.formState.errors.routineId.message}</p>
                  )}
                </div>

                {/* Days of Week */}
                <div className="space-y-3">
                  <Label>Days of Week</Label>
                  <div className="grid grid-cols-7 gap-2">
                    {DAYS_OF_WEEK.map((day) => {
                      const isSelected = selectedDays.includes(day.value);
                      return (
                        <button
                          key={day.value}
                          type="button"
                          onClick={() => toggleDay(day.value)}
                          disabled={isLoading}
                          className={cn(
                            'flex flex-col items-center justify-center p-2 rounded-lg border-2 transition-colors min-h-[60px]',
                            isSelected
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-background hover:bg-accent border-input'
                          )}
                        >
                          <span className="text-xs font-medium">{day.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  {form.formState.errors.daysOfWeek && (
                    <p className="text-sm text-destructive">{form.formState.errors.daysOfWeek.message}</p>
                  )}
                </div>

                {/* Start Date */}
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <input
                    id="startDate"
                    type="date"
                    value={format(form.watch('startDate') || new Date(), 'yyyy-MM-dd')}
                    onChange={(e) => {
                      const date = new Date(e.target.value);
                      form.setValue('startDate', date);
                    }}
                    disabled={isLoading}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>

                {/* End Date (Optional) */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="hasEndDate"
                      checked={!!form.watch('endDate')}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          form.setValue('endDate', new Date());
                        } else {
                          form.setValue('endDate', undefined);
                        }
                      }}
                      disabled={isLoading}
                    />
                    <Label htmlFor="hasEndDate" className="cursor-pointer">
                      Set end date (optional)
                    </Label>
                  </div>
                  {form.watch('endDate') && (
                    <input
                      type="date"
                      value={format(form.watch('endDate')!, 'yyyy-MM-dd')}
                      onChange={(e) => {
                        const date = new Date(e.target.value);
                        form.setValue('endDate', date);
                      }}
                      disabled={isLoading}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  )}
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        <DrawerFooter className="border-t">
          <div className="flex flex-col gap-2 w-full">
            <Button
              onClick={form.handleSubmit(onSubmit)}
              disabled={isLoading || scheduleLoading}
              className="min-h-11"
            >
              {isLoading ? 'Saving...' : scheduleId ? 'Update Schedule' : 'Create Schedule'}
            </Button>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="min-h-11"
            >
              Cancel
            </Button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
