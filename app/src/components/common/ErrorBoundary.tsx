import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

/**
 * Last line of defence against a render error blanking the whole app.
 *
 * Without this, a single malformed record took the entire tree down — header and
 * navigation included — leaving no route to Settings and so no way to reach the
 * backup and restore tools. That is the worst possible moment to lose the
 * recovery path, so the fallback links straight to it.
 *
 * The offending data stays on the device untouched: this only stops React from
 * unmounting everything, it does not delete or rewrite anything.
 */
interface Props {
  children: ReactNode;
  /** Shown in the message so the user knows how much is affected. */
  scope?: string;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // No telemetry in this app, so the console is the only record.
    console.error('Unhandled render error', error, info.componentStack);
  }

  private reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const scope = this.props.scope;

    return (
      <div
        role="alert"
        className="m-4 p-6 rounded-2xl border text-left
          bg-white border-slate-200
          dark:bg-white/5 dark:border-white/10"
      >
        <h2 className="text-base font-semibold text-slate-800 dark:text-white">
          {scope ? `${scope} could not be displayed` : 'Something went wrong'}
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-gray-400">
          Your data is still saved on this device — nothing has been deleted. Reloading
          usually clears this. If it keeps happening, open the account menu in the header
          to export a backup or restore an earlier snapshot.
        </p>
        <p className="mt-3 font-mono text-xs break-words text-slate-500 dark:text-gray-500">
          {error.message}
        </p>
        <div className="flex flex-wrap items-center gap-2 mt-4">
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-xl text-sm font-medium text-white
              bg-violet-600 hover:bg-violet-500 transition-colors
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/60"
          >
            Reload
          </button>
          <button
            onClick={this.reset}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-colors
              text-slate-600 hover:bg-slate-100
              dark:text-gray-300 dark:hover:bg-white/10
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/60"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }
}
