import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FIN-XL — Personal Finance Tracker",
  description: "Track your money by simply talking to it. Built with Spring Boot & Next.js.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-background text-zinc-100 min-h-screen selection:bg-primary/30 selection:text-white antialiased overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}
