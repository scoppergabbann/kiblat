"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createHeadingFilter, type CompassSource, type OrientationSample } from "@/lib/compass";
import { readNavigationSample, type DirectionReference } from "@/lib/navigationHeading";

type Permission = "unknown" | "requesting" | "granted" | "denied" | "not-required";
type Status = "idle" | "requesting" | "waiting" | "active" | "denied" | "unsupported" |
  "unavailable" | "unreliable" | "tilted" | "paused" | "error";
type CompassState = {
  reference: DirectionReference;
  status: Status;
  permissionState: Permission;
  isSupported: boolean | null;
  isRunning: boolean;
  heading: number | null;
  rawHeading: number | null;
  unstable: boolean;
  accuracy: number | null;
  source: CompassSource | null;
  error: string | null;
};
type OrientationConstructor = typeof DeviceOrientationEvent & {
  requestPermission?: (absolute?: boolean) => Promise<"granted" | "denied">;
};

const emptyReading = { heading: null, rawHeading: null, unstable: false, accuracy: null, source: null };
const initial: CompassState = {
  reference: "screen-top",
  ...emptyReading, status: "idle", permissionState: "unknown",
  isSupported: null, isRunning: false, error: null,
};

function screenAngle(): number {
  const legacy = (window as Window & { orientation?: number }).orientation;
  return window.screen.orientation?.angle ?? (typeof legacy === "number" ? legacy : 0);
}

