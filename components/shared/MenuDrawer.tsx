'use client';

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import { cn } from '@/lib/utils';
import { StickyNote, Trash2 } from 'lucide-react';

interface MenuDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  /** When true, the "Add note" button label becomes "Edit note". */
  hasNote?: boolean;
  /** Omit to hide the note button. */
  onAddNote?: () => void;
  /** Omit to hide the delete button. */
  onDelete?: () => void;
  /** Render as a nested drawer (when opened from inside another drawer). */
  nested?: boolean;
}

/**
 * A ⋮ action menu presented as a bottom drawer with two large circular
 * icon buttons (Add/Edit note and Delete), each with a subtitle.
 */
export function MenuDrawer({
  open,
  onOpenChange,
  title = 'Options',
  description,
  hasNote = false,
  onAddNote,
  onDelete,
  nested = false,
}: MenuDrawerProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange} nested={nested}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader>
          <DrawerTitle>{title}</DrawerTitle>
          {description && <DrawerDescription>{description}</DrawerDescription>}
        </DrawerHeader>

        <div className="flex items-start justify-center gap-8 p-6 pb-nav-safe">
          {onAddNote && (
            <MenuButton
              label={hasNote ? 'Edit note' : 'Add note'}
              subtitle={hasNote ? 'Update the note' : 'Attach a note'}
              icon={<StickyNote className="h-7 w-7" />}
              onClick={() => {
                onOpenChange(false);
                onAddNote();
              }}
            />
          )}
          {onDelete && (
            <MenuButton
              label="Delete"
              subtitle="Remove permanently"
              destructive
              icon={<Trash2 className="h-7 w-7" />}
              onClick={() => {
                onOpenChange(false);
                onDelete();
              }}
            />
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function MenuButton({
  label,
  subtitle,
  icon,
  onClick,
  destructive = false,
}: {
  label: string;
  subtitle: string;
  icon: React.ReactNode;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-24 flex-col items-center gap-2 text-center"
    >
      <span
        className={cn(
          'flex h-16 w-16 items-center justify-center rounded-full transition-colors',
          destructive
            ? 'bg-destructive/10 text-destructive hover:bg-destructive/20'
            : 'bg-muted text-foreground hover:bg-muted/70'
        )}
      >
        {icon}
      </span>
      <span className="text-sm font-medium">{label}</span>
      <span className="text-xs text-muted-foreground leading-tight">{subtitle}</span>
    </button>
  );
}
