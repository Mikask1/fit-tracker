'use client';

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';

interface ConfirmDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive';
  /** Render as a nested drawer (when opened from inside another drawer). */
  nested?: boolean;
}

/** A generic "Are you sure?" confirmation presented as a bottom drawer. */
export function ConfirmDrawer({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  nested = false,
}: ConfirmDrawerProps) {
  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange} nested={nested}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader>
          <DrawerTitle>{title}</DrawerTitle>
          <DrawerDescription>{description}</DrawerDescription>
        </DrawerHeader>

        <DrawerFooter>
          <Button
            variant={variant}
            onClick={handleConfirm}
            className="min-h-11"
          >
            {confirmText}
          </Button>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="min-h-11"
          >
            {cancelText}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
