"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type CameraState = {
  status: "idle" | "requesting" | "active" | "error" | "no-rear-camera" | "paused";
  stream: MediaStream | null;
  message: string;
};
const initial: CameraState = { status: "idle", stream: null, message: "Kamera opsional. Video hanya ditampilkan di ponsel, tanpa direkam atau dikirim." };

export function useCamera() {
  const [state, setState] = useState<CameraState>(initial);
  const generation = useRef(0);
  const pending = useRef(false);
  const current = useRef<MediaStream | null>(null);
  const detach = useRef<() => void>(() => {});
  const release = useCallback(() => {
    generation.current++;
    pending.current = false;
    detach.current();
    detach.current = () => {};
    current.current?.getTracks().forEach(track => track.stop());
    current.current = null;
  }, []);
  const stop = useCallback(() => { release(); setState(initial); }, [release]);
  const playbackError = useCallback(() => {
    release();
    setState({ status: "error", stream: null, message: "Video kamera tidak dapat diputar. Coba aktifkan kamera lagi." });
  }, [release]);

  const start = useCallback(async (allowAny = false) => {
    if (pending.current || current.current) return;
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setState({ status: "error", stream: null, message: "Kamera tidak didukung di halaman ini. Gunakan browser terbaru melalui HTTPS." });
      return;
    }
    const request = ++generation.current;
    pending.current = true;
    setState({ status: "requesting", stream: null, message: "Izinkan kamera pada dialog browser. Mikrofon tidak diminta." });
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: {
        ...(allowAny ? {} : { facingMode: { ideal: "environment" } }),
        width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 24 },
      } });
      if (request !== generation.current || document.hidden) {
        stream.getTracks().forEach(track => track.stop());
        if (request === generation.current) {
          pending.current = false;
          setState({ status: "paused", stream: null, message: "Kamera dijeda. Ketuk untuk mengaktifkan kembali." });
        }
        return;
      }
      pending.current = false;
      const track = stream.getVideoTracks().find(item => item.readyState === "live");
      if (!track) { stream.getTracks().forEach(item => item.stop()); throw new DOMException("No video", "NotFoundError"); }
      const facing = track.getSettings().facingMode;
      if (!allowAny && facing === "user") {
        stream.getTracks().forEach(item => item.stop());
        setState({ status: "no-rear-camera", stream: null, message: "Kamera belakang tidak tersedia. Anda dapat memilih kamera yang tersedia sebagai latar." });
        return;
      }
      current.current = stream;
      const ended = () => {
        release();
        setState({ status: "error", stream: null, message: "Kamera terputus. Tutup aplikasi lain yang memakai kamera, lalu coba lagi." });
      };
      track.addEventListener("ended", ended);
      detach.current = () => track.removeEventListener("ended", ended);
      setState({ status: "active", stream, message: facing === "environment" ? "Kamera belakang aktif · tanpa rekaman" : facing === "user" ? "Kamera depan aktif sebagai latar · tanpa rekaman" : "Kamera aktif. Browser tidak melaporkan arah kamera; periksa tampilan lingkungan." });
    } catch (error) {
      if (request !== generation.current) return;
      pending.current = false;
      const name = error instanceof DOMException ? error.name : "";
      const message = name === "NotAllowedError" || name === "SecurityError"
        ? "Izin kamera ditolak. Izinkan kamera lewat pengaturan situs, lalu coba lagi."
        : name === "NotFoundError" ? "Tidak ada kamera yang tersedia di perangkat ini. Kompas tetap dapat digunakan."
        : name === "NotReadableError" || name === "AbortError" ? "Kamera sedang digunakan atau tidak dapat dibuka. Tutup aplikasi kamera lain lalu coba lagi."
        : name === "OverconstrainedError" ? "Kamera dengan pengaturan ini tidak tersedia. Coba kamera yang tersedia."
        : "Kamera belum dapat diaktifkan. Coba lagi melalui browser perangkat Anda.";
      setState({ status: name === "OverconstrainedError" ? "no-rear-camera" : "error", stream: null, message });
    }
  }, [release]);

  useEffect(() => {
    const pause = () => {
      if (!pending.current && !current.current) return;
      release();
      setState({ status: "paused", stream: null, message: "Kamera dijeda saat halaman ditinggalkan. Ketuk untuk mengaktifkan kembali." });
    };
    const visibility = () => { if (document.hidden) pause(); };
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("pagehide", pause);
    return () => {
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("pagehide", pause);
      release();
    };
  }, [release]);
  return { ...state, start, stop, playbackError };
}
