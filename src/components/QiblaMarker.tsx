import { getDirectionState } from "@/lib/compass";
import { getMarkerPosition } from "@/lib/marker";
import DirectionGuide, { type DirectionProps } from "@/components/DirectionGuide";

export default function QiblaMarker({ difference, notice, uncertain }: DirectionProps) {
  const marker = getMarkerPosition(!uncertain && getDirectionState(difference) === "aligned" ? 0 : difference);
  const currentDifference = marker ? difference : null;
  return <figure className="qibla-marker-guide" data-direction-state={uncertain ? "uncertain" : getDirectionState(currentDifference)} data-marker-edge={marker?.edge ?? "none"}>
    <div className="marker-stage" aria-hidden="true">
      <span className="marker-top-label">PANDUAN ARAH</span>
      <div className="marker-center-axis" />
      <div className="marker-track">
        {marker && !marker.edge && <svg className="marker-ray" viewBox="0 0 100 200" preserveAspectRatio="none">
          <line x1="50" y1="185" x2={marker.position * 100} y2="0" vectorEffect="non-scaling-stroke" />
        </svg>}
        {marker && <span className={`camera-qibla-target${marker.edge ? " marker-at-edge" : ""}`}
          style={{ left: `${marker.position * 100}%`, transform: "translate(-50%, -50%)" }}>
          {marker.edge === "left" && <span className="marker-edge-arrow">←</span>}
          <span className="marker-kaaba">🕋</span>
          {marker.edge === "right" && <span className="marker-edge-arrow">→</span>}
        </span>}
      </div>
      {marker?.edge && <span className="marker-outside-label">Kiblat di luar tampilan</span>}
      <div className="marker-phone-pointer">
        <svg viewBox="0 0 48 48" fill="none"><path d="m24 8 12 31-12-7-12 7L24 8Z" fill="currentColor" fillOpacity=".18" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /><path d="M24 9v23" stroke="currentColor" strokeWidth="1.4" /></svg>
      </div>
      <span className="marker-forward-label">TEPI ATAS LAYAR</span>
    </div>
    <DirectionGuide difference={currentDifference} notice={notice} uncertain={uncertain} />
    {marker?.edge && <span className="sr-only">Kiblat di luar tampilan, lanjutkan memutar ke {marker.edge === "left" ? "kiri" : "kanan"}.</span>}
  </figure>;
}