export function useCompass(rearCameraActive = false) {
  const [state, setState] = useState<CompassState>(initial);
  const cleanup = useRef<() => void>(() => {});
  const generation = useRef(0);
  const busy = useRef(false);
  const rearCamera = useRef(rearCameraActive);
  const resetReading = useRef<() => void>(() => {});
  useEffect(() => {
    if (rearCamera.current === rearCameraActive) return;
    rearCamera.current = rearCameraActive;
    resetReading.current();
  }, [rearCameraActive]);

  const teardown = useCallback(() => {
    generation.current += 1;
    cleanup.current();
    cleanup.current = () => {};
    resetReading.current = () => {};
    busy.current = false;
  }, []);

  const stop = useCallback(() => {
    teardown();
    setState(previous => ({ ...previous, ...emptyReading, status: "idle", isRunning: false, error: null }));
  }, [teardown]);

  useEffect(() => {
    setState(previous => ({ ...previous, isSupported: window.isSecureContext && typeof window.DeviceOrientationEvent !== "undefined" }));
    // Installed before permission requests too: a late grant must not reactivate
    // sensors after a hide/show or back/forward-cache round trip.
    const pause = () => {
      if (!busy.current) return;
      teardown();
      setState(previous => ({ ...previous, ...emptyReading, status: "paused", isRunning: false,
        permissionState: previous.permissionState === "requesting" ? "unknown" : previous.permissionState,
        error: "Sensor dijeda saat halaman ditinggalkan. Ketuk Coba sensor lagi untuk melanjutkan." }));
    };
    const visibility = () => { if (document.hidden) pause(); };
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("pagehide", pause);
    return () => {
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("pagehide", pause);
      teardown();
    };
  }, [teardown]);

  // Called directly by a button. Do not await location or any other work before
  // requestPermission: Safari requires the original user activation.
  const start = useCallback(async () => {
    if (busy.current) return;
    teardown();
    if (!window.isSecureContext || typeof window.DeviceOrientationEvent === "undefined") {
      setState({ ...initial, isSupported: false, status: "unsupported",
        error: "Sensor arah tidak tersedia. Buka melalui HTTPS di browser ponsel yang mendukung kompas." });
      return;
    }
    const id = generation.current;
    busy.current = true;
    const constructor = window.DeviceOrientationEvent as OrientationConstructor;
    let permission: Permission = "not-required";
    setState({ ...initial, isSupported: true, isRunning: true, status: "requesting", permissionState: "requesting" });
    try {
      if (typeof constructor.requestPermission === "function") {
        const answer = await constructor.requestPermission(true);
        if (id !== generation.current) return;
        if (answer !== "granted") {
          busy.current = false;
          setState({ ...initial, isSupported: true, status: "denied", permissionState: "denied",
            error: "Izin sensor arah ditolak. Periksa izin gerak dan orientasi situs di browser, lalu coba lagi." });
          return;
        }
        permission = "granted";
      }
      if (id !== generation.current) return;
      if (document.hidden) {
        busy.current = false;
        setState({ ...initial, isSupported: true, status: "paused", permissionState: permission,
          error: "Sensor dijeda. Aktifkan kembali saat halaman terlihat." });
        return;
      }

      let selected: CompassSource | null = null;
      let reference: DirectionReference = "screen-top";
      const filter = createHeadingFilter();
      let publishedAt = -Infinity;
      let publishedUnstable = false;
      let timer: ReturnType<typeof setTimeout>;
      const update = (values: Partial<CompassState>) => {
        if (id === generation.current) setState(previous => ({ ...previous, ...values }));
      };
      const armTimeout = (milliseconds: number) => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          if (id !== generation.current) return;
          teardown();
          setState(previous => ({ ...previous, ...emptyReading, status: "unavailable", isRunning: false,
            error: "Data kompas tidak diterima atau terhenti. Periksa izin sensor, lalu coba lagi." }));
        }, milliseconds);
      };
      resetReading.current = () => {
        filter.reset(); publishedAt = -Infinity; reference = "screen-top";
        update({ ...emptyReading, reference, status: "waiting", error: null });
        armTimeout(8000);
      };
      const onOrientation = (event: DeviceOrientationEvent) => {
        if (id !== generation.current) return;
        const sample = event as DeviceOrientationEvent & OrientationSample;
        const hasWebkit = sample.webkitCompassHeading !== undefined;
        // Avoid relative events or a second sensor stream overwriting a valid
        // north-referenced stream. A watchdog still clears stale readings.
        if (selected === "webkit" && !hasWebkit) return;
        if (selected === "absolute" && !hasWebkit && !sample.absolute) return;
        const navigation = readNavigationSample(sample, screenAngle(), rearCamera.current, reference);
        const result = navigation.reading;
        if (navigation.reference !== reference) {
          reference = navigation.reference;
          filter.reset(); publishedAt = -Infinity;
          // Clear the previous frame/confirmation before publishing another basis.
          update({ ...emptyReading, reference, status: "waiting", error: null });
          armTimeout(8000);
          return;
        }
        if (result.kind === "reading") {
          if (selected !== result.source) { filter.reset(); publishedAt = -Infinity; }
          selected = result.source;
          const now = performance.now();
          const filtered = filter.update(result.heading, now);
          armTimeout(5000);
          // Process valid samples, but avoid re-rendering the whole guide at
          // high hardware event rates. Quality changes still publish immediately.
          if (now - publishedAt < 1000 / 30 && filtered.unstable === publishedUnstable) return;
          publishedAt = now;
          publishedUnstable = filtered.unstable;
          update({ status: "active", reference, error: null, heading: filtered.heading, rawHeading: result.heading,
            unstable: filtered.unstable, accuracy: result.accuracy, source: result.source });
        } else {
          filter.reset();
          publishedAt = -Infinity;
          update({ ...emptyReading, reference, status: result.kind === "tilted" ? "tilted" : "unreliable",
            error: result.kind === "tilted"
              ? "Miringkan ponsel lebih mendatar, lalu arahkan tepi atas layar ke depan."
              : result.kind === "relative"
                ? "Browser hanya memberikan rotasi relatif. Heading kompas belum dapat ditentukan."
                : "Data kompas belum layak digunakan. Ubah posisi ponsel dan tunggu pembacaan yang lebih baik." });
        }
      };
      const onScreenChange = () => {
        filter.reset();
        publishedAt = -Infinity;
        update({ ...emptyReading, status: "waiting", error: null });
        armTimeout(8000);
      };
      window.addEventListener("deviceorientationabsolute", onOrientation);
      window.addEventListener("deviceorientation", onOrientation);
      window.screen.orientation?.addEventListener("change", onScreenChange);
      window.addEventListener("orientationchange", onScreenChange);
      cleanup.current = () => {
        clearTimeout(timer);
        window.removeEventListener("deviceorientationabsolute", onOrientation);
        window.removeEventListener("deviceorientation", onOrientation);
        window.screen.orientation?.removeEventListener("change", onScreenChange);
        window.removeEventListener("orientationchange", onScreenChange);
      };
      update({ status: "waiting", permissionState: permission });
      armTimeout(8000);
    } catch (error) {
      if (id !== generation.current) return;
      teardown();
      const denied = error instanceof DOMException && error.name === "NotAllowedError";
      setState({ ...initial, isSupported: true, status: denied ? "denied" : "error",
        permissionState: denied ? "denied" : "unknown",
        error: denied
          ? "Izin sensor arah tidak diberikan. Periksa pengaturan browser, lalu ketuk tombol untuk mencoba lagi."
          : "Sensor arah tidak dapat diaktifkan. Periksa pengaturan browser, lalu ketuk tombol untuk mencoba lagi." });
    }
  }, [teardown]);

  // Closing the camera must not show its last azimuth on the screen-top compass.
  const visibleState = !rearCameraActive && state.reference === "rear-camera"
    ? { ...state, ...emptyReading, reference: "screen-top" as const, status: state.isRunning ? "waiting" as const : state.status }
    : state;
  return { ...visibleState, start, stop };
}
