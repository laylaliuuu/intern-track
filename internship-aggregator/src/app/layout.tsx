import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "../providers/query-provider";
import { RealtimeProvider } from "../components/RealtimeProvider";
import { NotificationProvider } from "../components/NotificationSystem";
// Removed import for deleted accessibility component
import { ClientErrorBoundary } from "../components/ClientErrorBoundary";
import { setupGlobalErrorHandling } from "../lib/error-handling";
import { BrowserExtensionHandler } from "../components/BrowserExtensionHandler";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "InternTrack - Real-time Internship Aggregator",
  description: "Discover the freshest internship opportunities from top companies in real-time",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Set up global error handling on the client side
  if (typeof window !== 'undefined') {
    setupGlobalErrorHandling();
  }

  return (
    <html lang="en">
      <body className={inter.className} suppressHydrationWarning={true}>
        {/* SkipLink removed */}
        <BrowserExtensionHandler />
        <ClientErrorBoundary
          showDetails={process.env.NODE_ENV === 'development'}
        >
          <QueryProvider>
            <NotificationProvider>
              <RealtimeProvider>
                <div id="root" role="application" aria-label="InternTrack - Internship Aggregator">
                  {children}
                </div>
              </RealtimeProvider>
            </NotificationProvider>
          </QueryProvider>
        </ClientErrorBoundary>
      </body>
    </html>
  );
}
