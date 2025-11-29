import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Ellipsis } from 'lucide-react';

interface Movement {
  _id: string;
  name: string;
  muscleGroups: Array<{
    main: string;
    sub: string | null; // null = all sub-groups
  }>;
  youtubeLink?: string;
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
          {movement.muscleGroups.map((mg, index) => (
            <div key={index} className="flex gap-1">
              {mg.sub ? (
                <Badge variant="outline">{mg.sub}</Badge>
              ) : <Badge variant="secondary">{mg.main}</Badge>}
            </div>
          ))}
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
              className="w-full h-full object-cover"
            />
          </div>
        </CardContent>
      )}
    </Card>
  );
}
