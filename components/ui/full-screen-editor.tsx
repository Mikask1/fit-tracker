"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface FullScreenEditorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
  /**
   * Defaults to preventing Radix's autofocus so form editors don't pop the
   * keyboard on open. Pass a handler that calls `e.preventDefault()` then
   * focuses a field to bring the keyboard up immediately (e.g. the note editor).
   */
  onOpenAutoFocus?: (e: Event) => void
  /**
   * Set to true when the header renders a description. When false, the content
   * gets `aria-describedby={undefined}` to silence Radix's missing-description
   * warning.
   */
  hasDescription?: boolean
  className?: string
}

/**
 * A full-screen, top-anchored editor built on Radix Dialog. Unlike a bottom
 * drawer, every control lives at the top, so the iOS Safari keyboard (which
 * only shrinks the visual viewport) can never cover the action bar — no
 * visualViewport math required.
 */
function FullScreenEditor({
  open,
  onOpenChange,
  children,
  onOpenAutoFocus,
  hasDescription = false,
  className,
}: FullScreenEditorProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        {/* No overlay: the opaque, full-screen content covers everything.
            The modal Root still applies the react-remove-scroll body lock and
            Escape / outside-dismiss handling. */}
        <DialogPrimitive.Content
          data-slot="full-screen-editor"
          onOpenAutoFocus={onOpenAutoFocus ?? ((e) => e.preventDefault())}
          onCloseAutoFocus={(e) => e.preventDefault()}
          {...(hasDescription ? {} : { "aria-describedby": undefined })}
          className={cn(
            "bg-background fixed inset-0 z-50 flex flex-col outline-none",
            "duration-300 ease-out",
            "data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom",
            "data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom",
            className
          )}
        >
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

interface FullScreenEditorHeaderProps {
  title: string
  description?: string
  onCancel: () => void
  cancelLabel?: string
  /** Primary action (e.g. a Save button), rendered top-right. */
  action?: React.ReactNode
}

function FullScreenEditorHeader({
  title,
  description,
  onCancel,
  cancelLabel = "Cancel",
  action,
}: FullScreenEditorHeaderProps) {
  return (
    <div className="bg-background pt-safe border-b">
      <div className="grid min-h-14 grid-cols-[1fr_auto_1fr] items-center gap-2 px-2">
        <Button
          variant="ghost"
          onClick={onCancel}
          className="min-h-11 justify-self-start"
        >
          {cancelLabel}
        </Button>
        <DialogPrimitive.Title className="text-foreground justify-self-center truncate text-center font-semibold">
          {title}
        </DialogPrimitive.Title>
        <div className="justify-self-end">{action}</div>
      </div>
      {description ? (
        <DialogPrimitive.Description className="text-muted-foreground px-4 pb-3 text-sm">
          {description}
        </DialogPrimitive.Description>
      ) : null}
    </div>
  )
}

function FullScreenEditorBody({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="full-screen-editor-body"
      className={cn(
        "min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(env(safe-area-inset-bottom),1rem)]",
        className
      )}
      {...props}
    />
  )
}

export { FullScreenEditor, FullScreenEditorHeader, FullScreenEditorBody }
