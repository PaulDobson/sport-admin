import type { Metadata, Viewport } from "next";
import "@fontsource-variable/jetbrains-mono";
import "@fontsource-variable/manrope";
import "@/presentation/styles/globals.css";
import { ServiceWorkerRegistration } from "./service-worker-registration";

export const metadata: Metadata = {
  title: "Sport Admin",
  description: "Plataforma SaaS multi-tenant para instructores independientes.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#14e18c",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <ServiceWorkerRegistration />
        {children}
      </body>
    </html>
  );
}
