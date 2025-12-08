import type { Metadata } from "next";

import { Providers } from "@/components/Providers";
import { DesignSystemProvider, getThemePreference } from "doom-design-system";

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
      <DesignSystemProvider initialTheme={theme} withBody>
        <Providers>
          {children}
        </Providers>
      </DesignSystemProvider>
    </html>
  );
}
