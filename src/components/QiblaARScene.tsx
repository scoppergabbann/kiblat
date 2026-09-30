"use client";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import DirectionGuide from "./DirectionGuide";
import QiblaMarker from "./QiblaMarker";
import type { ARGuideProps } from "./QiblaCameraGuide";
import { getDirectionState } from "@/lib/compass";
import { AR_CONFIG as C, AR_FALLBACK_DIAGNOSTICS, dampDirection, directionFactorToTargetX, getARView, shouldResetVisualDirection, type ARDiagnostics } from "@/lib/ar/arMath";
import { createKaabaModel, disposeSceneObjects } from "@/lib/ar/createKaaba";
import { createQiblaRoad } from "@/lib/ar/createQiblaRoad";

export default function QiblaARScene(props: ARGuideProps) {
  const host = useRef<HTMLDivElement>(null);
  const live = useRef(props);
  const redraw = useRef<(() => void) | null>(null);
  const [failed, setFailed] = useState(false);
  const aligned = !props.uncertain && getDirectionState(props.difference) === "aligned";
  const view = getARView(props.difference, aligned);
  useEffect(() => {
    live.current = props;
    redraw.current?.();
  }, [props]);

  useEffect(() => {
    const container = host.current;
    if (!container) return;
    let renderer: THREE.WebGLRenderer | undefined;
    const scene = new THREE.Scene();
    const world = new THREE.Group();
    scene.add(world);
    let frame: number | null = null;
    let disposed = false, intersecting = true, pageActive = true;
    let resizeObserver: ResizeObserver | undefined;
    let intersectionObserver: IntersectionObserver | undefined;
    let removeListeners = () => {};
    const dispose = () => {
      if (disposed) return;
      disposed = true;
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null; redraw.current = null;
      resizeObserver?.disconnect(); intersectionObserver?.disconnect();
      removeListeners();
      disposeSceneObjects(scene);
      renderer?.renderLists.dispose();
      renderer?.dispose();
      renderer?.domElement.remove();
    };
    const fail = () => {
      dispose();
      live.current.onDiagnostics(AR_FALLBACK_DIAGNOSTICS);
      setFailed(true);
    };
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
      const gpu = renderer;
      gpu.setClearColor(0x000000, 0);
      gpu.setPixelRatio(Math.min(window.devicePixelRatio || 1, C.maxDpr));
      container.appendChild(gpu.domElement);
      const camera = new THREE.PerspectiveCamera(C.cameraFov, 1, 0.1, 60);
      camera.position.set(0, C.cameraHeight, C.cameraZ);
      camera.lookAt(0, C.cameraLookY, C.cameraLookZ);
      scene.add(new THREE.AmbientLight(0xffffff, 2));
      const light = new THREE.DirectionalLight(0xfff3db, 3);
      light.position.set(-3, 6, 4); scene.add(light);
      const kaaba = createKaabaModel();
      kaaba.scale.setScalar(C.kaabaScale);
      world.add(kaaba);
      const kaabaMaterials = new Set<THREE.Material>();
      kaaba.traverse(object => {
        if (object instanceof THREE.Mesh) {
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach(material => { material.transparent = true; kaabaMaterials.add(material); });
        }
      });
      const road = createQiblaRoad(); world.add(road.group);
      const ringMaterial = new THREE.MeshBasicMaterial({ color: 0xc3ca96, transparent: true, opacity: 0.65, side: THREE.DoubleSide, depthWrite: false });
      const ring = new THREE.Mesh(new THREE.RingGeometry(C.ringRadius - 0.035, C.ringRadius, 48), ringMaterial);
      ring.name = "DestinationRing"; ring.rotation.x = -Math.PI / 2; ring.renderOrder = 4;
      world.add(ring);
      const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
      let lastTime = 0, debugTime = 0, debugFrames = 0, phase = 0;
      let pulse: number = C.ringPulseSeconds;
      let rendered = 0, renderedEnd = 1, previousDifference: number | null = null, wasAligned = false;
      let previousFactor = Infinity, previousEnd = Infinity;
      let latestDiagnostics: ARDiagnostics | null = null;
      let debugWasEnabled = live.current.debugEnabled;
      function schedule() {
        if (!disposed && frame === null && !document.hidden && pageActive && intersecting) frame = requestAnimationFrame(draw);
      }
      function draw(now: number) {
        frame = null;
        if (disposed || document.hidden || !pageActive || !intersecting) return;
        try {
          const current = live.current;
          const isAligned = !current.uncertain && getDirectionState(current.difference) === "aligned";
          const next = getARView(current.difference, isAligned);
          const delta = lastTime ? Math.min((now - lastTime) / 1000, C.maxDeltaSeconds) : 0;
          lastTime = now;
          const reset = shouldResetVisualDirection(previousDifference, current.difference);
          rendered = reset || current.uncertain ? next.factor : dampDirection(rendered, next.factor, delta);
          renderedEnd = reset ? next.end : dampDirection(renderedEnd, next.end, delta);
          previousDifference = current.difference;
          world.visible = next.state !== "unavailable";
          const geometryChanged = Math.abs(rendered - previousFactor) >= C.geometryEpsilon ||
            Math.abs(renderedEnd - previousEnd) >= C.geometryEpsilon;
          const justSettled = (rendered === next.factor && previousFactor !== rendered) ||
            (renderedEnd === next.end && previousEnd !== renderedEnd);
          if (geometryChanged || justSettled) {
            road.update(rendered, renderedEnd);
            previousFactor = rendered; previousEnd = renderedEnd;
          }
          // Unstable readings remain visible but do not animate a false confirmation.
          if (!motion.matches && !current.uncertain) phase = (phase + delta * C.arrowSpeed) % 1;
          road.animateArrows(phase, renderedEnd);
          road.roadMaterial.opacity = current.uncertain ? C.roadOpacity * 0.7 : C.roadOpacity;
          const targetX = directionFactorToTargetX(rendered);
          kaaba.position.set(targetX, C.roadY, -C.roadLength);
          ring.position.set(targetX, C.roadY + 0.012, -C.roadLength);
          const opacity = next.destinationOpacity * (current.uncertain ? 0.65 : 1);
          kaaba.visible = opacity > 0; ring.visible = opacity > 0;
          kaabaMaterials.forEach(material => { material.opacity = opacity; });
          if (isAligned && !wasAligned) pulse = 0;
          if (!isAligned) pulse = C.ringPulseSeconds;
          wasAligned = isAligned;
          pulse = Math.min(C.ringPulseSeconds, pulse + delta);
          ring.scale.setScalar(1 + (!motion.matches && isAligned ? Math.sin(pulse / C.ringPulseSeconds * Math.PI) * C.ringPulseAmount : 0));
          ringMaterial.opacity = opacity * (isAligned ? 0.9 : 0.6);
          gpu.render(scene, camera);
          debugFrames++;
          if (!debugTime || latestDiagnostics?.state !== next.state || now - debugTime >= C.debugIntervalMs) {
            latestDiagnostics = {
              status: "active", state: next.state, targetFactor: next.factor, renderedFactor: rendered,
              targetX, fps: debugTime ? Math.round(debugFrames * 1000 / (now - debugTime)) : 0,
              geometries: gpu.info.memory.geometries, drawCalls: gpu.info.render.calls,
            };
            if (current.debugEnabled) current.onDiagnostics(latestDiagnostics);
            debugTime = now; debugFrames = 0;
          }
          // Reduced motion sleeps once settled; new props, resize or preference changes wake it.
          if (world.visible && (!motion.matches || rendered !== next.factor || renderedEnd !== next.end)) schedule();
        } catch { fail(); }
      }
      const resize = () => {
        const { width, height } = container.getBoundingClientRect();
        if (width <= 0 || height <= 0 || disposed) return;
        gpu.setPixelRatio(Math.min(window.devicePixelRatio || 1, C.maxDpr));
        gpu.setSize(width, height);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        schedule();
      };
      const pause = () => {
        if (frame !== null) cancelAnimationFrame(frame);
        frame = null; lastTime = 0; debugTime = 0; debugFrames = 0;
      };
      const visibility = () => { if (document.hidden) pause(); else schedule(); };
      const pageHide = () => { pageActive = false; pause(); };
      const pageShow = () => { pageActive = true; schedule(); };
      const motionChange = () => { lastTime = 0; schedule(); };
      const contextLost = (event: Event) => { event.preventDefault(); fail(); };
      document.addEventListener("visibilitychange", visibility);
      window.addEventListener("pagehide", pageHide);
      window.addEventListener("pageshow", pageShow);
      motion.addEventListener("change", motionChange);
      gpu.domElement.addEventListener("webglcontextlost", contextLost);
      removeListeners = () => {
        document.removeEventListener("visibilitychange", visibility);
        window.removeEventListener("pagehide", pageHide);
        window.removeEventListener("pageshow", pageShow);
        motion.removeEventListener("change", motionChange);
        gpu.domElement.removeEventListener("webglcontextlost", contextLost);
      };
      resizeObserver = new ResizeObserver(resize); resizeObserver.observe(container);
      if ("IntersectionObserver" in window) {
        intersectionObserver = new IntersectionObserver(entries => {
          intersecting = entries[0]?.isIntersecting ?? true;
          if (intersecting) schedule(); else pause();
        });
        intersectionObserver.observe(container);
      }
      redraw.current = () => {
        if (live.current.debugEnabled && !debugWasEnabled && latestDiagnostics) live.current.onDiagnostics(latestDiagnostics);
        debugWasEnabled = live.current.debugEnabled;
        // Invalid sensor state clears the previous destination immediately.
        if (live.current.difference === null) { world.visible = false; previousDifference = null; gpu.clear(); }
        schedule();
      };
      resize();
      schedule();
    } catch { fail(); }
    return dispose;
  }, []);

  if (failed) return <div data-ar-status="fallback"><QiblaMarker {...props} /><p className="sensor-help">Panduan sederhana aktif.</p></div>;
  return <figure className="qibla-ar-guide" data-ar-status="active" data-ar-state={view.state}>
    <div className="ar-stage" ref={host} aria-hidden="true" />
    {(view.state === "far" || view.state === "partial") && <p className="ar-edge-label" aria-hidden="true">{(props.difference ?? 0) < 0 ? "←" : "→"} Kiblat di luar pusat tampilan</p>}
    <DirectionGuide difference={props.difference} notice={props.notice} uncertain={props.uncertain} />
    <p className="ar-road-note">Jalur menunjukkan arah putaran, bukan rute perjalanan.</p>
  </figure>;
}
