# Kiblat

Aplikasi web pencari arah Kiblat dengan kompas dan panduan kamera 3D, dibuat menggunakan Next.js, TypeScript, React, Tailwind CSS, dan Three.js langsung.

## Menjalankan proyek

Gunakan Node.js **22.19.0** (versi yang digunakan untuk verifikasi paket ini) dan npm. Versi Node juga tersedia di `.nvmrc`.

```sh
npm ci
npm run dev
```

Buka `http://localhost:3000`. Tidak diperlukan API key, database, file `.env`, atau akun Sites.

Untuk mencoba kamera, lokasi, dan sensor dari HP, gunakan URL **HTTPS**. Membuka alamat IP komputer melalui HTTP bukan pengganti HTTPS untuk izin tersebut. Sensor kompas memerlukan perangkat yang mendukung.

## Build dan pengujian

```sh
npm test
npm run typecheck
npm run build
```

Proyek menggunakan `output: "export"`. Build menghasilkan website statis dalam folder **`out/`**. Deploy isi folder itu pada hosting statis HTTPS. `next start` tidak digunakan untuk mode static export ini.

Paket sumber diperiksa pada 30 September 2026: **33 kelompok unit test dan production build termasuk TypeScript berhasil**. Pengujian sensor, kamera, dan performa ponsel fisik tetap diperlukan.

## Memindahkan ke GitHub

1. Ekstrak ZIP, lalu buka terminal di dalam folder `kiblat-github`, tempat `package.json` berada.
2. Buat repository GitHub kosong bernama `kiblat`. Jangan tambahkan README atau `.gitignore` dari GitHub karena keduanya sudah tersedia di paket ini.
3. Ganti `USERNAME` dengan nama akun GitHub Anda, lalu jalankan:

```sh
git init
git add .
git commit -m "Initial commit: Kiblat"
git branch -M main
git remote add origin https://github.com/USERNAME/kiblat.git
git push -u origin main
```

Autentikasi memakai akun GitHub Anda atau GitHub Desktop. Alternatifnya, tambahkan folder hasil ekstraksi sebagai repository lokal di GitHub Desktop lalu pilih Publish repository. Upload **isi folder proyek**, bukan ZIP-nya, jika memakai antarmuka web GitHub.

Menyimpan repository di GitHub tidak otomatis menerbitkan website. Konfigurasi saat ini melayani aplikasi pada akar domain (`/`). GitHub Pages berbasis subpath seperti `/kiblat/` memerlukan penyesuaian `basePath` dan path manifest/ikon sebelum deployment.

## Fitur

- Satu tombol **Izinkan & Mulai** meminta lokasi, sensor, dan kamera; browser dapat menampilkan dialog terpisah.
- Perhitungan bearing Kiblat, pembacaan kompas, smoothing, kalibrasi, serta status arah.
- Kamera HTML dengan Ka'bah 3D, jalan perspektif melengkung, chevron bergerak, dan cincin tujuan Three.js.
- Fallback kompas tanpa kamera dan panduan sederhana jika WebGL tidak tersedia.
- Mode kamera tegak untuk orientasi absolut dan kamera belakang yang terkonfirmasi; mode mendatar untuk kondisi lainnya.
- Izin dan resource dihentikan sesuai lifecycle; tidak otomatis mengaktifkan ulang saat kembali dari background.
- Manifest dan ikon untuk pemasangan opsional ke layar utama.

## Privasi dan batasan

Kiblat memproses lokasi, orientasi, dan video di perangkat; aplikasi tidak menyimpan atau mengunggahnya. Tidak ada rekaman kamera, mikrofon, analitik sensor, atau backend aplikasi. Browser/OS dan penyedia hosting tetap memiliki perilaku layanannya sendiri.

Arah adalah perkiraan sensor. Koreksi utara magnetik terhadap utara sejati belum diterapkan. Safari/WebKit masih memakai mode mendatar. Overlay bukan pelacakan permukaan atau objek dunia nyata, dan pemasangan ke layar utama tidak menyediakan mode offline.

## Struktur

```text
src/app/          Halaman, layout, dan stylesheet
src/components/   Antarmuka kompas, izin, kamera, dan scene AR
src/hooks/        Lifecycle lokasi, kamera, sensor, dan feedback
src/lib/          Perhitungan arah dan helper Three.js
public/           Ikon dan manifest
tests/            Unit tests
scripts/          Generator ikon PWA
docs/             Dokumentasi dan checklist pengujian
```

Dependensi dipatok melalui `package-lock.json`. `.gitignore` mengecualikan dependensi terpasang, cache, hasil build, dan environment lokal. Paket tidak menyertakan `.git`, `.openai/hosting.json`, `node_modules`, `.next`, atau `out`; file aplikasi dan aset tetap disertakan.

## Dokumentasi

- [Scene Three.js dan parameter tuning](docs/MILESTONE-14.md)
- [Mode tegak dan checklist ponsel](docs/MILESTONE-15.md)
- [Alur izin satu tombol](docs/UNIFIED-PERMISSIONS.md)
- [Riwayat pengembangan](docs/DEVELOPMENT-HISTORY.md) — catatan milestone lama bersifat historis; gunakan README ini untuk memulai proyek.

Skrip simulasi browser yang disebut dalam catatan historis berada di workspace pengembangan lama dan bukan dependensi aplikasi atau bagian dari paket ini. Semua unit test yang dijalankan melalui `npm test` tersedia dalam repository ini.
