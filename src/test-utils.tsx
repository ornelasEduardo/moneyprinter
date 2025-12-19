import React, { ReactNode } from "react";
import { render as rtlRender, RenderOptions } from "@testing-library/react";
import { ToastProvider, ThemeProvider } from "doom-design-system";

// Define the wrapper component that provides all necessary contexts
const AllTheProviders = ({ children }: { children: ReactNode }) => {
  return (
    <ThemeProvider initialTheme="default">
      <ToastProvider>{children}</ToastProvider>
    </ThemeProvider>
  );
};

// Custom render function that uses the wrapper
const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, "wrapper">
) => rtlRender(ui, { wrapper: AllTheProviders, ...options });

// Re-export everything from RTL
export * from "@testing-library/react";

// Override render method
export { customRender as render };
