import { Fragment, type ReactNode, useCallback, useEffect, useState } from 'react';

import docsModule from 'virtual:docs';
import { Design } from './pages/Design';
import { Diagrams } from './pages/Diagrams';
import { Document } from './pages/Document';
import { Landing } from './pages/Landing';
import { Reference } from './pages/Reference';
import { Sources } from './pages/Sources';
import { ActivityBar } from './ui/ActivityBar';
import { Header } from './ui/Header';
import { Search } from './ui/Search';
import { ShowChrome } from './ui/ShowChrome';
import { Sidebar } from './ui/Sidebar';
import { SidePanel } from './ui/SidePanel';
import { StatusBar } from './ui/StatusBar';
import { Toc } from './ui/Toc';
import { useSections } from './ui/useSections';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from './ui/kit/resizable';
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
import { currentPath, useLinkInterception, useRoute } from './router';

/** The views answered with a component rather than with a repository document. */
const PAGES: Record<string, () => ReactNode> = {
  '/': Landing,
  '/design': Design,
  '/diagrams': Diagrams,
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

  const doc = docsModule.docs.find((d) => d.route === route);
  const Page = PAGES[route];
  const isApp = route === APP_VIEW;

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
   * The app view opens with both sidebars shut, and that is a product rule
   * rather than a preference. The address is handed to people who want to see
   * the app; a documentation tree and an inspector are not what they came for.
   * The rail stays, because it is the way back. Narrow, nothing opens by itself:
   * an overlay covering the page before it is asked for is a page nobody can
   * read.
   */
  const [explorerOpen, setExplorerOpen] = useState(
    () => currentPath() !== APP_VIEW && window.matchMedia(WIDE).matches,
  );

  /*
   * The chrome floated away, leaving the app and one button to bring it back.
   * It lives in the address because "look at this without my furniture" is worth
   * handing over, and because on a phone the chrome is most of the screen.
   */
  const full = isApp && workbench.state.full;

  /*
   * Whether the right sidebar is open is per-view state everywhere except on the
   * app, where it is in the URL under `tools`. That parameter predates this
   * shell and is the difference between the link `README.md` hands out and the
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
      // They are the same piece of screen when there is only one column.
      if (next && !window.matchMedia(WIDE).matches) setExplorerOpen(false);
    },
    [change, isApp],
  );

  const openExplorer = useCallback(
    (next: boolean) => {
      setExplorerOpen(next);
      if (next && !window.matchMedia(WIDE).matches) setToolsOpen(false);
    },
    [setToolsOpen],
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
      // The two sidebar shortcuts an editor has, on the keys it has them on.
      if (meta && key === 'b') {
        event.preventDefault();
        setExplorerOpen((open) => !open);
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

  const explorerPanel = (
    <SidePanel title="Explorer" side="left" onClose={() => openExplorer(false)}>
      <Sidebar route={route} />
    </SidePanel>
  );

  const toolsPanel = toolsTitle && (
    <SidePanel
      title={toolsTitle}
      side="right"
      scroll={contents !== null}
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

  const drawersOpen = !wide && !full && (explorerOpen || (toolsOpen && toolsTitle !== null));

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
            appearance={appearance}
            onAppearance={setAppearance}
            onSearch={() => setSearchOpen(true)}
            explorerOpen={explorerOpen}
            onToggleExplorer={() => openExplorer(!explorerOpen)}
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

          <ResizablePanelGroup className="min-w-0 flex-1">
            {/*
              Keyed, all three, because the first two come and go. Without keys
              React matches these children by position, so shutting the explorer
              made the main panel change places with a fragment, and React
              answered by throwing the panel away and building a new one. That
              took the iframe with it, and the app came back blank.
            */}
            {wide && !full && explorerOpen && (
              <Fragment key="explorer">
                <ResizablePanel defaultSize="18%" minSize="12%" maxSize="34%">
                  {explorerPanel}
                </ResizablePanel>
                <ResizableHandle />
              </Fragment>
            )}

            <ResizablePanel key="main" minSize="30%">
              {/*
                The one scroller. Every view is a block inside it, which is why
                none of them carries a `main` or a height of its own any more.
              */}
              <main id="content" className="h-full min-h-0 overflow-auto">
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
                ) : Page ? (
                  <Page />
                ) : doc ? (
                  <Document doc={doc} />
                ) : (
                  <NotFound route={route} />
                )}
              </main>
            </ResizablePanel>

            {wide && !full && toolsPanel && toolsOpen && (
              <Fragment key="tools">
                <ResizableHandle />
                {/* A list of headings needs a fifth of the width; the
                    inspector, which holds forms and a console, needs a third. */}
                <ResizablePanel defaultSize={contents ? '19%' : '31%'} minSize="14%" maxSize="55%">
                  {toolsPanel}
                </ResizablePanel>
              </Fragment>
            )}
          </ResizablePanelGroup>

          {/*
            Narrow, a sidebar is a drawer over the page rather than a column
            beside it. There is no width to divide at 390px: a twelve per cent
            panel is forty-seven pixels, and the page it left behind is not a
            page. The backdrop is a button because tapping beside a drawer to
            shut it is the gesture, and a div with an onClick is not reachable
            any other way.
          */}
          {drawersOpen && (
            <>
              <button
                type="button"
                aria-label="Close the sidebar"
                onClick={() => {
                  setExplorerOpen(false);
                  setToolsOpen(false);
                }}
                className="absolute inset-0 z-30 cursor-default bg-black/50"
              />
              {explorerOpen && (
                <div className="absolute inset-y-0 left-0 z-40 w-[min(20rem,85vw)] shadow-2xl">
                  {explorerPanel}
                </div>
              )}
              {toolsOpen && toolsPanel && (
                <div className="absolute inset-y-0 right-0 z-40 w-[min(26rem,92vw)] shadow-2xl">
                  {toolsPanel}
                </div>
              )}
            </>
          )}
        </div>

        {!full && (
          <StatusBar>
            {isApp ? (
              <>
                <Readout status={workbench.status} size={workbench.size} scale={workbench.scale} />
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
