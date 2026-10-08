import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { ThemeModeProvider } from "@/components/ThemeModeManager";

export const metadata: Metadata = {
  title: "Amazon Route 53 — AWS Management Console",
  description: "Scalable DNS and Domain Name System (DNS) web service",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen">
        <ThemeModeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeModeProvider>
      </body>
    </html>
  );
}
