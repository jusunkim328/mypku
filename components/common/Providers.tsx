"use client";

import { type ReactNode } from "react";
import { ThemeProvider } from "./ThemeProvider";
import ErrorBoundary from "./ErrorBoundary";
import ToastContainer from "./Toast";
import SWUpdateNotifier from "./SWUpdateNotifier";
import { AuthProvider } from "@/contexts/AuthContext";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          {children}
          <ToastContainer />
          <SWUpdateNotifier />
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
