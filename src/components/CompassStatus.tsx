"use client";
import { useCallback, useState } from "react";
import { getCompassNotice } from "@/lib/compassNotice";

import type { useCompass } from "@/hooks/useCompass";
import { calculateHeadingDifference } from "@/lib/compass";
import QiblaCompass from "@/components/QiblaCompass";
import QiblaCameraGuide from "@/components/QiblaCameraGuide";
import type { ARDiagnostics } from "@/lib/ar/arMath";
import type { useCamera } from "@/hooks/useCamera";
import { useAlignmentFeedback } from "@/hooks/useAlignmentFeedback";

const labels = {
  idle: "Sensor arah belum aktif", requesting: "Meminta izin sensor...",
  waiting: "Menunggu data kompas...", active: "Sensor arah aktif",
  denied: "Izin sensor ditolak", unsupported: "Kompas tidak didukung",
  unavailable: "Data kompas tidak tersedia", unreliable: "Heading belum dapat digunakan",
  tilted: "Sesuaikan posisi ponsel", paused: "Sensor dijeda", error: "Sensor belum dapat diaktifkan",
};
const degrees = (value: number) => Math.round(value) % 360;
const permissionLabels = {
  unknown: "Belum diketahui", requesting: "Meminta izin", granted: "Diizinkan",
  denied: "Ditolak", "not-required": "Tanpa dialog izin sensor",
};
type Location = { latitude: number; longitude: number; accuracy: number };

