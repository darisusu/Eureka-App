import type { Metadata } from "next";
import { Quicksand } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css";

const quicksand = Quicksand({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-quicksand",
});

export const metadata: Metadata = {
  title: "Eureka",
  description: "Preorder and prepay for grab-and-go food",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${quicksand.variable} h-full`}>
      <body className="min-h-full font-quicksand antialiased">
        {children}
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
