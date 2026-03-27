import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const plusJakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta" });

export const metadata: Metadata = {
  title: "Auto Follow-Ups — AI Outreach Generator",
  description: "Generate personalized cold outreach and follow-up messages with AI",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${plusJakarta.variable}`}>
      <body className="font-body min-h-screen">
        {/* Ambient Glow Background globally */}
        <div className="fixed inset-0 bg-glow -z-[50] pointer-events-none" />
        <div className="fixed -top-[10%] -left-[10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full pointer-events-none -z-[40]" />
        <div className="fixed -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-purple-500/10 blur-[120px] rounded-full pointer-events-none -z-[40]" />
        
        <div className="relative z-0">
          <Providers>
            {children}
            <Toaster position="top-right" richColors theme="dark" />
          </Providers>
        </div>
      </body>
    </html>
  );
}
