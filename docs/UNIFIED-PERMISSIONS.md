# One-tap permission onboarding

The opening screen explains that location and orientation determine Qibla direction, while camera video supplies the guide background. Kiblat processes this data on-device without storing or uploading it; camera recording and microphone access are not requested.

**Izinkan & Mulai** starts the existing compass, camera and geolocation hooks directly within the same click handler, without awaiting another permission first. Orientation permission is called first to preserve Safari's user activation requirement. Browser/OS permission dialogs are still independent and cannot be merged by the application. See [MDN requestPermission](https://developer.mozilla.org/en-US/docs/Web/API/DeviceOrientationEvent/requestPermission_static).

LocationRequest now owns all three hook lifetimes and passes the camera/compass state into CompassStatus. The camera preview is mounted even while location is pending so an acquired camera is visible and can be closed. Normal use no longer has three application activation steps. Controls remain for denial recovery, stopping access and optional camera use.

Cancellation invalidates pending location results, stops sensors and releases camera tracks; late camera grants are released. Location failure or an undefined bearing also stops camera/sensor access. Background/pagehide guards remain. **Lanjutkan panduan** resumes paused sensors/camera with one tap, without collecting location again. Location refresh explicitly releases the old sessions before restarting preparation.

Validation: 27 existing unit groups pass. Browser simulations verify no access before the initial tap; all three calls see user activation; automatic AR entry; resume/refresh; individual camera/sensor/location denial; late camera cleanup; cancel-all; pending hide/show protection; and narrow/landscape layouts. TypeScript and production build checked before publishing. Physical Safari/Chrome dialog sequencing still needs phone testing.

Manual check: refresh HTTPS site, tap Izinkan & Mulai once, accept any native dialogs, and confirm the guide opens without another activation button. Try rejecting camera (compass remains), rejecting location (camera stops), backgrounding then resuming, and cancelling while requests are pending.
