"use client";
import { lazy, Suspense, useEffect, useState } from "react";
import QiblaMarker from "./QiblaMarker";
import type { DirectionProps } from "./DirectionGuide";
import { AR_FALLBACK_DIAGNOSTICS, type ARDiagnostics } from "@/lib/ar/arMath";

export type ARGuideProps = DirectionProps & {
  debugEnabled: boolean;
  onDiagnostics: (value: ARDiagnostics | null) => void;
};

function LoadFallback(props: ARGuideProps) {
  useEffect(() => { props.onDiagnostics(AR_FALLBACK_DIAGNOSTICS); }, [props.onDiagnostics]);
  return <QiblaMarker {...props} />;
}
// The Three.js chunk is requested only when a live camera stream mounts this guide.
const Scene = lazy(() => import("./QiblaARScene").catch(() => ({ default: LoadFallback })));

export default function QiblaCameraGuide(props: ARGuideProps) {
  const [ready, setReady] = useState(false);
  useEffect(() => { setReady(true); }, []);
  return ready ? <Suspense fallback={<QiblaMarker {...props} />}><Scene {...props} /></Suspense> : <QiblaMarker {...props} />;
}
