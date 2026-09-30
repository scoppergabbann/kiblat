"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type LocationErrorStatus = "permission-denied" | "unavailable" | "timeout" | "error";
export type LocationState =
  | { status: "idle" | "requesting" }
  | { status: "success"; latitude: number; longitude: number; accuracy: number }
  | { status: LocationErrorStatus; message: string };

export function useGeolocation() {
  const [state, setState] = useState<LocationState>({ status: "idle" });
  const requestId = useRef(0);
  const pending = useRef(false);
  const cancelLocation = useCallback(() => {
    requestId.current++;
    pending.current = false;
    setState({ status: "idle" });
  }, []);

  useEffect(() => {
    const cancel = () => {
      if (!pending.current) return;
      requestId.current++;
      pending.current = false;
      setState({ status: "error", message: "Pencarian lokasi dihentikan saat halaman ditinggalkan. Ketuk Coba lagi untuk melanjutkan." });
    };
    const visibility = () => { if (document.hidden) cancel(); };
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("pagehide", cancel);
    return () => {
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("pagehide", cancel);
      // Native getCurrentPosition cannot be aborted; ignore its late callbacks.
      requestId.current++;
      pending.current = false;
    };
  }, []);

  const requestLocation = useCallback(() => {
    if (pending.current) return;
    if (!window.isSecureContext) {
      setState({ status: "unavailable", message: "Buka situs melalui HTTPS agar lokasi dapat diakses." });
      return;
    }
    if (!navigator.geolocation) {
      setState({ status: "unavailable", message: "Browser ini tidak mendukung akses lokasi. Coba buka situs di Chrome atau Safari terbaru." });
      return;
    }

    const id = ++requestId.current;
    pending.current = true;
    setState({ status: "requesting" });
    const finish = (next: LocationState) => {
      if (id !== requestId.current) return;
      pending.current = false;
      setState(next);
    };
    try {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          const { latitude, longitude, accuracy } = coords;
          if (![latitude, longitude, accuracy].every(Number.isFinite) ||
              Math.abs(latitude) > 90 || Math.abs(longitude) > 180 || accuracy < 0) {
            finish({ status: "error", message: "Data lokasi tidak valid. Silakan coba lagi." });
            return;
          }
          finish({ status: "success", latitude, longitude, accuracy });
        },
        (error) => {
          switch (error.code) {
            case 1:
              finish({ status: "permission-denied", message: "Izinkan akses lokasi untuk situs ini melalui pengaturan browser, lalu coba lagi. Pastikan izin lokasi browser juga aktif di pengaturan ponsel." });
              break;
            case 2:
              finish({ status: "unavailable", message: "Posisi belum dapat ditentukan. Aktifkan layanan lokasi ponsel dan coba di tempat dengan sinyal yang lebih baik." });
              break;
            case 3:
              finish({ status: "timeout", message: "Lokasi belum diperoleh dalam batas waktu. Coba lagi di tempat dengan sinyal yang lebih baik." });
              break;
            default:
              finish({ status: "error", message: "Terjadi kesalahan saat mengambil lokasi. Silakan coba lagi." });
          }
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
      );
    } catch (error) {
      finish(error instanceof DOMException && error.name === "SecurityError"
        ? { status: "permission-denied", message: "Akses lokasi diblokir oleh browser. Periksa izin situs dan pengaturan lokasi ponsel, lalu coba lagi." }
        : { status: "error", message: "Terjadi kesalahan saat mengambil lokasi. Silakan coba lagi." });
    }
  }, []);

  return { state, requestLocation, cancelLocation };
}
