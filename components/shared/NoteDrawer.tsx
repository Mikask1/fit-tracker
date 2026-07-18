'use client';

import { useEffect, useRef, useState } from 'react';
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

// Vaul's open/close transition duration. Focusing the textarea before the
// drawer settles makes iOS Safari scroll the page to the focused field while
// the drawer is still translating, which breaks vaul's keyboard repositioning.
const DRAWER_ANIMATION_MS = 500;

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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Re-seed the field when the drawer transitions to open, by adjusting state
  // during render (avoids an effect + cascading renders).
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setValue(initialValue);
    }
  }

  // Bring up the keyboard only after the drawer (and, when nested, the menu
  // drawer closing beneath it) has finished animating.
  useEffect(() => {
    if (!open) return;
    const timeout = window.setTimeout(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus({ preventScroll: true });
      el.setSelectionRange(el.value.length, el.value.length);
    }, DRAWER_ANIMATION_MS + 50);
    return () => window.clearTimeout(timeout);
  }, [open]);

  // Dismiss the keyboard before the close animation starts; otherwise iOS
  // Safari collapses the visual viewport mid-animation and can leave the page
  // scrolled behind the drawer.
  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      textareaRef.current?.blur();
    }
    onOpenChange(nextOpen);
  };

  const handleSave = () => {
    onSave(value.trim());
    handleOpenChange(false);
  };

  return (
    <Drawer open={open} onOpenChange={handleOpenChange} nested={nested}>
      <DrawerContent
        className="max-h-[90dvh]"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DrawerHeader>
          <DrawerTitle>{title}</DrawerTitle>
          {description && <DrawerDescription>{description}</DrawerDescription>}
        </DrawerHeader>

        {/* data-vaul-no-drag: touches in the textarea (cursor placement, text
            selection, scrolling a long note) must not drag the drawer. */}
        <div className="min-h-0 overflow-y-auto px-4" data-vaul-no-drag>
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Write a note..."
            className="min-h-28"
          />
        </div>

        <DrawerFooter className="pb-[max(env(safe-area-inset-bottom),1rem)]">
          <Button onClick={handleSave} className="min-h-11">
            Save note
          </Button>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            className="min-h-11"
          >
            Cancel
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
