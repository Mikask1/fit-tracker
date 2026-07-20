'use client';

import { useRef, useState } from 'react';
import {
  FullScreenEditor,
  FullScreenEditorHeader,
  FullScreenEditorBody,
} from '@/components/ui/full-screen-editor';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface NoteEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  initialValue?: string;
  onSave: (value: string) => void;
}

/** A full-screen editor for entering/editing a free-text note. */
export function NoteEditor({
  open,
  onOpenChange,
  title = 'Note',
  description,
  initialValue = '',
  onSave,
}: NoteEditorProps) {
  const [value, setValue] = useState(initialValue);
  const [wasOpen, setWasOpen] = useState(open);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Re-seed the field when the editor transitions to open, by adjusting state
  // during render (avoids an effect + cascading renders).
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setValue(initialValue);
    }
  }

  // Dismiss the keyboard before the close animation starts so iOS Safari
  // doesn't leave the visual viewport offset behind the editor.
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
    <FullScreenEditor
      open={open}
      onOpenChange={handleOpenChange}
      hasDescription={!!description}
      // Focus the textarea on open so the keyboard comes up ready to type.
      // The top-anchored layout means Safari's scroll-into-view is a no-op.
      onOpenAutoFocus={(e) => {
        e.preventDefault();
        const el = textareaRef.current;
        if (!el) return;
        el.focus({ preventScroll: true });
        el.setSelectionRange(el.value.length, el.value.length);
      }}
    >
      <FullScreenEditorHeader
        title={title}
        description={description}
        onCancel={() => handleOpenChange(false)}
        action={
          <Button onClick={handleSave} className="min-h-11">
            Save
          </Button>
        }
      />

      <FullScreenEditorBody className="py-4">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Write a note..."
          className="min-h-40 w-full"
        />
      </FullScreenEditorBody>
    </FullScreenEditor>
  );
}
