# Kiblat
Milestone 15 adds a rear-camera direction reference for valid absolute orientation while upright, with a visible reference label and guarded screen-top fallback. Safari/WebKit remains in flat mode. See [support limits and physical-device checklist](MILESTONE-15.md).

Current onboarding: one **Izinkan & Mulai** button requests orientation, camera and location in the original user gesture. Privacy is explained before access. Native browser dialogs may remain separate. See [unified permission flow](UNIFIED-PERMISSIONS.md).

Milestone 14: Three.js AR navigation above the existing live camera.

See [Milestone 14 implementation, tuning values and Android/iPhone checklist](MILESTONE-14.md). The previous camera, permissions and compass calculations remain in use.

## Production polish (Milestone 12)
- `useCompass.ts` now listens for visibility/pagehide throughout its lifetime, including while native permission is pending. Leaving the page invalidates the pending grant, removes sensor listeners/timers and clears readings. Returning from a hidden tab or back/forward cache never automatically restarts sensors. A new explicit tap is required. This closes the late-grant hide/show race and pagehide-only cleanup gap.
- Valid compass samples are still checked and filtered, but normal UI publication is limited to roughly 30Hz. Quality changes, invalid data, screen rotation and new sources bypass/reset the limiter as appropriate. No animation loop, continuous GPS watch or background polling was introduced.
- `useGeolocation.ts` ignores pending callbacks after pagehide or backgrounding and gives an explicit retry message. Native one-shot geolocation cannot be aborted; the application discards late results. `CameraView.tsx` ignores late manual-play completions after unmount, protecting a newer camera session from an old failure.
- `useCamera.ts` requests ideal 1280x720 video at 24fps, no audio. These are preferences, not mandatory constraints, so hardware can choose another supported format. No measured battery-saving percentage is claimed. Existing track-stop/cancellation behavior remains intact.
- `globals.css` respects all four safe-area insets, including wide/landscape layouts, and reduces marker height in short landscape viewports. Close-camera controls remain fixed and reachable; text zoom is preserved.
- Source audit found no application fetch/XHR/beacon, location/sensor browser storage, analytics, continuous location watch or sensor-data logging in `src`. Native browser/OS location services and hosting authentication are outside this audit. Existing owner-private site access is unchanged.
- Validation: all 21 unit groups and production TypeScript/build pass. Browser lifecycle simulations verify late pending sensor grants after hide/show, five start/stop cycles with no remaining sensor listeners, pagehide/BFCache pause, no automatic resume, late camera and location results discarded, camera track release, 320px/portrait/landscape and 200% text. The Milestone 10 permission and feedback regression passes. Real hardware battery, notch rendering, operating-system interruption and sensor accuracy still need phone testing.

### Try Milestone 12
Activate the sensor and camera, switch to another app/tab, then return. Expect both to be paused; activate them again explicitly. Also try leaving while a permission prompt is pending: accepting a late response must not restart the abandoned request. Rotate portrait/landscape and close the camera; its use indicator should stop. These checks preserve the previous approximate-heading limitations.

Lifecycle reference: https://developer.mozilla.org/en-US/docs/Web/API/Window/pagehide_event . Both visibilitychange and pagehide are used without unload handlers. Camera preferences: https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackConstraints/frameRate .

