import type { Metadata } from "next";
import { Montserrat, Oswald } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { ThemeStyleTag } from "@/lib/themes/ThemeStyleTag";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
});

const oswald = Oswald({
  subsets: ["latin"],
  variable: "--font-oswald",
});

export const metadata: Metadata = {
  title: "MoneyPrinter",
  description: "Local-first personal finance",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head suppressHydrationWarning>
        <ThemeStyleTag />
      </head>
      <body className={`${montserrat.variable} ${oswald.variable}`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
