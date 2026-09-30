import { getDirectionState } from "@/lib/compass";
import DirectionGuide, { type DirectionProps } from "@/components/DirectionGuide";

export default function QiblaCompass({ difference, notice, uncertain }: DirectionProps) {
  const state = uncertain ? "uncertain" : getDirectionState(difference);
  const available = state !== "unavailable" && difference !== null;
  const visualDifference = state === "aligned" ? 0 : difference ?? 0;

  return (
    <figure className="qibla-compass" data-direction-state={state}>
      <div className="compass-dial" aria-hidden="true">
        <span className="phone-forward-label">DEPAN PONSEL</span>
        <div className="dial-inner-ring" />
        <div className="dial-axis" />
        <span className="dial-tick dial-tick-left" />
        <span className="dial-tick dial-tick-right" />
        <span className="dial-tick dial-tick-bottom" />
        {available && (
          <div className="qibla-orbit" style={{ transform: `rotate(${visualDifference}deg)` }}>
            <span className="direction-ray" />
            <span className="qibla-target" style={{ transform: `translate(-50%, -50%) rotate(${-visualDifference}deg)` }}>🕋</span>
          </div>
        )}
        <div className="phone-pointer">
          <svg viewBox="0 0 48 48" fill="none">
            <path d="m24 8 12 31-12-7-12 7L24 8Z" fill="currentColor" fillOpacity=".18" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
            <path d="M24 9v23" stroke="currentColor" strokeWidth="1.4" />
          </svg>
        </div>
      </div>
      <DirectionGuide difference={difference} notice={notice} uncertain={uncertain} />
    </figure>
  );
}
