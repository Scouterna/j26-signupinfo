import { useState, useCallback, useEffect, useRef } from "react";

/**
 * @returns {{ viewMode: "statistics"|"table", isFullscreen: boolean }}
 */
function parseHash(/** @type {string} */ hash) {
  if (hash === "#table-fullscreen") return { viewMode: "table", isFullscreen: true };
  if (hash === "#table") return { viewMode: "table", isFullscreen: false };
  return { viewMode: "statistics", isFullscreen: false };
}

/**
 * @param {{ viewMode: "statistics"|"table", isFullscreen: boolean }} state
 * @returns {string}
 */
function serializeHash({ viewMode, isFullscreen }) {
  if (viewMode === "table" && isFullscreen) return "#table-fullscreen";
  if (viewMode === "table") return "#table";
  return "#statistics";
}

/**
 * Syncs viewMode and isFullscreen to the URL hash using the History API.
 * Each state change pushes a new history entry so the browser back/forward
 * buttons navigate between view mode and fullscreen transitions.
 *
 * @returns {{
 *   viewMode: "statistics"|"table",
 *   isFullscreen: boolean,
 *   setViewMode: (mode: "statistics"|"table") => void,
 *   setIsFullscreen: (value: boolean) => void,
 * }}
 */
export default function useUrlHashState() {
  const [viewMode, setViewModeRaw] = useState(() => parseHash(window.location.hash).viewMode);
  const [isFullscreen, setIsFullscreenRaw] = useState(() => parseHash(window.location.hash).isFullscreen);

  // useRef holds current state so setState can compute the next value without
  // going through a state-updater function. This avoids React StrictMode's
  // double-invocation of updaters calling history.pushState twice.
  const stateRef = useRef(parseHash(window.location.hash));

  /** Switch view mode — adds a browser history entry. */
  const setViewMode = useCallback((/** @type {"statistics"|"table"} */ mode) => {
    const next = { ...stateRef.current, viewMode: mode, isFullscreen: false };
    stateRef.current = next;
    history.pushState(null, "", serializeHash(next));
    setViewModeRaw(mode);
    setIsFullscreenRaw(false);
  }, []);

  /** Toggle fullscreen — adds a browser history entry. */
  const setIsFullscreen = useCallback((/** @type {boolean} */ value) => {
    const next = { ...stateRef.current, isFullscreen: value };
    stateRef.current = next;
    history.pushState(null, "", serializeHash(next));
    setIsFullscreenRaw(value);
  }, []);

  useEffect(() => {
    const handler = () => {
      const parsed = parseHash(window.location.hash);
      stateRef.current = parsed;
      setViewModeRaw(parsed.viewMode);
      setIsFullscreenRaw(parsed.isFullscreen);
    };
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, []);

  return { viewMode, isFullscreen, setViewMode, setIsFullscreen };
}