## Optional PWA (Milestone 11)
- New `public/manifest.webmanifest` defines stable root identity/start/scope, Indonesian app naming, standalone display, theme/background colors and regular 192/512px plus maskable 512px icons. No orientation lock is imposed.
- New `public/icons/` PNG assets reuse the existing SVG brand mark, including an opaque padded 180px Apple touch icon. `scripts/generate-pwa-icons.cjs` regenerates them with the image dependency already installed by Next; no new package was added. Maskable artwork stays inside the central safe area.
- `src/app/layout.tsx` links the manifest with `crossOrigin="use-credentials"` because this existing hosted site has owner-private access. It adds application/Apple metadata and the touch icon. Existing theme-color, device-width, zoom and safe-area viewport settings remain intact. The manifest is a public static asset within the site, avoiding an extra runtime route for static export.
- `src/app/page.tsx` and `globals.css` add a collapsed optional installation guide for Android browser menus and iOS/iPadOS Safari sharing. The guide is hidden in standalone/fullscreen display. Installation is never required and triggers no location/sensor/camera request. No automatic install prompt, service worker, offline caching or push notification is included.
- Connection and existing site access are still required to open/reload Kiblat. Installation does not change the owner-private audience or remove authentication; browser/account policy can affect installation and later access. Sensor and camera permissions still follow the existing explicit flow. A standalone launch may need permissions again depending on the device.
- Verification checks manifest parsing in a Chromium browser, PNG dimensions, exported files, theme/Apple/viewport metadata, optional guide, responsive widths, and absence of automatic permission requests or service-worker registrations. Build and TypeScript checks pass. Actual home-screen installation and launch on physical Android/iOS remain to be tested.

### Try Milestone 11
Refresh the HTTPS site. On Android, use the browser menu's **Instal aplikasi** or **Tambahkan ke layar utama** if offered. On iPhone/iPad, open in Safari, use **Bagikan**, then **Tambahkan ke Layar Utama**. Launch the Kiblat icon: expect the same location → sensor → optional camera flow. You can ignore installation and keep using the browser URL normally. Menu names and install promotion vary by browser.

PWA reference: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable . Service workers are not required for installability; this milestone makes no offline guarantee.

## Feedback fix and permissions (Milestone 10)
- Root cause: the shared `DirectionGuide` treated every null direction as "Menunggu arah ponsel", including excessive tilt, rejected data, stale readings and the instability heuristic. New `src/lib/compassNotice.ts` maps each sensor state to an actionable title and explanation. Waiting now means actual sensor acquisition; it explicitly says movement is not required. Tilt, denial, unsupported hardware, paused/stale data and invalid readings have distinct recovery instructions.
- Unlike Milestone 9, unstable but valid readings keep the smoothed marker visible with "Tahan ponsel sejenak" and an uncertainty explanation. Both visual modes suppress alignment lock, checkmark and haptics while unstable. Invalid/tilted/stale data still clears the marker immediately. No stale heading is fabricated, and the physical screen-top/near-upright limitation has not been removed.
- `LocationRequest.tsx` explains local bearing calculation before the location request and introduces the three-step sequence. `CompassStatus.tsx` puts sensor explanation/activation first, then offers the optional camera after a valid sensor reading. Each request remains a direct user gesture; there is no automatic camera request. "Lanjut tanpa kamera" enters compass-only use and leaves camera activation available later. Denied/unsupported sensor states retain the numeric bearing and explicit recovery guidance rather than asking for an unusable camera overlay.
- Camera denial does not stop the compass. Retry, cancel, close, page background and location-refresh cleanup remain available. Sensor cancellation is labeled explicitly while permission is pending. No new dependencies, backend or persisted permission/position data.
- Files created: `src/lib/compassNotice.ts`, `tests/compassNotice.test.mjs`. Updated: `LocationRequest.tsx`, `CompassStatus.tsx`, `DirectionGuide.tsx`, `QiblaCompass.tsx`, `QiblaMarker.tsx`, `globals.css`, this README.
- Validation: 21 unit test groups plus browser simulations for idle/waiting/tilted/denied/stale messages, uncertain marker visibility without alignment, sequential sensor/camera gestures, camera skip/denial/retry, location-refresh cleanup and mobile/landscape layout. Production build includes TypeScript validation. These simulations cannot verify physical phone sensor or browser permission-dialog behavior.

