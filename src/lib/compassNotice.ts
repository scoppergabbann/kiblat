export type CompassNotice = { title: string; detail: string };
export function getCompassNotice(status: string): CompassNotice {
  switch (status) {
    case "idle": return { title: "Aktifkan sensor arah", detail: "Ketuk Izinkan sensor arah untuk membaca arah ponsel." };
    case "requesting": return { title: "Izinkan sensor di browser", detail: "Pilih Izinkan pada dialog akses gerak dan orientasi." };
    case "waiting": return { title: "Membaca sensor kompas", detail: "Tahan ponsel sejenak. Tidak perlu terus menggerakkannya." };
    case "tilted": return { title: "Miringkan ponsel lebih mendatar", detail: "Ponsel terlalu tegak untuk membaca arah tepi atas layar. Turunkan kemiringannya perlahan." };
    case "denied": return { title: "Izin sensor belum diberikan", detail: "Izinkan akses gerak dan orientasi melalui pengaturan situs, lalu coba lagi." };
    case "unsupported": return { title: "Sensor arah tidak didukung", detail: "Coba browser ponsel yang mendukung kompas. Arah Kiblat dari utara tetap ditampilkan." };
    case "paused": return { title: "Sensor dijeda", detail: "Ketuk Coba sensor lagi untuk melanjutkan setelah kembali ke halaman." };
    case "unavailable": return { title: "Data sensor terhenti", detail: "Periksa izin gerak dan orientasi, lalu ketuk Coba sensor lagi." };
    case "unreliable": return { title: "Arah belum dapat dipercaya", detail: "Periksa panduan kalibrasi dan posisi ponsel. Browser belum memberi pembacaan kompas yang layak." };
    default: return { title: "Sensor belum dapat dibaca", detail: "Periksa izin dan posisi ponsel, lalu coba sensor lagi." };
  }
}
