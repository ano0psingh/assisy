import { lazy, Suspense, type ComponentType } from 'react';
import { BrowserRouter, Navigate, Routes, Route, useLocation } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { Dashboard } from './pages/Dashboard';
import { Skeleton } from './components/common/Skeleton';
import { ErrorBoundary } from './components/common/ErrorBoundary';

/**
 * Dashboard is the landing route, so it stays in the main bundle — loading it
 * on demand would add a round trip to the most common entry point. Every other
 * route is split out, which keeps pages like Achievements and Feed off the
 * critical path for someone opening the app to tick one thing off.
 */
const namedRoute = <T extends Record<string, unknown>>(
  loader: () => Promise<T>,
  exportName: keyof T,
) => lazy(() => loader().then(module => ({ default: module[exportName] as ComponentType })));

const Plan = namedRoute(() => import('./pages/Plan'), 'Plan');
const Progress = namedRoute(() => import('./pages/Progress'), 'Progress');

const Tasks = namedRoute(() => import('./pages/Tasks'), 'Tasks');
const Calendar = namedRoute(() => import('./pages/Calendar'), 'Calendar');
const Feed = namedRoute(() => import('./pages/Feed'), 'Feed');

function LegacyGroupedRedirect({
  pathname,
  view,
}: {
  pathname: '/plan' | '/progress';
  view: string;
}) {
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  params.set('view', view);
  return <Navigate replace to={{ pathname, search: params.toString() }} />;
}

function PageFallback() {
  return (
    <div className="space-y-4 animate-fade-in" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading page</span>
      <Skeleton className="h-8 w-40 rounded-xl" />
      <Skeleton className="h-24 w-full rounded-2xl" />
      <Skeleton className="h-24 w-full rounded-2xl" />
      <Skeleton className="h-24 w-full rounded-2xl" />
    </div>
  );
}

/**
 * Keyed on the path so navigating away from a page that threw clears the error.
 * An error boundary holds its failed state until it is remounted, so without the
 * key a single bad page would keep showing the fallback everywhere.
 */
function RoutedPages() {
  const { pathname } = useLocation();
  return (
    <ErrorBoundary key={pathname} scope="This page">
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/tasks/inbox" element={<Tasks />} />

          <Route path="/plan" element={<Plan />} />
          <Route path="/progress" element={<Progress />} />

          <Route path="/goals" element={<LegacyGroupedRedirect pathname="/plan" view="goals" />} />
          <Route path="/habits" element={<LegacyGroupedRedirect pathname="/plan" view="habits" />} />
          <Route path="/projects" element={<LegacyGroupedRedirect pathname="/plan" view="projects" />} />
          <Route path="/achievements" element={<LegacyGroupedRedirect pathname="/progress" view="achievements" />} />
          <Route path="/stats" element={<LegacyGroupedRedirect pathname="/progress" view="stats" />} />
          <Route path="/review" element={<LegacyGroupedRedirect pathname="/progress" view="review" />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/feed" element={<Feed />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Layout>
        {/* Inside Layout so the header and nav survive a page-level failure and
            stay put while a route arrives. */}
        <RoutedPages />
      </Layout>
    </BrowserRouter>
  );
}

export default App;
