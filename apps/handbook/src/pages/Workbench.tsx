import { useEffect, useRef } from 'react';

import { Slot } from '../shell/slots';
import { writeAddress, type ShellProps } from '../shell/address';
import { VIEWS, type SectionId } from '../shell/views';
import { defaultFull } from '../workbench/devices';
import { toAddress } from '../workbench/state';
import { namesFrame } from '../workbench/store';
import { useWorkbench } from '../workbench/Workbench';
import {
  Appearance,
  AppearanceTags,
  BuildLine,
  Console,
  ConsoleTags,
  Counts,
  Inspect,
  InspectTags,
  Measure,
  MeasureTags,
  State,
  StateTags,
  Tokens,
  TokensTags,
} from '../workbench/ui/Panels';
import { Readout } from '../workbench/ui/Readout';
import { Stage } from '../workbench/ui/Stage';
import { LinkBar, Toolbar } from '../workbench/ui/Toolbar';

const VIEW = VIEWS.workbench;

/**
 * The app itself, at device size, as a view of the shell rather than a shell of
 * its own.
 *
 * This is the route that used to be seven `isApp` branches in `App.tsx`. Its
 * body is the stage; everything else it has — the frame controls, the counts,
 * the six inspector sections, the readout and the link — goes into the places
 * the declaration in `shell/views.ts` keeps for it.
 *
 * **The two halves of the address meet here and nowhere else.** The shell owns
 * `tools`, `open` and `full`; the frame owns `d`, `o`, `z`, `w`, `h`, `t`, `s`,
 * `check`, `kl` and `kd`, which travel in `rest` untouched. `workbench/store.ts`
 * no longer writes history at all, so a link written before any of this still
 * resolves and writes back byte for byte.
 */
export function Workbench({ address, onAddress, wide, full }: ShellProps) {
  const workbench = useWorkbench();
  const { state } = workbench;

  /*
   * The frame's state, back into the address.
   *
   * One direction only, and the other is `workbench/store.ts`'s own `hashchange`
   * listener — which only a person editing the address bar or a step through
   * history can reach, because `shell/address.ts` writes with `replaceState` and
   * that fires no event. So there is no loop to guard against: a control moves
   * the state, the state writes the hash, and the hash stays quiet.
   */
  useEffect(() => {
    const { head, rest } = toAddress(state);
    onAddress({ head, rest });
  }, [state, onAddress]);

  /*
   * And the chrome out of the way on a small screen, once, on arrival.
   *
   * The same line as the device default (`HOST_BELOW`, 1024, which is also the
   * shell's `WIDE`): below it the header, the rail, a sidebar and a status line
   * are most of the screen, and the app is what somebody opened this address
   * for. A link that named a device or `full` has said what it wants and is not
   * second-guessed.
   */
  const asked = useRef(namesFrame(window.location.hash));
  useEffect(() => {
    if (!asked.current && defaultFull()) onAddress({ full: true });
    // Arrival only. Resizing the window later is not a request to hide anything.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reveal = (section: SectionId) => onAddress({ open: new Set([...address.open, section]) });

  const panels = {
    state,
    status: workbench.status,
    logs: workbench.logs,
    tools: workbench.tools,
    onChange: workbench.onChange,
    onClearLogs: workbench.clearLogs,
  };

  return (
    <>
      <Stage
        state={state}
        size={workbench.size}
        scale={workbench.scale}
        stageRef={workbench.stageRef}
        frameRef={workbench.frameRef}
        onResize={workbench.onResize}
        onLoad={workbench.onLoad}
        hint={!address.tools && !full && wide}
      />

      <Slot id="context-bar">
        <Toolbar
          state={state}
          status={workbench.status}
          routeField={workbench.routeField}
          onRouteField={workbench.setRouteField}
          onChange={workbench.onChange}
          onReload={workbench.onReload}
          onRaw={workbench.onRaw}
        />
      </Slot>

      <Slot id="panel-head">
        <Counts status={workbench.status} tools={workbench.tools} onReveal={reveal} />
        <BuildLine status={workbench.status} />
      </Slot>

      <Slot id="appearance:tags">
        <AppearanceTags {...panels} />
      </Slot>
      <Slot id="appearance">
        <Appearance {...panels} />
      </Slot>

      <Slot id="state:tags">
        <StateTags {...panels} />
      </Slot>
      <Slot id="state">
        <State {...panels} />
      </Slot>

      <Slot id="console:tags">
        <ConsoleTags {...panels} />
      </Slot>
      <Slot id="console">
        <Console {...panels} />
      </Slot>

      <Slot id="tokens:tags">
        <TokensTags {...panels} />
      </Slot>
      <Slot id="tokens">
        <Tokens {...panels} />
      </Slot>

      <Slot id="measure:tags">
        <MeasureTags {...panels} />
      </Slot>
      <Slot id="measure">
        <Measure {...panels} />
      </Slot>

      <Slot id="inspect:tags">
        <InspectTags {...panels} />
      </Slot>
      <Slot id="inspect">
        <Inspect {...panels} />
      </Slot>

      <Slot id="status">
        {/*
          Clipped, not wrapped. The line is one row tall by definition, and a
          readout that ran past the end used to widen the page itself: 120px of
          sideways scroll on a 1440px window, from a status bar.
        */}
        <span className="flex min-w-0 items-center gap-s overflow-hidden">
          <Readout status={workbench.status} size={workbench.size} scale={workbench.scale} />
        </span>
        <span className="min-w-0 flex-1" />
        <LinkBar hash={writeAddress(address, VIEW)} />
      </Slot>
    </>
  );
}
