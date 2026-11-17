import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AquaLoop — Give Water a Second Life",
  description: "A low-cost, sensor-controlled greywater recovery system for measured, non-potable reuse.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
