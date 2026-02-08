"use client";

import { useTranslations } from "next-intl";
import { WifiOff } from "lucide-react";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

export default function OfflineBanner() {
  const isOnline = useNetworkStatus();
  const t = useTranslations("OfflineBanner");

  if (isOnline) return null;

  return (
    <div className="fixed bottom-14 left-0 right-0 z-50 flex justify-center pointer-events-none md:bottom-4">
      <div className="pointer-events-auto mx-4 px-4 py-2 rounded-full bg-amber-50 dark:bg-amber-900/80 border border-amber-200 dark:border-amber-700 shadow-lg flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300">
        <WifiOff className="w-4 h-4 shrink-0" />
        <p>{t("message")}</p>
      </div>
    </div>
  );
}