### Try the fix and Milestone 10
Refresh the HTTPS site. Obtain location, read why the sensor is needed, then tap **Izinkan sensor arah**. Hold the phone somewhat flat until a usable reading arrives. Choose **Aktifkan latar kamera** or **Lanjut tanpa kamera**. If the phone is too upright, expect **Miringkan ponsel lebih mendatar**, not a generic waiting message. Back-and-forth valid readings retain an approximate marker with **Tahan ponsel sejenak**. If readings stop, expect **Data sensor terhenti** and retry instructions. No confirmation is shown while data is invalid or marked unstable.

## Calibration and sensor quality (Milestone 9)
- `src/lib/compass.ts` adds `createHeadingFilter`: exponential smoothing on the shortest circular arc with a 160ms time constant. Crossing 359/0 stays near north. Time-based weighting makes the response independent of ordinary event frequency. A gap over one second starts a fresh reading. Smoothing introduces a small response delay and does not improve absolute accuracy.
- `src/hooks/useCompass.ts` preserves raw heading separately and filters only valid, north-referenced samples. Source changes, invalid readings, screen rotation and new sensor sessions reset filter history. Existing accuracy rejection, stale timeout, permission and visibility cleanup remain intact.
- Repeated reversals (at least four sign changes between steps of at least 3 degrees within 800ms) flag changing readings. This is a heuristic: deliberate back-and-forth movement can trigger it, and a steady but biased compass can escape detection. The UI asks users to hold still and check calibration if changes persist. While flagged, markers/alignment/haptics are suppressed; recent steady samples recover automatically. No calibration-success or accuracy guarantee is inferred.
- `CompassStatus.tsx` adds an accessible "Kalibrasi kompas" disclosure, environmental-interference guidance, gentle figure-eight instructions, reported/unknown accuracy and raw/filtered diagnostics. `globals.css` styles the warning/disclosure and contains rotated compass overflow at narrow widths.
- New `tests/smoothing.test.mjs` checks wraparound, convergence, sample-rate independence, resets, reversal detection, steady turns, small noise and recovery. All 20 unit groups pass; browser simulations cover the disclosure, raw/filtered differences, warning/suppression/recovery, source/screen/invalid/session resets, unknown accuracy, responsive layout and stale cleanup. Production build and TypeScript are verified. Physical Android/iOS tests are still needed.

### Try Milestone 9
Refresh the site and activate location/sensor. Open **Kalibrasi kompas**, move away from magnetic/metal objects, gently make a figure eight, then hold the phone somewhat flat and still. Small heading changes should move more gently. Repeated larger back-and-forth readings show **Kompas kurang stabil** and temporarily hide the marker; steady readings restore it. Open **Informasi teknis** to compare Heading (filtered) and Heading mentah. The browser may not report accuracy; this stays explicitly unknown.

Reference guidance: https://support.google.com/maps/answer/2839911?co=GENIE.Platform%3DAndroid&hl=en-AU and https://support.apple.com/guide/iphone/compass-iph1ac0b663/ios . The website cannot force or verify hardware calibration. Screen-top heading, approximate camera framing and uncorrected magnetic declination remain limitations.

## Alignment experience (Milestone 8)
- `QiblaMarker.tsx` and `QiblaCompass.tsx` snap only the visual marker to the center/top when the existing raw difference is within +/-3 degrees. The camera guide line becomes vertical. Raw sensor values and technical diagnostics are unchanged. Existing near (over 3 through 20 degrees) and turn (over 20) thresholds remain intact.
- `DirectionGuide.tsx` adds a check badge to the shared alignment caption. `globals.css` supplies a single 400ms confirmation animation, positive colors and a stronger guide line. Reduced-motion users receive the static confirmation without animation. The visible caption still qualifies alignment as a sensor estimate.
- New `src/hooks/useAlignmentFeedback.ts`, called once from `CompassStatus.tsx`, requests one 35ms vibration on entering alignment. Continuous aligned readings and camera-view switches do not retrigger it. To prevent boundary chatter, haptics re-arm only after a valid difference exceeds 5 degrees, or after readings become unavailable; visual alignment still uses +/-3 degrees. No new libraries, permissions, storage or network calls are added.
- Vibration is best-effort: it requires browser support and user activation, skips hidden documents, tolerates false returns or exceptions, and cancels an attempted pulse on background/pagehide/unmount. Unsupported hardware/browser settings do not block the visual guide. Reference: https://developer.mozilla.org/en-US/docs/Web/API/Navigator/vibrate
- Verification: all 17 calculation/compass/marker test groups pass. Browser simulation checks centered markers and vertical lines, single pulses during sustained alignment, boundary chatter, leaving/re-entering alignment, camera switching, stop/stale cleanup, missing/throwing vibration and reduced-motion behavior. TypeScript and production build are checked. These simulations do not validate physical device accuracy or actual haptics.

