"use client";

import { useEffect } from "react";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useCompass } from "@/hooks/useCompass";
import { useCamera } from "@/hooks/useCamera";
import CameraView from "@/components/CameraView";
import { calculateQiblaBearing } from "@/lib/qibla";
import CompassStatus from "@/components/CompassStatus";

const titles = {
  idle: "", requesting: "Mencari lokasi...", success: "Lokasi ditemukan",
  "permission-denied": "Izin lokasi ditolak", unavailable: "Lokasi tidak tersedia",
  timeout: "Waktu pencarian habis", error: "Lokasi belum ditemukan",
};

export default function LocationRequest() {
  const { state, requestLocation, cancelLocation } = useGeolocation();
  const camera = useCamera();
  const rearCameraActive = camera.stream?.getVideoTracks()[0]?.getSettings().facingMode === "environment";
  const compass = useCompass(rearCameraActive);
  const requesting = state.status === "requesting";
  const bearing = state.status === "success"
    ? calculateQiblaBearing(state.latitude, state.longitude) : null;
  const label = state.status === "idle" ? "Izinkan & Mulai"
    : requesting ? "Menyiapkan panduan..." : "Coba lagi";
  const stopCompass = compass.stop, stopCamera = camera.stop;
  useEffect(() => {
    // A failed/undefined location must not leave a hidden camera or sensor session running.
    if (state.status !== "idle" && state.status !== "requesting" &&
        (state.status !== "success" || bearing === null)) {
      stopCompass(); stopCamera();
    }
  }, [state.status, bearing, stopCompass, stopCamera]);
  const start = () => {
    // Keep all native permission requests in this original tap, before any await.
    // In particular Safari orientation permission needs transient user activation.
    void compass.start();
    void camera.start();
    requestLocation();
  };
  const cancel = () => { cancelLocation(); compass.stop(); camera.stop(); };
  const refresh = () => { compass.stop(); camera.stop(); start(); };

  return (
    <>
      {camera.stream && <CameraView stream={camera.stream} onClose={camera.stop} onError={camera.playbackError} />}
      {state.status !== "success" && (
        <>
          <p className="location-explanation">Lokasi dan sensor menentukan arah Kiblat. Kamera menjadi latar panduan Anda.</p>
          <p className="permission-privacy">Semua data diproses di perangkat Anda, tidak kami simpan atau kirim ke server. Kamera tidak direkam; mikrofon tidak diakses.</p>
          <p className="permission-browser-note">Cukup mulai sekali. Pilih Izinkan pada dialog yang muncul dari browser.</p>
          <button type="button" className="start-button" onClick={start}
            disabled={requesting} aria-busy={requesting} aria-controls="location-result">
            <span>{label}</span>
            {!requesting && <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>}
          </button>
          {requesting && <button type="button" className="update-location" onClick={cancel}>Batalkan persiapan</button>}
        </>
      )}
      <div id="location-result">
        {state.status !== "idle" && (
          <section className="location-result" data-state={state.status} aria-labelledby="location-title">
            <h2 id="location-title" className={state.status === "success" ? "sr-only" : undefined} role="status" aria-live="polite">{titles[state.status]}</h2>
            {requesting && <p role="status">Menyiapkan lokasi, sensor, dan kamera. Dialog izin dapat muncul terpisah; pencarian lokasi mungkin memerlukan beberapa saat.</p>}
            {"message" in state && <p role="status">{state.message}</p>}
            {state.status === "success" && (
              <>
                {(compass.status === "paused" || camera.status === "paused") && <button type="button" className="start-button" onClick={() => { void compass.start(); void camera.start(); }}>Lanjutkan panduan</button>}
                {bearing !== null ? <CompassStatus qiblaBearing={bearing} location={state} compass={compass} camera={camera} onRefreshLocation={refresh} /> : (
                  <>
                    <p>Arah Kiblat tidak dapat ditentukan secara unik pada koordinat ini.</p>
                    <details className="technical-info">
                      <summary>Informasi teknis</summary>
                      <dl className="location-coordinates">
                        <div><dt>Latitude</dt><dd>{state.latitude.toFixed(6)}</dd></div>
                        <div><dt>Longitude</dt><dd>{state.longitude.toFixed(6)}</dd></div>
                        <div><dt>Akurasi lokasi</dt><dd>±{Math.ceil(state.accuracy)} m</dd></div>
                      </dl>
                    </details>
                  </>
                )}
                {bearing === null && <button type="button" className="update-location" onClick={refresh}>Perbarui lokasi</button>}
              </>
            )}
          </section>
        )}
      </div>
    </>
  );
}
