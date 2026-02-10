"use client";

import { type ReactNode } from "react";
import { ThemeProvider } from "./ThemeProvider";
import ErrorBoundary from "./ErrorBoundary";
import ToastContainer from "./Toast";
import UndoToast from "@/components/ui/UndoToast";
import SWUpdateNotifier from "./SWUpdateNotifier";
import { AuthProvider } from "@/contexts/AuthContext";
import BottomNav from "@/components/layout/BottomNav";
import OfflineBanner from "./OfflineBanner";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          {children}
          <BottomNav />
          <OfflineBanner />
          <ToastContainer />
          <UndoToast />
          <SWUpdateNotifier />
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
