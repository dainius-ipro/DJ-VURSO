import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VURSO",
  description: "Auto serviso valdymo sistema"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="lt">
      <body>{children}</body>
    </html>
  );
}
