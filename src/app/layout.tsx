import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { TutorialWrapper } from "@/components/tutorial/tutorial-wrapper";
import { NotificationProvider } from "@/components/notifications/notification-provider";
import { NotificationToast } from "@/components/notifications/notification-toast";

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
  openGraph: {
    title: "DyluxePro CRM",
    description: "Professional contractor CRM solution",
    url: process.env.NEXT_PUBLIC_APP_URL || 'https://dyluxepro.com',
    siteName: "DyluxePro",
    type: "website",
  },
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
        <NotificationProvider>
          <TutorialWrapper>
            <NotificationToast />
            {children}
          </TutorialWrapper>
        </NotificationProvider>
      </body>
    </html>
  );
}
