import { GripVertical } from 'lucide-react';
import type { ComponentProps } from 'react';
import { Group, Panel, Separator as ResizeSeparator } from 'react-resizable-panels';

import { cn } from '../../lib/cn';

/**
 * Split panes, which is the one piece of furniture a hand-written stylesheet
 * cannot supply.
 *
 * The workbench needs the frame and the dock to share the width on terms the
 * reader sets, and the split has to survive a reload, which `autoSaveId` on the
 * group arranges. Keyboard resizing comes with the primitive.
 *
 * shadcn's wrapper is written against version 2 of this package, whose exports
 * were `PanelGroup` and `PanelResizeHandle`. Version 4 calls them `Group` and
 * `Separator`, so the names are mapped here rather than in every caller.
 */
export const ResizablePanel = Panel;

export function ResizablePanelGroup({ className, ...props }: ComponentProps<typeof Group>) {
  return (
    <Group
      className={cn('flex h-full w-full data-[direction=vertical]:flex-col', className)}
      {...props}
    />
  );
}

export function ResizableHandle({
  withHandle,
  className,
  ...props
}: ComponentProps<typeof ResizeSeparator> & { withHandle?: boolean }) {
  return (
    <ResizeSeparator
      className={cn(
        'relative flex w-px items-center justify-center bg-stroke',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent',
        'data-[state=dragging]:bg-accent hover:bg-stroke-strong',
        'data-[direction=vertical]:h-px data-[direction=vertical]:w-full',
        className,
      )}
      {...props}
    >
      {withHandle && (
        <span className="z-10 flex h-[1.5rem] w-[0.75rem] items-center justify-center rounded-s border border-stroke bg-surface">
          <GripVertical className="size-[0.625rem] text-on-canvas-muted" aria-hidden="true" />
        </span>
      )}
    </ResizeSeparator>
  );
}
