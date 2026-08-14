import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

/** How long the target keeps its highlight ring. Matches the CSS animation. */
const HIGHLIGHT_MS = 2000;
/** Give the destination page this long to render the target before giving up. */
const LOOKUP_TIMEOUT_MS = 2000;
const RETRY_INTERVAL_MS = 100;

/**
 * Scrolls to and briefly highlights the item named by the `?focus=<id>` search
 * param, which global search sets when it navigates.
 *
 * Search used to drop you at the top of the destination page, so after finding
 * a task you still had to locate it among hundreds.
 *
 * A page opts in by rendering `data-focus-id={item.id}` on each row wrapper.
 * The highlight class is applied to the DOM node directly, so no card component
 * needs to know about it.
 *
 * @param onFocusRequested Called with the target id before the lookup begins,
 *   so the page can clear filters that might be hiding the item. Must be
 *   referentially stable — wrap it in `useCallback`.
 */
export function useFocusHighlight(onFocusRequested?: (id: string) => void) {
  const [searchParams, setSearchParams] = useSearchParams();
  const handledIdRef = useRef<string | null>(null);
  const timerRef = useRef<number | undefined>(undefined);
  const unmountedRef = useRef(false);

  useEffect(() => () => {
    unmountedRef.current = true;
    window.clearTimeout(timerRef.current);
  }, []);

  useEffect(() => {
    const id = searchParams.get('focus');
    if (!id || handledIdRef.current === id) return;
    handledIdRef.current = id;

    onFocusRequested?.(id);

    const startedAt = Date.now();
    // The target may not be in the DOM yet: the page could still be loading, or
    // a filter cleared just above may not have re-rendered. Keep looking.
    const attempt = () => {
      if (unmountedRef.current) return;
      const el = document.querySelector<HTMLElement>(`[data-focus-id="${CSS.escape(id)}"]`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('focus-flash');
        timerRef.current = window.setTimeout(() => el.classList.remove('focus-flash'), HIGHLIGHT_MS);
        return;
      }
      if (Date.now() - startedAt < LOOKUP_TIMEOUT_MS) {
        timerRef.current = window.setTimeout(attempt, RETRY_INTERVAL_MS);
      }
    };
    timerRef.current = window.setTimeout(attempt, RETRY_INTERVAL_MS);

    // Drop the param, so a later re-render or a refresh does not scroll again.
    const next = new URLSearchParams(searchParams);
    next.delete('focus');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams, onFocusRequested]);
}
