import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Ellipsis } from 'lucide-react';
import { normalizeMuscleGroup } from '@/lib/constants/muscleGroups';

interface Movement {
  _id: string;
  name: string;
  muscleGroups: Array<{
    main: string;
    category: string | null;
    specific: string | null;
    sub: string | null; // DEPRECATED
  }>;
  image?: string;
  note?: string;
}

interface MovementCardProps {
  movement: Movement;
  onEdit: () => void;
}

export function MovementCard({ movement, onEdit }: MovementCardProps) {
  return (
    <Card
      className="cursor-pointer transition-colors hover:bg-muted/50"
      onClick={onEdit}
    >
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-start justify-between gap-4">{movement.name} <Ellipsis className='rotate-90'/></CardTitle>
        <div className="flex flex-wrap gap-2 mt-2">
          {movement.muscleGroups.map((mg, index) => {
            const normalized = normalizeMuscleGroup(mg);
            // Show most specific level available: specific > category > main
            const display = normalized.specific || normalized.category || normalized.main;
            // Build full path for tooltip
            const fullPath = [normalized.main, normalized.category, normalized.specific]
              .filter(Boolean)
              .join(' → ');

            return (
              <div key={index} className="flex gap-1">
                <Badge
                  variant={normalized.specific || normalized.category ? "outline" : "secondary"}
                  title={fullPath}
                >
                  {display}
                </Badge>
              </div>
            );
          })}
        </div>
        {movement.note && (
          <p className="text-sm text-muted-foreground mt-3 italic">
            {movement.note}
          </p>
        )}
      </CardHeader>
      {movement.image && (
        <CardContent>
          <div className="aspect-video w-full rounded-md overflow-hidden bg-muted">
            <img
              src={movement.image}
              alt={movement.name}
              className="w-full h-full object-contain"
            />
          </div>
        </CardContent>
      )}
    </Card>
  );
}