export default function CompassStatus({ qiblaBearing, location, compass, camera, onRefreshLocation }: {
  qiblaBearing: number; location: Location;
  compass: ReturnType<typeof useCompass>; camera: ReturnType<typeof useCamera>;
  onRefreshLocation: () => void;
}) {
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [debugEnabled, setDebugEnabled] = useState(false);
  const [arDiagnostics, setARDiagnostics] = useState<ARDiagnostics | null>(null);
  const receiveDiagnostics = useCallback((value: ARDiagnostics | null) => setARDiagnostics(value), []);
  const sensorSetup = compass.status !== "active";
  const notice = getCompassNotice(compass.status);
  const cameraHeading = compass.reference === "rear-camera";
  const difference = compass.status !== "active" || compass.heading === null
    ? null : calculateHeadingDifference(qiblaBearing, compass.heading);
  useAlignmentFeedback(compass.unstable ? null : difference);
  const debugBearing = ((Math.round(qiblaBearing * 100) % 36000) / 100).toFixed(2);
  const sensorControl = <button type="button" className={`start-button compass-button${compass.isRunning ? " sensor-running" : ""}`}
    onClick={compass.isRunning ? compass.stop : compass.start}>
    {compass.isRunning ? compass.status === "requesting" ? "Batalkan izin sensor" : "Hentikan sensor" : compass.status === "idle" ? "Izinkan sensor arah" : "Coba sensor lagi"}
  </button>;
  const cameraControls = <div className="camera-controls" data-camera-state={camera.status}>
    <p className="permission-step">Latar kamera</p>
    <p className="sensor-help">Kamera menampilkan lingkungan sekitar sebagai latar panduan. Kompas tetap bisa digunakan tanpa kamera.</p>
    <button type="button" className="start-button camera-button" onClick={() => {
      if (camera.status === "requesting" || camera.stream) camera.stop();
      else void camera.start(camera.status === "no-rear-camera");
    }}>{camera.stream ? "Matikan kamera" : camera.status === "requesting" ? "Batalkan kamera" : camera.status === "no-rear-camera" ? "Gunakan kamera yang tersedia" : "Aktifkan latar kamera"}</button>
    <p className="sensor-help" role="status">{camera.message}</p>
    {camera.stream && <p className="sensor-help">Penanda mengikuti {cameraHeading ? "arah kamera belakang" : "tepi atas layar"} sebagai perkiraan. Penanda tidak melekat pada objek kamera.</p>}
  </div>;

  return (
    <section className="compass-panel" aria-labelledby="compass-title" data-compass-state={compass.status} data-direction-reference={compass.reference}>
      <div className="compass-heading sr-only">
        <h3 id="compass-title">Panduan Kiblat</h3>
        <span>{degrees(qiblaBearing)}° dari utara sejati</span>
      </div>
      {camera.stream ? <QiblaCameraGuide difference={difference} notice={notice} uncertain={compass.unstable} debugEnabled={optionsOpen && debugEnabled} onDiagnostics={receiveDiagnostics} /> : <QiblaCompass difference={difference} notice={notice} uncertain={compass.unstable} />}
      {!sensorSetup && !compass.unstable && <p className="guide-position" role="status">{cameraHeading ? "Tegak · arahkan kamera ke depan" : "Mendatar · arahkan tepi atas layar"}</p>}
      {sensorSetup && !compass.isRunning && <div className="guide-recovery">{sensorControl}</div>}
      {compass.status === "requesting" && <div className="guide-recovery">{sensorControl}</div>}
      {compass.unstable && <button type="button" className="update-location" onClick={() => setOptionsOpen(true)}>Buka bantuan kalibrasi</button>}
      <details className="guide-options" open={optionsOpen} onToggle={event => {
        if (event.target === event.currentTarget) setOptionsOpen(event.currentTarget.open);
      }}>
        <summary>Bantuan & pengaturan</summary>
        <div className="guide-options-content">
      <p className="sensor-message">{compass.error ?? labels[compass.status]}</p>
      {camera.stream && compass.source === "webkit" && <p className="sensor-help">Browser ini memakai kompas tepi atas layar. Gunakan posisi agak mendatar; mode kamera tegak belum tersedia.</p>}
      {compass.unstable && <p className="sensor-quality-warning">Jauhkan ponsel dari magnet atau logam, lalu tahan sejenak. Jika pembacaan masih berubah, ikuti panduan kalibrasi.</p>}
      <details className="calibration-help" open={compass.unstable || undefined}>
        <summary>Kalibrasi kompas</summary>
        <div>
          <p>Jauhkan ponsel dari benda bermagnet atau logam, speaker, kendaraan, dan perangkat elektronik lain.</p>
          <p>Gerakkan ponsel perlahan membentuk angka 8 untuk membantu kalibrasi. Lalu pegang agak mendatar dan tahan sejenak.</p>
          <p>Jika arah masih berubah saat ponsel diam, pindah tempat dan coba sensor lagi. Panduan ini tidak dapat memastikan sensor sudah terkalibrasi.</p>
        </div>
      </details>
      {(!sensorSetup || compass.isRunning) && compass.status !== "requesting" && sensorControl}
      {cameraControls}
      <button type="button" className="update-location" onClick={onRefreshLocation}>Perbarui lokasi</button>
      <p className="compass-caveat">Panduan masih perkiraan. Perbedaan utara magnetik dan sejati belum dikoreksi.
        {" "}Akurasi arah dapat dipengaruhi oleh sensor perangkat dan kondisi sekitar.
        {compass.accuracy !== null && <> Akurasi sensor: ±{Math.ceil(compass.accuracy)}°.</>}
      </p>
      <p className="compass-caveat">Jalur menunjukkan arah putaran, bukan rute perjalanan. Lokasi, sensor, dan video diproses di perangkat tanpa disimpan atau dikirim oleh Kiblat.</p>
      <details className="technical-info" onToggle={event => setDebugEnabled(event.currentTarget.open)}>
        <summary>Informasi teknis</summary>
        <dl className="location-coordinates compass-debug">
          <div><dt>Kiblat</dt><dd>{debugBearing}°</dd></div>
          <div><dt>Heading</dt><dd>{compass.heading === null ? "—" : degrees(compass.heading) + "°"}</dd></div>
          <div><dt>Heading mentah</dt><dd>{compass.rawHeading === null ? "—" : degrees(compass.rawHeading) + "°"}</dd></div>
          <div><dt>Pembacaan</dt><dd>{compass.unstable ? "Berubah bolak-balik" : compass.heading === null ? "Belum tersedia" : "Dihaluskan · bukan ukuran akurasi"}</dd></div>
          <div><dt>Selisih perkiraan</dt><dd>{difference === null ? "—" : (difference > 0 ? "+" : "") + difference.toFixed(1) + "°"}</dd></div>
          <div><dt>Akurasi sensor</dt><dd>{compass.accuracy === null ? "Tidak dilaporkan" : "±" + Math.ceil(compass.accuracy) + "°"}</dd></div>
          <div><dt>Sumber</dt><dd>{compass.source === "webkit" ? "Kompas WebKit" : compass.source === "absolute" ? "Orientasi absolut" : "—"}</dd></div>
          <div><dt>Acuan arah</dt><dd>{cameraHeading ? "Kamera belakang (−Z)" : "Tepi atas layar"}</dd></div>
          <div><dt>Izin sensor</dt><dd>{permissionLabels[compass.permissionState]}</dd></div>
          {camera.stream && <>
            <div><dt>Three.js</dt><dd>{arDiagnostics?.status === "active" ? "Aktif" : arDiagnostics?.status === "fallback" ? "Panduan sederhana" : "Memuat"}</dd></div>
            {arDiagnostics?.status === "active" && <>
              <div><dt>AR state terakhir</dt><dd>{arDiagnostics.state}</dd></div>
              <div><dt>Direction factor</dt><dd>{arDiagnostics.targetFactor.toFixed(3)}</dd></div>
              <div><dt>Rendered factor</dt><dd>{arDiagnostics.renderedFactor.toFixed(3)}</dd></div>
              <div><dt>Target X</dt><dd>{arDiagnostics.targetX.toFixed(3)}</dd></div>
              <div><dt>FPS terakhir</dt><dd>~{arDiagnostics.fps}</dd></div>
              <div><dt>Geometri / draw calls</dt><dd>{arDiagnostics.geometries} / {arDiagnostics.drawCalls}</dd></div>
              <div><dt>Render AR</dt><dd>Dijeda ketika di luar layar. Angka menunjukkan frame terakhir.</dd></div>
            </>}
          </>}
          <div><dt>Latitude</dt><dd>{location.latitude.toFixed(6)}</dd></div>
          <div><dt>Longitude</dt><dd>{location.longitude.toFixed(6)}</dd></div>
          <div><dt>Akurasi lokasi</dt><dd>±{Math.ceil(location.accuracy)} m</dd></div>
        </dl>
      </details>
        </div>
      </details>
    </section>
  );
}
