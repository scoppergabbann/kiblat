# Milestone 14 — Three.js AR Qibla Navigation

Panduan kamera Kiblat kini memakai Ka'bah 3D, jalan perspektif melengkung, empat panah bergerak, dan cincin tujuan. Three.js memakai headingDifference dari aplikasi yang sudah ada. Jalan adalah petunjuk memutar ponsel, bukan rute perjalanan atau pelacakan permukaan dunia nyata.

## File dan dependensi

File baru:

- `src/components/QiblaCameraGuide.tsx`: lazy loading dan fallback jika chunk gagal dimuat.
- `src/components/QiblaARScene.tsx`: scene, render loop, interpolasi, resize, lifecycle, debug, dan fallback WebGL.
- `src/lib/ar/arMath.ts`: konfigurasi visual, pemetaan arah, state tampilan, damping.
- `src/lib/ar/createKaaba.ts`: model prosedural dan pelepasan resource bersama.
- `src/lib/ar/createQiblaRoad.ts`: ribbon, tepi jalan, kurva, dan chevron.
- `tests/ar.test.mjs`: enam kelompok pengujian AR.
- Dokumen ini.

File diubah:

- `src/components/CompassStatus.tsx`: memasang AR saat stream kamera aktif dan menambah diagnostik pada disclosure Informasi teknis.
- `src/app/globals.css`: container AR responsif, caption, dan catatan fungsi jalan.
- `package.json`, `package-lock.json`: `three@0.186.1` dan dev dependency `@types/three@0.186.0`.
- `tsconfig.json`: mengizinkan ekstensi import TypeScript untuk pengujian helper langsung dengan Node; tetap noEmit.
- `README.md`: tautan milestone terbaru.

Tidak memakai react-three-fiber, model eksternal, tekstur eksternal, atau paket animasi tambahan.

## Fitur lama yang dipertahankan

Rumus bearing Kiblat, shortest signed heading difference, referensi utara, proyeksi tepi atas layar, smoothing kompas 160 ms, batas aligned ±3°, near sampai 20°, deteksi ketidakstabilan, panduan kalibrasi, dan getaran sekali tetap memakai implementasi sebelumnya.

Hook lokasi/sensor/kamera, izin melalui ketukan pengguna, kamera belakang HTML, penolakan dan pembatalan izin, pelepasan track, pause saat background/pagehide, pencegahan hasil izin terlambat, serta retry eksplisit tidak diubah. Mode tanpa kamera tetap memakai kompas lama. Branding, safe area, PWA opsional dan akses situs juga dipertahankan.

Tidak ada permintaan lokasi/sensor/kamera dari Three.js. Tidak ada VideoTexture, unggahan video, penyimpanan GPS, telemetry sensor, backend baru, atau layanan pihak ketiga. Chunk Three.js merupakan aset aplikasi sendiri.

## Scene dan pemetaan arah

Urutan lapisan: video HTML yang sudah ada → gradient kamera → canvas WebGL transparan → instruksi dan kontrol HTML. WebGLRenderer memakai alpha dan antialias, tanpa shadow map atau postprocessing. PerspectiveCamera serta ambient/directional light menampilkan model Ka'bah dari box gelap, empat pita emas, pintu, dan dasar sederhana. Rotasi presentasi model tetap; model tidak berputar.

`factor = clamp(headingDifference / 45, -1, 1)`. Positif membelok ke kanan, negatif ke kiri. Target X = renderedFactor × 3; tujuan tetap pada Z = −8. Alignment dari state lama menjadikan target factor nol. Koordinat asli sensor/bearing tidak pernah dimodifikasi oleh visual.

CatmullRomCurve3 memiliki lima control point dari pengguna menuju tujuan. Pergeseran X memakai bobot 0, 0.04, 0.28, 0.68, 1. Setiap sampel kurva menghasilkan dua vertex kiri/kanan menggunakan vektor tegak lurus tangent pada bidang tanah. Vertex dihubungkan menjadi indexed BufferGeometry; lebar dunia konstan sehingga perspektif membuat bagian dekat terlihat lebih lebar. Dua ribbon tipis membentuk tepi jalan. Tidak ada TubeGeometry.

