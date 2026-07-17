import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Putra L2E — Learn to Earn",
  description: "Learn, contribute, and earn PutraToken points — Universiti Putra Malaysia",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
        <footer className="mt-16 border-t border-upm-border/60 bg-black/20">
          <div className="mx-auto max-w-5xl px-4 py-6 text-center text-xs text-upm-muted">
            Putra Learn-to-Earn · <span className="text-upm-gold font-semibold">Universiti Putra Malaysia</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
