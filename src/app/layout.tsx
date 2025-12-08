import type { Metadata } from "next";

import { Providers } from "@/components/Providers";
import { DesignSystemProvider } from "doom-design-system";
import { getThemePreference } from "@/lib/theme";

import { Montserrat } from "next/font/google";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  display: "swap",
});

export const metadata: Metadata = {
  title: "MoneyPrinter",
  description: "Local-first personal finance",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const theme = await getThemePreference();

  return (
    <html lang="en">
      <head suppressHydrationWarning>
      </head>
      <DesignSystemProvider initialTheme={theme} withBody fontClassName={montserrat.variable}>
        <Providers>
          {children}
        </Providers>
      </DesignSystemProvider>
    </html>
  );
}