Empat chevron berbagi satu geometri/material, mengambil posisi dengan getPointAt dan orientasi dari getTangentAt. Progress bertambah berdasarkan delta waktu menuju tujuan lalu berulang. RingGeometry mendatar berada di bawah model. Saat masuk aligned, cincin memberi satu pulsa kecil; getaran tetap ditangani hook lama.

## State tampilan dan smoothing

| Selisih absolut | Tampilan |
| --- | --- |
| ≤3°, pembacaan stabil | Tujuan di tengah, jalan melurus, konfirmasi lama |
| >3°–30° | Jalan penuh dan Ka'bah mengikuti arah |
| >30°–45° | Jalan memendek, Ka'bah memudar |
| ≥45°–60° | Jalan parsial, Ka'bah tersembunyi |
| >60° | Potongan jalan pendek, instruksi putar; tanpa putaran U |
| Heading tidak valid/tersedia | Scene dikosongkan; pesan pemulihan lama |

Batas pesan “Sedikit lagi” tetap batas lama 20°, terpisah dari batas visibilitas objek. Scene menambahkan exponential damping visual 140 ms, bukan filter sensor pengganti. Geometri hanya diperbarui ketika factor/end berubah cukup besar atau tepat selesai menuju target. Jalan melurus secara bertahap saat aligned.

Perlintasan 359°/0° memakai normalized difference yang sudah tersedia. Perubahan tanda dekat ±180° langsung mengganti sisi visual agar jalan tidak menyapu tengah dan tampak seolah aligned. Pembacaan tidak stabil tetap ditampilkan sebagai perkiraan, dengan opacity lebih rendah; damping tambahan dilewati dan panah berhenti selama ketidakstabilan. Tidak ada konfirmasi alignment palsu.

## Performa, lifecycle, dan fallback

- Three.js dimuat hanya setelah stream kamera aktif. Mode kompas biasa tidak perlu mengunduh scene.
- DPR dibatasi 2; ResizeObserver mengikuti ukuran container sebenarnya. Tinggi scene menyesuaikan portrait dan landscape pendek.
- Satu requestAnimationFrame yang dijaga agar tidak ganda; delta dibatasi 50 ms untuk menghindari lompatan setelah jeda.
- Objek, vektor bantu, material dan buffer vertex digunakan ulang. Tidak membuat mesh/geometri baru untuk setiap event sensor.
- Render dijeda ketika tab tersembunyi, pagehide, atau canvas di luar viewport. Reduced motion menghentikan gerak panah dan pulsa; loop tidur setelah interpolasi selesai dan bangun bila data/ukuran berubah.
- Cleanup membatalkan frame, melepas listener, disconnect observer, dispose geometri/material bersama sekali, serta renderer/render lists. Tidak memakai forceContextLoss.
- Gagal mengunduh scene, gagal inisialisasi WebGL, context loss, atau kegagalan render kembali ke penanda sederhana. Kamera dan perhitungan tetap independen.
- Debug hanya muncul di Informasi teknis: factor target/rendered, target X visual, state, FPS, geometri dan draw calls. Angka adalah snapshot frame terakhir; saat pengguna menggulir ke debug, render dapat dijeda karena canvas di luar layar. Nol FPS awal bukan hasil pengukuran.

## Parameter tuning

Semua nilai utama ada di `src/lib/ar/arMath.ts`, objek `AR_CONFIG`.

