import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AccessPulse",
  description: "Turning community feedback into actionable accessibility insights.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
