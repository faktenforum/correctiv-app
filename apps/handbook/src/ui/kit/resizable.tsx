import { GripVertical } from 'lucide-react';
import type { ComponentProps } from 'react';
import { Group, Panel, Separator as ResizeSeparator } from 'react-resizable-panels';

import { cn } from '../../lib/cn';

/**
 * Split panes, which is the one piece of furniture a hand-written stylesheet
 * cannot supply.
 *
 * The workbench needs the frame and the dock to share the width on terms the
 * reader sets, and keyboard resizing comes with the primitive.
 *
 * shadcn's wrapper is written against version 2 of this package, and version 4
 * moved a good deal: the exports are `Group` and `Separator` rather than
 * `PanelGroup` and `PanelResizeHandle`, and a group takes its orientation from
 * its own flex direction rather than from a `direction` prop. The names are
 * mapped here so no caller carries the difference.
 *
 * One rule of version 4 is worth knowing before writing a size: a NUMBER is
 * pixels and a STRING is a percentage. `defaultSize={38}` is thirty-eight
 * pixels, not thirty-eight percent, and it renders as a sliver rather than as an
 * error. Write `"38%"`.
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