| Parameter | Nilai awal | Fungsi |
| --- | --- | --- |
| roadWidth | 1.25 | Lebar jalan dalam unit scene |
| roadLength | 8 | Jarak visual tujuan |
| roadY | −1.1 | Tinggi bidang jalan |
| roadSegments | 56 | Jumlah sampel ribbon |
| edgeWidth | 0.035 | Lebar garis tepi |
| maxTargetX | 3 | Pergeseran maksimum tujuan |
| cameraFov | 48° | FOV vertikal virtual |
| cameraHeight / cameraZ | 1.9 / 3.4 | Posisi kamera virtual |
| cameraLookY / cameraLookZ | −0.2 / −4 | Titik pandang kamera |
| fullRoadAngle | 30° | Awal pemendekan jalan/fade tujuan |
| visibleAngle | 45° | Normalisasi arah dan akhir visibilitas tujuan |
| farAngle | 60° | Awal potongan jalan pendek |
| partialRoadEnd / farRoadEnd | 0.48 / 0.34 | Proporsi panjang kurva |
| dampingSeconds | 0.14 | Konstanta waktu smoothing visual; lebih kecil lebih responsif |
| geometryEpsilon | 0.0008 | Ambang pembaruan buffer |
| arrowCount / arrowSpeed | 4 / 0.11 | Jumlah panah / siklus progress per detik |
| arrowScale | 0.42 | Ukuran chevron |
| kaabaScale | 1.1 | Skala model |
| ringRadius | 0.94 | Radius cincin tujuan |
| ringPulseSeconds / ringPulseAmount | 0.65 / 0.055 | Durasi / tambahan skala pulsa |
| roadOpacity | 0.64 | Transparansi jalan |
| maxDpr | 2 | Batas resolusi GPU |
| maxDeltaSeconds | 0.05 | Batas delta frame |
| debugIntervalMs | 500 | Interval snapshot; perubahan state dapat dilaporkan segera |

Toleransi alignment tetap `ALIGNMENT_TOLERANCE` di `src/lib/compass.ts`; tidak dibuat salinan di AR_CONFIG. Prioritas tuning ponsel: ukuran jalan/model, framing kamera, opacity di latar nyata, damping dan kecepatan panah. Mengubah nilai visual tidak meningkatkan akurasi kompas.

## Verifikasi otomatis

- 27 kelompok unit test lolos, termasuk enam baru: batas state, north wrap dan rear-side reset, damping berdasarkan waktu, lebar/kerataan/perspektif ribbon, arah/progress chevron, dan dispose resource bersama.
- Chromium/Edge headless dengan WebGL software benar-benar merender scene, memakai lokasi/orientasi/stream kamera sintetis. Pengujian bukan akses kamera pengguna.
- Arah kiri/kanan, aligned, far, panah bergerak, reduced-motion statis, resize 320/390/844 px, DPR 3 dibatasi 2, dan screenshot diperiksa.
- Selama perubahan arah jumlah buffer GPU tetap. Pengamatan lokal: 12 geometri, 23 draw calls pada scene penuh, sekitar 60 FPS di desktop pengujian. Ini bukan tolok ukur performa ponsel.
- Maksimum satu RAF scene yang tertunda. Scroll keluar layar menghentikan draw. Hide/close dan tiga siklus kamera membebaskan seluruh buffer/program yang diinstrumentasi.
- Gagal inisialisasi WebGL, context loss, dan lazy chunk yang sengaja diblokir mempertahankan panduan fallback dan video. Kamera ditolak tetap menampilkan kompas.
- Regresi pesan sensor, penolakan izin, gesture, sensor tidak stabil, stale readings, late permissions, BFCache/pagehide, lokasi terlambat, zoom dan safe area layout lolos.
- TypeScript dan production build diperiksa sebelum publikasi.

Harness browser berada di workspace `work/browser-check/milestone14.cjs`, `milestone14-extra.cjs`, dan `milestone14-regression.cjs`; regresi lifecycle memakai `milestone12.cjs`. Unit tests dapat dijalankan dengan `npm test`.

## Checklist Android Chrome dan iPhone Safari

Status: **belum diuji pada ponsel fisik dalam sesi ini**. Jalankan daftar berikut di kedua perangkat, melalui situs HTTPS.

