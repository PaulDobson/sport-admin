import type { Metadata, Viewport } from "next";
import "@fontsource-variable/jetbrains-mono";
import "@fontsource-variable/manrope";
import "@/presentation/styles/globals.css";
import { NavigationProgressBar } from "@/presentation/components/navigation-progress-bar";
import { ServiceWorkerRegistration } from "./service-worker-registration";

export const metadata: Metadata = {
  title: "Sport Admin",
  description:
    "Gestión de alumnos, clases, asistencia y cobros para organizaciones deportivas.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#15191b",
  userScalable: true,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="bg-background">
      <body className="antialiased">
        <NavigationProgressBar />
        <ServiceWorkerRegistration />
        {children}
      </body>
    </html>
  );
}
