'use client';

import { useState } from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface NoteDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  initialValue?: string;
  onSave: (value: string) => void;
  /** Render as a nested drawer (when opened from inside another drawer). */
  nested?: boolean;
}

/** A bottom drawer for entering/editing a free-text note. */
export function NoteDrawer({
  open,
  onOpenChange,
  title = 'Note',
  description,
  initialValue = '',
  onSave,
  nested = false,
}: NoteDrawerProps) {
  const [value, setValue] = useState(initialValue);
  const [wasOpen, setWasOpen] = useState(open);

  // Re-seed the field when the drawer transitions to open, by adjusting state
  // during render (avoids an effect + cascading renders).
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setValue(initialValue);
    }
  }

  const handleSave = () => {
    onSave(value.trim());
    onOpenChange(false);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange} nested={nested}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader>
          <DrawerTitle>{title}</DrawerTitle>
          {description && <DrawerDescription>{description}</DrawerDescription>}
        </DrawerHeader>

        <div className="px-4">
          <Textarea
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Write a note..."
            className="min-h-28"
          />
        </div>

        <DrawerFooter>
          <Button onClick={handleSave} className="min-h-11">
            Save note
          </Button>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="min-h-11"
          >
            Cancel
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