### Try Milestone 8
1. Refresh the HTTPS site, obtain location, activate the sensor and optionally the camera.
2. Hold the phone gently tilted and turn toward Qibla. Within +/-3 degrees, expect a centered marker, straight guide line, check badge and a brief vibration if available.
3. Keep the phone aligned: vibration should not repeat. Move more than 5 degrees away and return to trigger a new pulse.
4. Stop the sensor: confirmation disappears. Enable reduced motion in your OS: confirmation remains visible without animation.

Limitations remain: screen-top heading rather than camera optical axis, approximate visual field of view, uncorrected magnetic declination, and device-dependent sensor accuracy. A visual lock is not proof of exact physical Qibla alignment.

## AR-like marker (Milestone 7)
- New `src/components/QiblaMarker.tsx` replaces the circular dial only while the camera stream is active. A Kaabah marker moves horizontally according to the signed heading difference, connected to the fixed phone pointer by a line. Closing the camera restores the existing circular compass.
- New `src/lib/marker.ts` maps -45 through +45 degrees to a bounded horizontal track. Beyond that symbolic 90-degree window, a left/right edge pill replaces the guide line. CSS transforms position the marker; no 3D engine, camera calibration, new dependencies or sensor changes are included. The window is a UI approximation, not the measured camera field of view. Front-camera fallback is not mirrored and still follows compass left/right.
- New `src/components/DirectionGuide.tsx` shares the existing captions and thresholds between both views. It is extracted from `QiblaCompass.tsx` without changing its behavior. No snapping, animation, smoothing or vibration is added; these belong to later milestones.
- `CompassStatus.tsx` selects the appropriate view and explains the approximate marker; `globals.css` provides the bounded track, fixed pointer, connecting line and edge arrows. The track reserves space for arrows and enlarged text.
- Missing, stale, stopped, tilted or invalid heading data clears the marker and connecting line. A camera alone cannot imply a usable compass direction. The heading remains the screen-top horizontal projection, not the camera optical axis; hold the phone gently tilted. Near-upright screen-top orientation remains unsupported, and magnetic declination remains uncorrected.
- New `tests/marker.test.mjs` covers full-circle bounds/monotonicity, window boundaries, north wraparound, opposite headings and invalid values. All 17 test groups pass. Browser simulation checks left/right/center, near/aligned captions, edge indicators, viewport bounds at 320px/mobile/landscape/desktop, 200% text, stale/tilted/stopped readings and camera-close fallback. The existing Milestone 5 browser regression also passes. Physical sensor/camera accuracy has not been established by these simulations.

### Try Milestone 7
1. Refresh the HTTPS site on your phone, obtain location, activate the direction sensor and camera.
2. Hold the phone gently tilted with the screen top pointing forward. Rotate left/right: the marker should move horizontally, with a line toward the fixed pointer.
3. Turn far from Qibla: expect a bounded edge arrow and left/right instruction. Approach Qibla: the marker returns into view and approaches the center.
4. Stop the sensor: the target and line disappear. Close the camera: the circular compass returns. No additional permission is requested for the marker.

