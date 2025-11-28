'use client';

import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MovementCard } from './MovementCard';
import { EmptyState } from '@/components/shared/EmptyState';
import { MovementsLoadingSkeleton } from '@/components/shared/LoadingState';
import { MAIN_MUSCLE_GROUPS } from '@/lib/constants/muscleGroups';
import { Dumbbell } from 'lucide-react';

interface Movement {
  _id: string;
  name: string;
  muscleGroups: Array<{
    main: string;
    sub: string | null;
  }>;
  youtubeLink?: string;
  image?: string;
}

interface MovementsListProps {
  movements?: Movement[];
  isLoading: boolean;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onAddMovement: () => void;
}

export function MovementsList({
  movements = [],
  isLoading,
  onEdit,
  onDelete,
  onAddMovement,
}: MovementsListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [muscleFilter, setMuscleFilter] = useState<string>('all');

  const filteredMovements = useMemo(() => {
    return movements.filter((movement) => {
      const matchesSearch = movement.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchesFilter =
        muscleFilter === 'all' ||
        movement.muscleGroups.some((mg) => mg.main === muscleFilter);
      return matchesSearch && matchesFilter;
    });
  }, [movements, searchQuery, muscleFilter]);

  if (isLoading) {
    return <MovementsLoadingSkeleton />;
  }

  if (movements.length === 0) {
    return (
      <EmptyState
        title="No movements yet"
        description="Create your first movement to start building routines"
        actionLabel="Add Movement"
        onAction={onAddMovement}
        icon={<Dumbbell className="h-16 w-16" />}
      />
    );
  }

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <Input
          placeholder="Search movements..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-11 flex-1"
        />
        <Select value={muscleFilter} onValueChange={setMuscleFilter}>
          <SelectTrigger className="h-11 sm:w-48">
            <SelectValue placeholder="Filter by muscle group" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Muscle Groups</SelectItem>
            {MAIN_MUSCLE_GROUPS.map((group) => (
              <SelectItem key={group} value={group}>
                {group}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Grid */}
      {filteredMovements.length === 0 ? (
        <EmptyState
          title="No matching movements"
          description="Try adjusting your search or filter criteria"
          icon={<Dumbbell className="h-16 w-16" />}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMovements.map((movement) => (
            <MovementCard
              key={movement._id}
              movement={movement}
              onEdit={() => onEdit(movement._id)}
              onDelete={() => onDelete(movement._id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
