'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { trpc } from '@/lib/trpc/client';
import { SessionStatus } from '@/types';
import { startOfWeek, endOfWeek } from 'date-fns';
import { Target, Edit2 } from 'lucide-react';
import { toast } from 'sonner';

export function WeeklyStats() {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState<number>(3);
  const utils = trpc.useUtils();

  // Get user data (including expected workouts per week)
  const { data: user } = trpc.auth.me.useQuery();

  // Get current week's completed sessions
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 }); // Sunday

  const { data: sessions } = trpc.sessions.listByDateRange.useQuery({
    startDate: weekStart,
    endDate: weekEnd,
  });

  // Update mutation
  const updateMutation = trpc.auth.updatePreferences.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      toast.success('Expected workouts updated!');
      setIsEditing(false);
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  // Count completed sessions this week
  const completedThisWeek = sessions?.filter(
    (session) => session.status === SessionStatus.COMPLETED
  ).length || 0;

  const expectedWorkouts = user?.expectedWorkoutsPerWeek || 3;

  const handleEdit = () => {
    setEditValue(expectedWorkouts);
    setIsEditing(true);
  };

  const handleSave = () => {
    if (editValue < 1 || editValue > 7) {
      toast.error('Expected workouts must be between 1 and 7');
      return;
    }
    updateMutation.mutate({ expectedWorkoutsPerWeek: editValue });
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditValue(expectedWorkouts);
  };

  // Calculate progress percentage
  const progressPercentage = Math.min(
    (completedThisWeek / expectedWorkouts) * 100,
    100
  );

  return (
    <>
      <Card className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div className="p-2 rounded-lg bg-primary/10">
              <Target className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium">This Week's Progress</h3>
              <div className="mt-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">
                    {completedThisWeek}
                  </span>
                  <span className="text-muted-foreground">
                    / {expectedWorkouts} workouts
                  </span>
                </div>
                {/* Progress Bar */}
                <div className="mt-2 w-full bg-secondary rounded-full h-2">
                  <div
                    className="bg-primary rounded-full h-2 transition-all duration-300"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {completedThisWeek >= expectedWorkouts
                    ? '🎉 Goal achieved!'
                    : `${expectedWorkouts - completedThisWeek} more to reach your goal`}
                </p>
              </div>
            </div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleEdit}
            className="shrink-0"
          >
            <Edit2 className="h-4 w-4" />
          </Button>
        </div>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Weekly Goal</DialogTitle>
            <DialogDescription>
              Set your expected number of workouts per week
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="expected-workouts">
                Expected workouts per week
              </Label>
              <Input
                id="expected-workouts"
                type="number"
                min={1}
                max={7}
                value={editValue}
                onChange={(e) =>
                  setEditValue(parseInt(e.target.value) || 1)
                }
                className="h-11"
                disabled={updateMutation.isPending}
              />
              <p className="text-xs text-muted-foreground">
                Choose between 1 and 7 workouts per week
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={updateMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
