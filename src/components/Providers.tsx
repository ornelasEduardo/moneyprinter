'use client';
import { ToastProvider } from 'doom-design-system';


export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      {children}
    </ToastProvider>
  );
}
