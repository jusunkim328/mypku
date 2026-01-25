"use client";

import { type ReactNode } from "react";
import ErrorBoundary from "./ErrorBoundary";
import ToastContainer from "./Toast";
import { AuthProvider } from "@/contexts/AuthContext";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <AuthProvider>
        {children}
        <ToastContainer />
      </AuthProvider>
    </ErrorBoundary>
  );
}
