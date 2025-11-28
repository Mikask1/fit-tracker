'use client';

import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { RoutineCard } from './RoutineCard';
import { EmptyState } from '@/components/shared/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { ListChecks } from 'lucide-react';

interface Exercise {
  movementId: any;
  targetSets: number;
  targetReps: number;
  supersetWith: any[];
  order: number;
}

interface Routine {
  _id: any;
  name: string;
  exercises: Exercise[];
  createdAt: Date;
  updatedAt: Date;
}

interface RoutinesListProps {
  routines?: Routine[];
  isLoading: boolean;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string, newName: string) => void;
  onAddRoutine: () => void;
}

export function RoutinesList({
  routines = [],
  isLoading,
  onEdit,
  onDelete,
  onDuplicate,
  onAddRoutine,
}: RoutinesListProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredRoutines = useMemo(() => {
    return routines.filter((routine) => {
      const matchesSearch = routine.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [routines, searchQuery]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  if (routines.length === 0) {
    return (
      <EmptyState
        title="No routines yet"
        description="Create your first routine to start tracking workouts"
        actionLabel="Add Routine"
        onAction={onAddRoutine}
        icon={<ListChecks className="h-16 w-16" />}
      />
    );
  }

  return (
    <div>
      {/* Search Filter */}
      <div className="mb-6">
        <Input
          placeholder="Search routines..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-11"
        />
      </div>

      {/* List */}
      {filteredRoutines.length === 0 ? (
        <EmptyState
          title="No matching routines"
          description="Try adjusting your search criteria"
          icon={<ListChecks className="h-16 w-16" />}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRoutines.map((routine) => (
            <RoutineCard
              key={routine._id}
              routine={routine}
              onEdit={() => onEdit(routine._id)}
              onDelete={() => onDelete(routine._id)}
              onDuplicate={(newName) => onDuplicate(routine._id, newName)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
