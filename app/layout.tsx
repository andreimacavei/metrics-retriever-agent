import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { SidebarRefreshProvider } from "@/components/sidebar-refresh-context";
import { ReportContextProvider } from "@/components/report-context";
import { AppLayout } from "@/components/app-layout";
import { VoiceFab } from "@/components/voice-fab";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Analytics Report Builder",
  description: "AI-powered analytics report builder with Claude 3.5 Sonnet",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SidebarRefreshProvider>
            <ReportContextProvider>
              <AppLayout>
                {children}
              </AppLayout>
              <VoiceFab />
            </ReportContextProvider>
          </SidebarRefreshProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
