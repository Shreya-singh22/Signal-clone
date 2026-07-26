import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/lib/store";
import { ThemeProvider } from "@/lib/theme";
import ToastStack from "@/components/ToastStack";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Signal",
  description: "A Signal-inspired messaging experience.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="h-full overflow-hidden">
        <ThemeProvider>
          <AppProvider>
            {children}
            <ToastStack />
          </AppProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
