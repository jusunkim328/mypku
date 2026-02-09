"use client";

import { useCallback, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { Camera, Barcode, PenLine, FlaskConical, Droplets, Heart, Radio, Mic } from "lucide-react";
import { useWaterRecords } from "@/hooks/useWaterRecords";
import BottomSheet from "./BottomSheet";

interface QuickActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function QuickActionSheet({ isOpen, onClose }: QuickActionSheetProps) {
  const t = useTranslations("QuickActions");
  const router = useRouter();
  const pathname = usePathname();
  const { addGlass } = useWaterRecords();

  const observerRef = useRef<MutationObserver | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cleanupObserver = useCallback(() => {
    observerRef.current?.disconnect();
    observerRef.current = null;
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => cleanupObserver();
  }, [cleanupObserver]);

  const navigate = (path: string) => {
    onClose();
    router.push(path as never);
  };

  const handleAddWater = async () => {
    await addGlass();
    onClose();
  };

  const scrollToFormula = useCallback(() => {
    const el = document.getElementById("formula-widget");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      return true;
    }
    return false;
  }, []);

  const handleFormulaCheck = useCallback(() => {
    onClose();
    // Clean up any previous observer
    cleanupObserver();

    if (pathname === "/") {
      if (scrollToFormula()) return;
    }
    router.push("/" as never);
    const observer = new MutationObserver(() => {
      if (scrollToFormula()) {
        cleanupObserver();
      }
    });
    observerRef.current = observer;
    observer.observe(document.body, { childList: true, subtree: true });
    timeoutRef.current = setTimeout(() => cleanupObserver(), 3000);
  }, [onClose, pathname, router, scrollToFormula, cleanupObserver]);

  const actions = [
    { id: "live", icon: Radio, label: t("videoTalk"), onClick: () => navigate("/analyze?mode=live") },
    { id: "photo", icon: Camera, label: t("takePhoto"), onClick: () => navigate("/analyze") },
    { id: "voice", icon: Mic, label: t("voice"), onClick: () => navigate("/analyze?mode=voice") },
    { id: "manual", icon: PenLine, label: t("manualEntry"), onClick: () => navigate("/analyze?mode=manual") },
    { id: "favorites", icon: Heart, label: t("favorites"), onClick: () => navigate("/analyze?mode=favorites") },
    { id: "formula", icon: FlaskConical, label: t("formulaCheck"), onClick: handleFormulaCheck },
    { id: "water", icon: Droplets, label: t("addWater"), onClick: handleAddWater },
    { id: "barcode", icon: Barcode, label: t("scanBarcode"), onClick: () => navigate("/scan") },
  ];

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      <div className="grid grid-cols-3 gap-4">
        {actions.map(({ id, icon: Icon, label, onClick }) => (
          <button
            key={id}
            type="button"
            onClick={onClick}
            className="flex flex-col items-center gap-2 p-3 rounded-xl active:bg-gray-100 dark:active:bg-gray-800 transition-colors"
          >
            <span className="flex items-center justify-center w-12 h-12 rounded-full bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400">
              <Icon className="w-5 h-5" />
            </span>
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300 text-center leading-tight">
              {label}
            </span>
          </button>
        ))}
      </div>
    </BottomSheet>
  );
}
