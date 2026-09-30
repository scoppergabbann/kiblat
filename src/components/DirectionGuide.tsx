import { getDirectionState } from "@/lib/compass";
import type { CompassNotice } from "@/lib/compassNotice";

export type DirectionProps = { difference: number | null; notice?: CompassNotice; uncertain?: boolean };

export default function DirectionGuide({ difference, notice, uncertain = false }: DirectionProps) {
  const state = uncertain ? "uncertain" : getDirectionState(difference);
  const available = state !== "unavailable" && difference !== null;
  const side = available && difference > 0 ? "kanan" : "kiri";
  const title = uncertain ? "Tahan ponsel sejenak" : state === "aligned" ? "Arah Kiblat"
    : state === "near" ? "Sedikit lagi"
    : state === "turn" ? `Putar ke ${side}` : notice?.title ?? "Sensor belum dapat dibaca";
  const description = uncertain ? "Arah masih berubah. Penanda adalah perkiraan; tunggu pembacaan lebih tenang." : state === "aligned" ? "Sejajar menurut sensor · toleransi ±3°"
    : available ? `${Math.abs(difference).toFixed(0)}° ke ${side}`
    : notice?.detail ?? "Periksa izin sensor dan posisi ponsel.";
  return <figcaption className="compass-caption">
    <h4 className="direction-text" role="status" aria-live="polite">
      {state === "aligned" && <span className="alignment-confirmation" aria-hidden="true">✓</span>}{title}
    </h4>
    <p className="direction-detail">{description}</p>
  </figcaption>;
}
