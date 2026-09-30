import LocationRequest from "@/components/LocationRequest";

export default function Home() {
  return (
    <main className="landing">
      <header className="flex items-center gap-2.5">
        <svg className="brand-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="m12 3 7 17-7-4-7 4 7-17Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
          <path d="M12 3v13" stroke="currentColor" strokeWidth="1.3"/>
        </svg>
        <span className="brand-name">kiblat<span className="brand-period">.</span></span>
      </header>

      <section className="hero" aria-labelledby="landing-title">
        <div className="direction-emblem" aria-hidden="true">
          <div className="orbit orbit-outer" />
          <div className="orbit orbit-inner" />
          <span className="orbit-tick tick-top" />
          <span className="orbit-tick tick-bottom" />
          <span className="orbit-tick tick-left" />
          <span className="orbit-tick tick-right" />
          <div className="emblem-center">
            <svg viewBox="0 0 64 64" fill="none">
              <path d="m32 9 17 43-17-10-17 10L32 9Z" fill="currentColor" fillOpacity=".12" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
              <path d="M32 10v32" stroke="currentColor" strokeWidth="1.5"/>
            </svg>
          </div>
        </div>
        <h1 id="landing-title">Temukan<br/>Arah <span>Kiblat</span></h1>
        <p className="intro">Arahkan ponsel Anda untuk menemukan arah Ka&apos;bah dari lokasi Anda.</p>
      </section>

      <footer className="actions">
        <LocationRequest />
        <div className="privacy">
          <svg width="18" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
            <path d="m8.5 12 2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <p>Lokasi, sensor arah, dan kamera diproses di perangkat Anda. Kiblat tidak menyimpan atau mengirim data tersebut.</p>
        </div>
        <details className="install-help">
          <summary>Pasang ke layar utama (opsional)</summary>
          <p>Kiblat tetap bisa digunakan langsung di browser tanpa dipasang.</p>
          <p><strong>Android:</strong> buka menu browser, lalu pilih Instal aplikasi atau Tambahkan ke layar utama jika tersedia.</p>
          <p><strong>iPhone/iPad:</strong> buka di Safari, ketuk Bagikan, lalu Tambahkan ke Layar Utama.</p>
          <p>Nama menu dapat berbeda. Koneksi internet tetap diperlukan untuk membuka aplikasi; izin lokasi, sensor, dan kamera tetap Anda tentukan.</p>
        </details>
        <div className="support">
          <a
            className="support-button"
            href="https://trakteer.id/mochammad_fawwaz/?t=1790778519792"
            target="_blank"
            rel="noopener noreferrer"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
            Berbagi
            <span className="sr-only"> (buka tab baru)</span>
          </a>
          <p>Seluruh dukungan untuk sesama.<br />Tanpa keuntungan pribadi.</p>
        </div>
      </footer>
    </main>
  );
}