1. Muat ulang situs. Tap Mulai Cari Kiblat, izinkan lokasi, lalu tap Izinkan sensor arah. Di Safari, terima dialog sensor bila muncul. Kamera harus tetap mati sampai ditap.
2. Pegang agak mendatar, arahkan tepi atas layar ke depan, lalu aktifkan latar kamera. Pastikan video nyata muncul, canvas transparan, tombol tutup terjangkau dan tidak tertutup notch/home indicator.
3. Putar menjauh lebih dari 60°. Ka'bah harus hilang; instruksi dan potongan jalan menunjukkan sisi putaran tanpa jalan berputar U.
4. Putar perlahan mendekati Kiblat. Periksa jalan membelok lalu melurus dan Ka'bah menuju tengah. Lewati sisi Kiblat: jalan membelok ke sisi sebaliknya.
5. Tahan dalam ±3°. Harus muncul konfirmasi, jalan lurus setelah transisi singkat, dan satu pulsa cincin. Getaran hanya bila browser mendukung; tidak berulang selama tetap sejajar.
6. Lewati 359°/0° heading; visual mengikuti selisih bertanda tanpa putaran penuh. Coba arah berlawanan sekitar ±180°: tidak boleh menyapu tengah sebagai alignment palsu.
7. Coba gerakan bolak-balik dan posisi hampir tegak. Peringatan lama harus tampil; data invalid menghilangkan scene, bukan membekukan arah lama.
8. Putar portrait/landscape. Periksa resize, tidak ada overflow horizontal, controls tetap bisa ditap, dan pembacaan yang direset pulih sesuai alur sensor lama.
9. Tutup/buka kamera berulang. Indikator kamera OS harus berhenti saat ditutup. Buka aplikasi lain atau kunci layar, lalu kembali: kamera/sensor harus dijeda dan memerlukan aktivasi eksplisit.
10. Tolak lokasi, sensor (jika dialog tersedia), dan kamera dalam percobaan terpisah; reset izin situs jika perlu. Pastikan pesan lama dan retry tetap bekerja. Kamera ditolak tidak boleh menghilangkan kompas.
11. Aktifkan pengaturan OS untuk mengurangi animasi/Reduce Motion, kembali ke situs: chevron dan ring tidak beranimasi, tetapi jalan dan tujuan tetap mengikuti arah.
12. Untuk fallback WebGL, gunakan remote debugging pada sesi pengujian: nonaktifkan WebGL sebelum reload atau picu context loss pada canvas. Harus tampil panduan sederhana, tanpa crash dan tanpa meminta kamera lagi. Pengguna biasa tidak perlu melakukan ini.
13. Buka Informasi teknis untuk memeriksa state/factor. Untuk mengukur FPS saat canvas terlihat, gunakan remote inspector atau layar cukup tinggi; saat canvas keluar viewport angka adalah snapshot terakhir.

Pada Android, uji Chrome portrait/landscape dan aplikasi terpasang bila digunakan. Pada iPhone, uji Safari serta Home Screen secara terpisah karena izin bisa berbeda. Catat model, versi OS/browser, kondisi cahaya, screenshot dan hasil tiap langkah.

## Batasan

Ini overlay arah, bukan WebXR/SLAM: tidak melekat pada tanah atau objek kamera, dan FOV virtual bukan kalibrasi lensa perangkat. Heading tetap proyeksi horizontal tepi atas layar, bukan sumbu optik kamera; posisi hampir tegak dapat ditolak oleh logika lama. Integrasi tilt tambahan sengaja tidak ditambahkan.

Perbedaan utara magnetik/sejati belum dikoreksi; sensor bias, logam, magnet, lokasi, dan kondisi perangkat tetap memengaruhi arah. Smoothing menambah sedikit keterlambatan. Kamera hardware, sensor nyata, Safari GPU, suhu/baterai, interupsi OS dan kenyamanan penggunaan perlu verifikasi fisik; 60 FPS tidak dijamin. Browser tanpa WebGL yang sesuai tetap dapat memakai panduan sederhana.
