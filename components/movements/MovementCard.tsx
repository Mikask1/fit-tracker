import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2 } from 'lucide-react';

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
  onDelete: () => void;
}

export function MovementCard({ movement, onEdit, onDelete }: MovementCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start gap-2">
          <CardTitle className="text-lg">{movement.name}</CardTitle>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={onEdit}
              className="h-9 w-9 p-0"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onDelete}
              className="h-9 w-9 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
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
