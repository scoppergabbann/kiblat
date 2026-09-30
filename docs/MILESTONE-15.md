# Milestone 15 — acuan arah kamera untuk posisi tegak

Mode AR sekarang mengikuti arah kamera belakang saat tersedia orientasi absolut yang valid dan browser mengonfirmasi kamera belakang. Saat ponsel diturunkan mendatar, panduan kembali memakai tepi atas layar. Label yang terlihat selalu menyebut acuan yang sedang digunakan.

## Dukungan dan batasan

| Kondisi | Acuan |
| --- | --- |
| Kamera belakang terkonfirmasi + orientasi absolut + ponsel cukup tegak | Kamera belakang |
| Ponsel mendatar | Tepi atas layar |
| Kamera mati, depan, atau facingMode tidak dilaporkan | Tepi atas layar |
| WebKit compass (termasuk Safari iPhone) | Tepi atas layar; dukungan tegak belum tersedia |
| Data invalid/relatif tanpa referensi utara | Tidak menampilkan arah palsu |

Pemilihan berdasarkan kemampuan yang dilaporkan, bukan nama browser atau sistem operasi. Chrome Android umumnya menjadi kandidat pengujian pertama, tetapi tidak semua perangkat memberikan orientasi absolut atau facingMode.

Safari belum memperoleh dukungan tegak. Alpha WebKit relatif terhadap referensi arbitrer; webkitCompassHeading menyediakan utara magnetik pada jalur kompas lama. Perubahan ini sengaja tidak menyimpan offset utara dari pembacaan lama atau menganggap alpha relatif sebagai arah dunia. Dukungan tegak Safari memerlukan validasi terpisah dengan perangkat fisik.

## Perhitungan dan transisi

Helper baru `src/lib/navigationHeading.ts` memproyeksikan vektor kamera belakang [0,0,−1] melalui Rz(alpha) Rx(beta) Ry(gamma), lalu mengambil azimuth dari komponen timur/utara. Rotasi layar tidak mengubah vektor kamera fisik. Rumus bearing Kiblat dan normalisasi selisih arah tetap sama.

`CAMERA_HEADING_CONFIG.enter = 0.65` dan `exit = 0.45` adalah panjang minimum proyeksi horizontal sumbu kamera. Dua batas ini mencegah mode bolak-balik karena gerakan kecil. Saat pitch sederhana tanpa roll, batas masuk sekitar 40.5° dari mendatar dan batas keluar sekitar 26.7°. Ini ambang pemilihan acuan, bukan ukuran akurasi.

`useCompass` tetap memiliki satu pasangan listener dan satu filter. Pergantian acuan mengosongkan pembacaan/konfirmasi terlebih dahulu lalu memulai filter baru; tidak mencampur heading kamera dan tepi layar. Menutup kamera segera menyembunyikan heading kamera lama dari kompas mendatar. Tidak ada izin, GPS, kamera, polling atau paket baru.

Perubahan integrasi: `LocationRequest.tsx` meneruskan status kamera belakang ke hook; `CompassStatus.tsx` menampilkan acuan, petunjuk posisi, dan diagnostik; pesan waiting dibuat netral terhadap kemiringan. Scene Three.js tetap mengonsumsi normalized headingDifference.

## Verifikasi

- 33 kelompok unit test lolos (enam baru di `tests/navigationHeading.test.mjs`).
- Rotasi matriks independen memeriksa proyeksi kamera pada beberapa yaw/pitch/roll, empat arah mata angin, seluruh rotasi layar, 359°/0°, pitch 89°/90°/91°, hysteresis dan data invalid.
- Simulasi browser memeriksa AR tegak dan aligned, invariansi rotasi layar, pergantian posisi, penutupan kamera, WebKit/unknown-facing fallback, background pause, serta regresi izin satu tombol.
- Screenshot browser diperiksa. TypeScript dan build produksi diperiksa sebelum publikasi.
- Harness: workspace `work/browser-check/milestone15.cjs` dan `unified-permissions.cjs`.
- Belum ada pengujian sensor/kamera pada ponsel fisik dalam sesi ini. Simulasi tidak membuktikan akurasi perangkat, dukungan dialog Safari, ataupun performa baterai.

## Pengujian HP berikutnya

1. Buka situs HTTPS, tap **Izinkan & Mulai**, terima dialog browser. Pastikan kamera belakang menampilkan lingkungan.
2. Pada perangkat dengan orientasi absolut, angkat dari mendatar ke tegak. Label harus berubah dari **Mode mendatar** menjadi **Mode kamera**. Putar kiri/kanan perlahan: arah tujuan harus sesuai putaran.
3. Lewati posisi hampir tegak (sekitar 90°), lalu putar layar portrait/landscape. Jangan sampai muncul pembalikan 180° atau arah lama yang tertinggal.
4. Turunkan sedikit sekitar batas peralihan. Mode tidak boleh berkedip karena gerakan kecil. Turunkan lebih jauh untuk kembali ke mode mendatar.
5. Tutup kamera ketika tegak. Kompas harus meminta posisi mendatar sampai heading tepi layar kembali valid; tidak boleh memakai arah kamera yang tersisa.
6. Safari/WebKit: pastikan mode mendatar dan petunjuk keterbatasan tampil. Saat terlalu tegak, arah tidak ditampilkan sebagai pembacaan yang valid.
7. Ulangi cancel/deny, pindah aplikasi, kembali lalu **Lanjutkan panduan**. Tidak ada aktivasi otomatis saat kembali.
8. Catat model HP, OS, browser, sumber dan acuan pada Informasi teknis, serta hasil di ruang bebas gangguan magnet.

Overlay tetap bukan pelacakan permukaan/objek dunia nyata. FOV kamera belum dikalibrasi, utara magnetik/sejati belum dikoreksi, dan akurasi tetap bergantung pada sensor.

Referensi implementasi: [W3C koordinat dan rotasi Device Orientation](https://www.w3.org/TR/orientation-event/), [Apple DeviceOrientationEvent](https://developer.apple.com/documentation/webkitjs/deviceorientationevent), dan [implementasi WebCoreMotionManager](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/platform/ios/WebCoreMotionManager.mm).
