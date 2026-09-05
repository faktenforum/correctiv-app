import { Fragment, type ReactNode, useCallback, useEffect, useRef, useState } from 'react';

import docsModule from 'virtual:docs';
import { DIAGRAMS } from './diagrams';
import { Design } from './pages/Design';
import { DiagramIndex } from './pages/DiagramIndex';
import { DiagramView } from './pages/DiagramView';
import { Handbook } from './pages/Handbook';
import { Document } from './pages/Document';
import { Landing } from './pages/Landing';
import { Reference } from './pages/Reference';
import { Sources } from './pages/Sources';
import { ActivityBar } from './ui/ActivityBar';
import { Boundary } from './ui/Boundary';
import { Header } from './ui/Header';
import { Search } from './ui/Search';
import { Settings } from './ui/Settings';
import { ShowChrome } from './ui/ShowChrome';
import { SidePanel } from './ui/SidePanel';
import { StatusBar } from './ui/StatusBar';
import { Toc } from './ui/Toc';
import { useSections } from './ui/useSections';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
  useDragging,
  usePanelState,
  type PanelHandle,
} from './ui/kit/resizable';
import { Sheet, SheetContent, SheetTitle } from './ui/kit/sheet';
import { TooltipProvider } from './ui/kit/tooltip';
import { useWorkbench } from './workbench/Workbench';
import { Panels } from './workbench/ui/Panels';
import { Readout } from './workbench/ui/Readout';
import { Stage } from './workbench/ui/Stage';
import { LinkBar, Toolbar } from './workbench/ui/Toolbar';
import { cn } from './lib/cn';
import { useMedia, WIDE } from './lib/useMedia';
import { PAGE_TITLES } from './nav';
import { useAppearance } from './theme';
import { useLinkInterception, useRoute } from './router';

/** The views answered with a component rather than with a repository document. */
const PAGES: Record<string, () => ReactNode> = {
  '/': Landing,
  '/handbook': Handbook,
  '/design': Design,
  '/diagrams': DiagramIndex,
  '/reference': Reference,
  '/sources': Sources,
};

const APP_VIEW = '/workbench';

/**
 * One application, not a site with a tool bolted to the side of it.
 *
 * Everything is a view of the same shell: a record, the sources board, the
 * drawings, the core's reference and the app itself in its frame. The rail on
 * the far left reaches any of them from any of them, the left sidebar holds what
 * is in the current section, and the right sidebar holds whatever the open view
 * has to say about itself, the inspector for the app and the contents for a
 * document.
 *
 * The workbench used to be a route with chrome of its own, which made it a second
 * site rather than a view. Its parts are now in the places this shell keeps for
 * them: its controls in the context bar, its panels in the right sidebar, its
 * readout and its link in the status line.
 */
