import type { Metadata } from "next";
import { Geist, Geist_Mono, Pacifico, Poppins } from "next/font/google";
import "./globals.css";
import PortalHeader from "./components/PortalHeader";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const pacifico = Pacifico({
  subsets: ["latin"],
  weight: "400",
});
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["600", "700"],
});
export const metadata: Metadata = {
  title: "ortho prime",
  description: "A responsive orthodontic practice dashboard built by an Iraqi dental team to help orthodontists manage patients and appointments.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-slate-50 text-slate-900 antialiased">
          <PortalHeader />

        <div className="min-h-full">
          <div className="min-h-screen content-offset">{children}</div>
        </div>
      </body>
    </html>
  );
}
