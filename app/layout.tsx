import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/app/providers";
import { Toaster } from "@/components/ui/sonner";
import { BottomNavWrapper } from "@/components/navigation/BottomNavWrapper";
import { BodyPaddingWrapper } from "@/components/layout/BodyPaddingWrapper";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FitTrack - Fitness Tracking App",
  description: "Track your workouts and progress",
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover', // Support iOS safe area
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          <BodyPaddingWrapper>{children}</BodyPaddingWrapper>
        </Providers>
        <BottomNavWrapper />
        <Toaster />
      </body>
    </html>
  );
}