export function App() {
  const [route] = useRoute();
  const [appearance, setAppearance] = useAppearance();
  const [searchOpen, setSearchOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const doc = docsModule.docs.find((d) => d.route === route);
  const Page = PAGES[route];
  const isApp = route === APP_VIEW;
  /*
   * The one route with a segment under it. A `Record` of exact matches answers
   * everything else, and four drawings do not earn a router: they earn one
   * `startsWith` and a lookup in the list they are already in.
   */
  const diagram = route.startsWith('/diagrams/')
    ? DIAGRAMS.find((d) => d.id === route.slice('/diagrams/'.length))
    : undefined;

  const workbench = useWorkbench(isApp);
  useLinkInterception();

  /*
   * Two layouts, not one layout with different numbers. Wide, the sidebars are
   * panels in a resizable group and the app sits in what is left. Narrow, there
   * is no room to divide, so they are overlays over the one column and the app
   * has the column to itself.
   */
  const wide = useMedia(WIDE);

  /*
   * The chrome floated away, leaving the app and one button to bring it back.
   * It lives in the address because "look at this without my furniture" is worth
   * handing over, and because on a phone the chrome is most of the screen.
   */
  const full = isApp && workbench.state.full;

  /*
   * Whether the right sidebar is open is per-view state everywhere except on the
   * app, where it is in the URL under `tools`. That parameter predates this
   * shell and is the difference between the link `RELEASE.md` hands out and the
   * link somebody sends a colleague to show them a console error, so it keeps
   * its meaning: opening the sidebar changes the address, and the address opens
   * the sidebar.
   */
  const [docToolsOpen, setDocToolsOpen] = useState(false);
  const toolsOpen = isApp ? workbench.state.tools : docToolsOpen;
  const change = workbench.onChange;
  const setToolsOpen = useCallback(
    (next: boolean) => {
      if (isApp) change({ tools: next });
      else setDocToolsOpen(next);
    },
    [change, isApp],
  );

  /*
   * The right sidebar belongs to the open view. For the app it is the inspector,
   * for a record it is the contents, and for the rest there is nothing worth a
   * surface, so the control that opens it is absent rather than opening an empty
   * box. The title is what decides that, and it is a string rather than the
   * panel itself so the shortcut below does not re-bind on every render.
   */
  const rendered = useSections(route, !isApp && !doc && Page !== undefined);
  const headings = doc ? doc.headings : rendered;
  const contents = !isApp && countSections(headings) > 1 ? headings : null;
  const toolsTitle = isApp ? 'Tools' : contents ? 'On this page' : null;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const meta = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();
      if (meta && key === 'k') {
        event.preventDefault();
        setSearchOpen((open) => !open);
      }
      if (meta && key === 'j' && toolsTitle) {
        event.preventDefault();
        setToolsOpen(!toolsOpen);
      }
      // The way out of a view whose only control is one floating button. The
      // palette owns Escape while it is open, and it is a dialog, so it gets it.
      if (event.key === 'Escape' && full && !searchOpen) {
        event.preventDefault();
        change({ full: false });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [change, full, searchOpen, setToolsOpen, toolsOpen, toolsTitle]);

  useEffect(() => {
    const named = PAGE_TITLES[route];
    document.title =
      route === '/' ? 'CORRECTIV app handbook' : `${named ?? doc?.title ?? 'Not found'} — Handbook`;
  }, [doc, route]);

  /** One column, so a sidebar is a drawer over the page rather than beside it. */
  const narrow = !wide && !full;

  /*
   * Docked, a sidebar collapses to nothing rather than being unmounted, so its
   * width has a value to animate from. Unmounting is instant by construction:
   * there is no width to transition out of when the element is gone.
   *
   * `useDragging` turns the transition off while a handle is held, or every
   * frame of the drag would be chasing a 200ms animation and the panel would
   * trail the pointer.
   *
   * Both panels and both handles are mounted for as long as this layout is,
   * whatever the open view puts in them. They used to come and go with the
   * route, and `react-resizable-panels` re-registers its children when the list
   * changes: an imperative `resize()` landing in that gap threw "Panel
   * constraints not found", which took the whole page with it. A hidden handle
   * beside a collapsed panel costs nothing; a moving child list costs the site.
   */
  const toolsPanelRef = useRef<PanelHandle>(null);
  const dragging = useDragging();

  /*
   * The width to come back to. `expand()` restores "its most recent size", and
   * for a panel that has only ever been collapsed that turned out to be the
   * minimum: the inspector opened at fourteen per cent, a third of what it asks
   * for, with its own contents clipped. So the size is stated on the way in, and
   * a width somebody dragged to is what gets stated next time.
   */
  const toolsWidth = useRef<string | null>(null);
  const toolsDefault = contents ? '19%' : '31%';

  usePanelState(
    toolsPanelRef,
    toolsOpen && toolsTitle !== null,
    () => toolsWidth.current ?? toolsDefault,
    wide && !full,
  );

  /*
   * The app's frame controls, and the two places they can stand.
   *
   * Wide, they are the header's context bar, which is where an editor puts what
   * belongs to the open file. At 390px that same row wrapped into four, most of
   * the screen, above an app that had none left: so narrow, they go to the top of
   * the tools drawer, which is full height and opens only when asked.
   */
  const toolbar = isApp ? (
    <Toolbar
      state={workbench.state}
      status={workbench.status}
      routeField={workbench.routeField}
      onRouteField={workbench.setRouteField}
      onChange={workbench.onChange}
      onReload={workbench.onReload}
      onRaw={workbench.onRaw}
    />
  ) : null;

  const toolsPanel = toolsTitle && (
    <SidePanel
      title={toolsTitle}
      side="right"
      scroll={contents !== null}
      titleAs={narrow ? SheetTitle : undefined}
      onClose={() => setToolsOpen(false)}
    >
      {contents ? (
        <Toc headings={contents} />
      ) : (
        <div className="flex h-full min-h-0 flex-col">
          {!wide && toolbar && (
            <div className="shrink-0 border-b border-stroke p-xs">{toolbar}</div>
          )}
          <div className="min-h-0 flex-1">
            <Panels
              state={workbench.state}
              status={workbench.status}
              logs={workbench.logs}
              tools={workbench.tools}
              onChange={workbench.onChange}
              onClearLogs={workbench.clearLogs}
            />
          </div>
        </div>
      )}
    </SidePanel>
  );

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-dvh flex-col bg-canvas text-on-canvas">
        <a
          href="#content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-s focus:top-s focus:z-50 focus:rounded-md focus:bg-accent focus:px-s focus:py-xs focus:text-white"
        >
          Skip to content
        </a>

        {!full && (
          <Header
            onSearch={() => setSearchOpen(true)}
            onSettings={() => setSettingsOpen(true)}
            toolsOpen={toolsOpen}
            onToggleTools={toolsTitle ? () => setToolsOpen(!toolsOpen) : undefined}
            toolsLabel={toolsTitle ?? undefined}
            onFull={isApp ? () => change({ full: true }) : undefined}
          >
            {wide && toolbar}
          </Header>
        )}

        <div className="relative flex min-h-0 flex-1">
          {!full && <ActivityBar route={route} />}

          <ResizablePanelGroup className={cn('min-w-0 flex-1', !dragging && 'panels-animate')}>
            {/*
              Keyed, both of them, because the right-hand one comes and goes.
              Without keys React matches these children by position, so a panel
              appearing changed places with a fragment and React answered by
              throwing the panel away and building a new one. That took the
              iframe with it, and the app came back blank.
            */}
            <ResizablePanel key="main" minSize="30%">
              {/*
                The one scroller. Every view is a block inside it, which is why
                none of them carries a `main` or a height of its own any more.
              */}
              <main id="content" className="h-full min-h-0 overflow-auto">
                <Boundary route={route}>
                  {isApp ? (
                    <Stage
                      state={workbench.state}
                      size={workbench.size}
                      scale={workbench.scale}
                      stageRef={workbench.stageRef}
                      frameRef={workbench.frameRef}
                      onResize={workbench.onResize}
                      onLoad={workbench.onLoad}
                    />
                  ) : diagram ? (
                    <DiagramView meta={diagram} />
                  ) : Page ? (
                    <Page />
                  ) : doc ? (
                    <Document doc={doc} />
                  ) : (
                    <NotFound route={route} />
                  )}
                </Boundary>
              </main>
            </ResizablePanel>

            {wide && !full && (
              <Fragment key="tools">
                <ResizableHandle className={cn(!toolsOpen && 'hidden')} />
                {/* A list of headings needs a fifth of the width; the
                    inspector, which holds forms and a console, needs a third. */}
                <ResizablePanel
                  panelRef={toolsPanelRef}
                  collapsible
                  collapsedSize="0%"
                  defaultSize={toolsDefault}
                  minSize="14%"
                  maxSize="55%"
                  /* Only while a handle is held. Otherwise this fires on the layout
                     the collapse itself causes and writes the old state straight
                     back, which is a toggle that does nothing: the button flipped,
                     `onResize` flipped it back, and the effect never saw a change. */
                  onResize={(size) => {
                    if (!dragging) return;
                    if (size.asPercentage > 0) toolsWidth.current = `${size.asPercentage}%`;
                    setToolsOpen(size.asPercentage > 0);
                  }}
                >
                  <div className="h-full w-full overflow-hidden [contain:paint]">
                    <div className="h-full w-full min-w-[15rem]" inert={!toolsOpen}>
                      {toolsPanel}
                    </div>
                  </div>
                </ResizablePanel>
              </Fragment>
            )}
          </ResizablePanelGroup>

          {/*
            Narrow, the tools are a drawer over the page rather than a column
            beside it. There is no width to divide at 390px: a fourteen per cent
            panel is fifty-five pixels, and the page it left behind is not a
            page.

            A `Sheet`, which is a Radix dialog, rather than a positioned div: it
            traps focus, closes on Escape and on a tap outside, hides the page
            behind it from a screen reader, and slides in from the edge it is
            docked to.
          */}
          {narrow && toolsPanel && (
            <Sheet open={toolsOpen} onOpenChange={setToolsOpen}>
              <SheetContent side="right" className="w-[min(26rem,92vw)]">
                {toolsPanel}
              </SheetContent>
            </Sheet>
          )}
        </div>

        {!full && (
          <StatusBar>
            {isApp ? (
              <>
                {/*
                  Clipped, not wrapped. The line is one row tall by definition,
                  and a readout that ran past the end used to widen the page
                  itself: 120px of sideways scroll on a 1440px window, from a
                  status bar.
                */}
                <span className="flex min-w-0 items-center gap-s overflow-hidden">
                  <Readout
                    status={workbench.status}
                    size={workbench.size}
                    scale={workbench.scale}
                  />
                </span>
                <span className="min-w-0 flex-1" />
                <LinkBar state={workbench.state} />
              </>
            ) : (
              /* The path of the file being rendered, in the typeface a path is
                 written in. A page that is not a document has no file, so it says
                 what it is instead. */
              <span className={cn('truncate', doc && 'font-mono')}>
                {doc ? doc.file : (PAGE_TITLES[route] ?? route)}
              </span>
            )}
          </StatusBar>
        )}
      </div>

      {full && <ShowChrome onShow={() => change({ full: false })} />}

      <Search open={searchOpen} onClose={() => setSearchOpen(false)} />

      <Settings
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        appearance={appearance}
        onAppearance={setAppearance}
      />
    </TooltipProvider>
  );
}

/** h2 and h3 only, the same two depths `Toc` lists. Fewer than two is no map. */
function countSections(headings: { depth: number }[]): number {
  return headings.filter((h) => h.depth === 2 || h.depth === 3).length;
}

function NotFound({ route }: { route: string }) {
  return (
    <div className="mx-auto max-w-content px-m py-2xl">
      <h1 className="text-headline-l font-semibold">No page at {route}</h1>
      <p className="mt-s text-on-canvas-muted">
        The handbook publishes the repository&apos;s own documents. This address matches none of
        them. Press <kbd className="font-mono">⌘K</kbd> to search.
      </p>
    </div>
  );
}
