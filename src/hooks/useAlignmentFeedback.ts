"use client";

import { useEffect, useRef } from "react";
import { getDirectionState } from "@/lib/compass";

/** One brief pulse per approach; a 5-degree exit band avoids boundary chatter. */
export function useAlignmentFeedback(difference: number | null) {
  const armed = useRef(true);
  const attempted = useRef(false);
  useEffect(() => {
    if (difference === null || !Number.isFinite(difference)) {
      armed.current = true;
      return;
    }
    if (Math.abs(difference) > 5) armed.current = true;
    if (getDirectionState(difference) !== "aligned" || !armed.current) return;
    armed.current = false;
    if (document.hidden || typeof navigator.vibrate !== "function" || navigator.userActivation?.hasBeenActive === false) return;
    try {
      attempted.current = true;
      navigator.vibrate(35);
    } catch { /* Optional feedback must never interrupt direction guidance. */ }
  }, [difference]);

  useEffect(() => {
    const cancel = () => {
      if (!attempted.current) return;
      attempted.current = false;
      try { navigator.vibrate?.(0); } catch { /* Unsupported or blocked. */ }
    };
    const visibility = () => { if (document.hidden) cancel(); };
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("pagehide", cancel);
    return () => {
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("pagehide", cancel);
      cancel();
    };
  }, []);
}
