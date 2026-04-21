import { useState, useCallback, useEffect, useRef } from "react";

/**
 * @returns {{ viewMode: "statistics"|"table"|"people", isFullscreen: boolean }}
 */
function parseHash(/** @type {string} */ hash) {
  if (hash === "#table-fullscreen") return { viewMode: "table", isFullscreen: true };
  if (hash === "#table") return { viewMode: "table", isFullscreen: false };
  if (hash === "#people") return { viewMode: "people", isFullscreen: false };
  return { viewMode: "statistics", isFullscreen: false };
}

/**
 * @param {{ viewMode: "statistics"|"table"|"people", isFullscreen: boolean }} state
 * @returns {string}
 */
function serializeHash({ viewMode, isFullscreen }) {
  if (viewMode === "table" && isFullscreen) return "#table-fullscreen";
  if (viewMode === "table") return "#table";
  if (viewMode === "people") return "#people";
  return "#statistics";
}

// history.pushState doesn't fire popstate or hashchange, so separate instances
// of the hook wouldn't notice each other's updates. A custom event dispatched
// right after pushState lets every subscribed instance re-read the hash.
const SYNC_EVENT = "urlhashstate:change";

/**
 * Syncs viewMode and isFullscreen to the URL hash using the History API.
 * Each state change pushes a new history entry so the browser back/forward
 * buttons navigate between view mode and fullscreen transitions.
 *
 * Safe to call from multiple components — all instances stay in sync via the
 * SYNC_EVENT fired from the setters.
 *
 * @returns {{
 *   viewMode: "statistics"|"table"|"people",
 *   isFullscreen: boolean,
 *   setViewMode: (mode: "statistics"|"table"|"people") => void,
 *   setIsFullscreen: (value: boolean) => void,
 * }}
 */
export default function useUrlHashState() {
  // Parse once; both useState calls and the ref read from this same value.
  const stateRef = useRef(parseHash(window.location.hash));
  const [viewMode, setViewModeRaw] = useState(stateRef.current.viewMode);
  const [isFullscreen, setIsFullscreenRaw] = useState(stateRef.current.isFullscreen);

  /** Switch view mode — adds a browser history entry. */
  const setViewMode = useCallback((/** @type {"statistics"|"table"|"people"} */ mode) => {
    const next = { ...stateRef.current, viewMode: mode, isFullscreen: false };
    stateRef.current = next;
    history.pushState(null, "", serializeHash(next));
    setViewModeRaw(mode);
    setIsFullscreenRaw(false);
    window.dispatchEvent(new Event(SYNC_EVENT));
  }, []);

  /** Toggle fullscreen — adds a browser history entry. */
  const setIsFullscreen = useCallback((/** @type {boolean} */ value) => {
    const next = { ...stateRef.current, isFullscreen: value };
    stateRef.current = next;
    history.pushState(null, "", serializeHash(next));
    setIsFullscreenRaw(value);
    window.dispatchEvent(new Event(SYNC_EVENT));
  }, []);

  useEffect(() => {
    const handler = () => {
      const parsed = parseHash(window.location.hash);
      stateRef.current = parsed;
      setViewModeRaw(parsed.viewMode);
      setIsFullscreenRaw(parsed.isFullscreen);
    };
    window.addEventListener("popstate", handler);
    window.addEventListener(SYNC_EVENT, handler);
    return () => {
      window.removeEventListener("popstate", handler);
      window.removeEventListener(SYNC_EVENT, handler);
    };
  }, []);

  return { viewMode, isFullscreen, setViewMode, setIsFullscreen };
}