## Camera background (Milestone 6)
- `src/hooks/useCamera.ts` requests `getUserMedia` only from a button, with `audio: false` and an ideal environment-facing camera. Camera and compass permissions are separate. No recording, upload, storage or microphone access is implemented.
- A known front-facing result is stopped immediately and requires an explicit fallback tap. Unreported facing mode is disclosed instead of claiming the camera is rear-facing.
- `src/components/CameraView.tsx` displays a muted, inline, autoplay video with `object-fit: cover`, a readability gradient and an accessible close button. If autoplay is blocked, a manual play button is offered. Playback errors release the camera.
- `CompassStatus.tsx` integrates the optional camera controls; `globals.css` keeps the existing compass above the full-viewport video. No new dependencies.
- Permission rejection, missing/unsupported/busy cameras and constraints errors show recovery messages. Cancel, close, track interruption, location refresh, unmount, pagehide and hidden-page transitions stop all acquired tracks. Late permission results are stopped after cancellation. Returning does not automatically restart the camera.
- Camera imagery is only a background. The existing compass still follows the horizontal projection of the screen top edge, not the camera optical axis. Hold the phone gently tilted; upright orientation can suspend guidance. No world-anchored AR markers or magnetic declination correction are included.

### Test on a phone
1. Open the HTTPS site, refresh, obtain location and optionally activate the direction sensor.
2. Tap **Aktifkan latar kamera** and allow camera access. Expect a live environment view behind the compass, with no microphone request.
3. Tap **Tutup kamera**. The video and browser camera-use indicator should disappear. Restart, then leave the tab or refresh location: the camera should stop again.
4. Try denying permission and retry after changing site permissions. On devices with only a front camera, explicitly choose **Gunakan kamera yang tersedia** if offered.
5. Rotate the phone and try portrait/landscape. The overlay remains readable and still uses the screen-top compass convention. This milestone does not verify physical compass accuracy.

Automated verification: 14 existing calculation/compass test groups, TypeScript and production build; browser simulations use synthetic canvas video streams and simulated permissions, not the user's real camera. Scenarios cover user gestures, rear-camera constraints, no-audio requests, playback recovery/failure, missing/denied/busy/unsupported cameras, front/unknown-facing cameras, canceled late results, track interruption, background/pagehide/location-refresh cleanup, compass overlay and mobile/landscape/desktop widths. Physical iOS/Android permission UI and actual hardware still require phone testing.

Browser API references: https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia and https://webkit.org/blog/6784/new-video-policies-for-ios/

## Run
Use Node.js 22.18 or newer to run the TypeScript tests without adding a test dependency.
```sh
npm ci
npm run dev -- --port 3047
```
Open http://localhost:3047. For phone testing, use the deployed HTTPS site; ordinary HTTP over a LAN address cannot access geolocation.

## Verify
```sh
npm test
npm run typecheck
npm run build
```
The static website is exported to `out/`.

On a phone, refresh the deployed site, tap "Mulai Cari Kiblat", and allow location.
Expected: "Mencari lokasi..." then "Lokasi ditemukan" and the compact visual guide. Tap "Izinkan sensor arah" to activate the compass. Open "Informasi teknis" for coordinates, heading and accuracy. For simulated Surabaya coordinates (-7.25, 112.75), expect a Qibla bearing around 294 degrees.
Test denial by resetting the site's location permission in browser settings, then denying the prompt. Expect Indonesian instructions and "Coba lagi".
After a denial, a retry cannot override the browser's saved block: allow location in site/phone settings first.
Reload resets the in-memory result to idle. A browser may remember permission and skip its prompt on subsequent requests.
No location request should happen on load. While requesting, the button is disabled to prevent overlapping requests.
Check 390 × 844, 320px width, landscape, desktop, and 200% text.

