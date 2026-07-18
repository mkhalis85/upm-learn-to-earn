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
        <footer className="mt-16 bg-gradient-to-r from-upm-goldDark to-upm-gold text-white">
          <div className="mx-auto max-w-5xl px-4 py-4 flex flex-wrap items-center justify-between gap-2 text-sm">
            <div>
              <span className="font-black">With Knowledge We Serve</span>
              <span className="ml-3 text-white/80 text-xs">Agriculture · Innovation · Life</span>
            </div>
            <div className="text-xs font-semibold text-white/90">
              Putra Learn-to-Earn · Universiti Putra Malaysia
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
