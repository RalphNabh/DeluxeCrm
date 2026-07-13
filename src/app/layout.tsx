import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { TutorialWrapper } from "@/components/tutorial/tutorial-wrapper";
import { NotificationProvider } from "@/components/notifications/notification-provider";
import { NotificationToast } from "@/components/notifications/notification-toast";
import { QueryProvider } from "@/components/providers/query-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DyluxePro CRM | Professional Contractor Management",
  description: "Professional contractor CRM solution. Manage clients, estimates, invoices, and projects all in one place.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://dyluxepro.com'),
  icons: {
    icon: [
      { url: "/icons/icon-32.png", type: "image/png", sizes: "32x32" },
      { url: "/icons/icon-32.png", type: "image/png", sizes: "16x16" },
    ],
    apple: [{ url: "/icons/apple-touch.png", type: "image/png", sizes: "180x180" }],
    shortcut: "/icons/icon-32.png",
  },
  openGraph: {
    title: "DyluxePro CRM",
    description: "Professional contractor CRM solution",
    url: process.env.NEXT_PUBLIC_APP_URL || 'https://dyluxepro.com',
    siteName: "DyluxePro",
    type: "website",
    images: [{ url: "/logo.png", width: 512, height: 512, alt: "DyluxePro" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <QueryProvider>
          <NotificationProvider>
            <TutorialWrapper>
              <NotificationToast />
              {children}
            </TutorialWrapper>
          </NotificationProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