## Architecture and privacy
Next.js App Router, strict TypeScript, Tailwind v4, static export.
`src/hooks/useGeolocation.ts` owns one-shot native browser location requests and the idle, requesting, success, permission-denied, unavailable, timeout and error states.
`src/components/LocationRequest.tsx` owns the button, status messages and temporary coordinate display.
Location remains in React memory only: no application network calls, URLs, logs, database or browser storage contain it.
The browser/OS location provider operates outside this application's control.
Options: high accuracy requested, 15-second acquisition timeout, no cached position. Permission-wait time may be controlled separately by the browser.
Late callbacks after unmount are ignored. There is no continuous location watch.
Native errors and unsupported/insecure contexts have Indonesian recovery guidance.
System fonts; no added dependencies, backend or analytics. Camera access is optional from Milestone 6.
The decorative direction icon is not a live compass.

## Limitations
Browser/device settings determine permission and accuracy. Automated browser checks use simulated coordinates and errors; real GPS and iOS/Android permission UI require physical-phone testing.
Coordinates and sensor diagnostics are optional under the collapsed "Informasi teknis" disclosure.
The bearing is an initial great-circle direction on a spherical Earth, measured clockwise from true north, not the current phone heading. Rotating the phone changes the separate sensor heading and estimated difference, not the calculated Qibla bearing.

## Next milestone
Milestone 13: final Android Chrome/iPhone Safari testing checklist covering permissions, sensors, GPS, interference, orientation, refresh, backgrounding and production HTTPS.

## Qibla calculation
New pure function: src/lib/qibla.ts, calculateQiblaBearing(latitude, longitude).
Destination: Ka'bah at latitude 21.4225, longitude 39.8262.
Uses atan2 and spherical trigonometry; returns an unrounded value in [0, 360).
Invalid/non-finite coordinates throw RangeError. Coincident/antipodal points and geographic poles return null, rendered as an unavailable direction rather than an invented 0 degrees.
Only display values are rounded; modulo is reapplied after rounding to avoid showing 360 degrees.
The large label uses integer degrees; the temporary debugging row uses two decimals. These decimal places do not imply matching GPS or model accuracy.
No external calculation API or new dependencies. Existing geolocation and permission behavior is unchanged.
Reference formula: https://www.movable-type.co.uk/scripts/latlong.html#bearing

## Calculation tests
npm test uses Node's built-in test runner with type stripping.
tests/qibla.test.mjs covers cardinal directions, city fixtures, 175 global coordinates compared to an independent Cartesian projection, date-line equivalence, wraparound, singularities and invalid inputs.

## Device compass (Milestone 4)
- src/hooks/useCompass.ts owns capability detection, user-gesture permission, listeners, timers and lifecycle.
- src/lib/compass.ts owns pure heading extraction and shortest signed difference in [-180, 180). Positive means right; negative means left. Exactly opposite chooses -180 consistently.
- src/components/CompassStatus.tsx displays explicit activation, direction instructions, heading, difference, source, permission and reported accuracy.
- Both deviceorientationabsolute and deviceorientation are considered. Relative alpha alone is NEVER a compass. Absolute readings require valid alpha/beta/gamma. WebKit's native compass heading takes precedence; 0 is valid. Reported negative or worse-than-30-degree WebKit accuracy suppresses guidance. Missing accuracy is shown as unknown, never fabricated.
- requestPermission(true), where available, is invoked directly in the click handler before any await. Android browsers without that method can still deny access through settings/policy or provide no data.
- Heading is the horizontal projection of the current screen's TOP EDGE, not a rear-camera vector. It uses the Z-X-Y rotation matrix and screen.orientation.angle, with legacy window.orientation as fallback. Native WebKit headings get a tilt-aware screen rotation correction. Near-vertical top-edge projections are rejected with a request to hold the phone flatter. A portrait-oriented, gently tilted phone is recommended for this milestone.
- No automatic activation, smoothing, vibration or camera is added. Milestone 5 adds the visual compass and a qualified sensor-alignment state.
- No usable reading within 8 seconds or no fresh valid reading within 5 seconds stops listeners and clears guidance. Relative-only and invalid events cannot preserve an old heading indefinitely.
- Screen rotation invalidates the displayed heading until a fresh sample. Stop, component unmount (including a location refresh), and backgrounding remove listeners/timers. Returning from background requires a new tap. Cancelling during a permission prompt invalidates any late permission result.
- Sensor values remain in React memory only; nothing is logged, stored or transmitted.

