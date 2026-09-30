"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export default function CameraView({ stream, onClose, onError }: {
  stream: MediaStream; onClose: () => void; onError: () => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const active = useRef(false);
  const [needsPlay, setNeedsPlay] = useState(false);
  useEffect(() => {
    const element = video.current;
    if (!element) return;
    let live = true;
    active.current = true;
    element.srcObject = stream;
    element.play().catch(error => {
      if (!live) return;
      if (error?.name === "NotAllowedError") setNeedsPlay(true);
      else onError();
    });
    return () => { live = false; active.current = false; element.pause(); element.srcObject = null; };
  }, [stream, onError]);

  return createPortal(<>
    <div className="camera-backdrop" aria-hidden="true">
      <video ref={video} autoPlay playsInline muted onError={onError} />
      <div className="camera-shade" />
    </div>
    <div className="camera-tools">
      <button type="button" onClick={onClose} aria-label="Tutup kamera">Tutup kamera ×</button>
      {needsPlay && <button type="button" onClick={() => {
        video.current?.play().then(() => { if (active.current) setNeedsPlay(false); })
          .catch(() => { if (active.current) onError(); });
      }}>Putar video kamera</button>}
    </div>
  </>, document.body);
}
