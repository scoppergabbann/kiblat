import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kiblat — Temukan Arah Kiblat",
  description: "Arahkan ponsel Anda untuk menemukan arah Ka'bah dari lokasi Anda.",
  applicationName: "Kiblat",
  appleWebApp: { capable: true, title: "Kiblat", statusBarStyle: "default" },
  icons: { apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }] },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0c2624",
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="id"><head>
    <link rel="manifest" href="/manifest.webmanifest" crossOrigin="use-credentials" />
  </head><body>{children}</body></html>;
}