## Compass accuracy and north reference
Qibla is measured against true north. Apple's webkitCompassHeading is documented against magnetic north, and other browsers may use sensor-dependent north references. No magnetic declination model is included in this milestone. The comparison is explicitly an estimate and must not be treated as a confirmed exact Qibla alignment. Unknown sensor accuracy remains unknown. Physical Android/iOS checks and eventual north-reference correction are still required before accuracy claims.
References:
- https://www.w3.org/TR/orientation-event/
- https://developer.mozilla.org/en-US/docs/Web/API/DeviceOrientationEvent/requestPermission_static
- https://developer.apple.com/documentation/webkitjs/deviceorientationevent/1804769-webkitcompassaccuracy

## Test Milestone 4 on a phone
1. Refresh the HTTPS site, get location, then tap "Izinkan sensor arah". On iOS, allow the system prompt. On Android, a prompt may not appear.
2. Hold the phone gently tilted with the current screen's upper edge pointing forward. Rotate left/right: the Kaabah marker and Indonesian guidance should change. Open "Informasi teknis" to see Heading and Selisih perkiraan.
3. Try landscape, then portrait. If held upright, expect a position warning instead of a false direction.
4. Deny sensor permission, disable sensor access, or try a device without a compass: expect a useful message and a retry option, not a stuck/fake heading.
5. Background the page, return, and activate again. Refresh location or stop the sensor: old guidance should disappear.
6. Compare against a known compass while accounting for magnetic versus true north. These automated tests do not establish physical sensor accuracy.

npm test also covers compass angle wrapping, signed turns, all four screen rotations, independent tilt-matrix checks, relative/null rejection and WebKit accuracy. Browser simulation checks cover permission activation/denial, stream priority, lifecycle cleanup, screen changes, stale data, retries and responsive layout.

## Visual compass (Milestone 5)
- QiblaCompass.tsx is a presentational component; the existing geolocation and compass hooks are unchanged.
- A fixed central pointer shows the current screen-top direction. The Kaabah marker rotates around it using the signed Qibla/heading difference; its icon is counter-rotated to stay upright.
- The dial is relative to the phone. The top label is "DEPAN PONSEL", deliberately not north. Positive differences move the target right, negative differences left; opposite directions remain on the dial.
- getDirectionState in src/lib/compass.ts uses unrounded values: absolute difference <=3 degrees = "Arah Kiblat"; >3 through 20 degrees = "Sedikit lagi"; >20 degrees = "Putar ke kanan/kiri". Invalid/missing data = unavailable. The aligned caption explicitly says "Sejajar menurut sensor · toleransi ±3°".
- There is no CSS rotation transition, so crossing -180/180 cannot animate through a misleading full-circle turn. No haptics, smoothing or camera has been added.
- A marker is rendered only for a current active heading. Idle, pending, denied, unsupported, invalid, tilted, paused, stopped or stale readings cannot retain a target or show alignment.
- After location succeeds, the landing hero is hidden so the compass is the main surface. Latitude, longitude, accuracy, heading, bearing, difference, source and permission remain available under one native, keyboard-accessible "Informasi teknis" disclosure, closed by default.
- Sensor uncertainty and the unresolved magnetic-versus-true-north difference remain visible, including when aligned. Visual alignment is not a guarantee of physical Qibla accuracy.
- Phone checks: turn both ways, approach the target, observe the marker reach the top within +/-3 degrees, stop/retry the sensor, try landscape and open/close technical information. The live visual should disappear when sensor data becomes unusable.
- Automated browser simulation verifies marker position/sign, near/aligned states, keyboard disclosure, missing/stale-data handling, stop/background/location-refresh cleanup, permission failures, and 200% text/mobile/desktop layouts. npm test includes exact threshold boundaries.
