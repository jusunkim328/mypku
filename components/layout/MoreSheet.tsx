"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ChefHat, Search, BookOpen, FileText, Trophy, Settings, Barcode, Droplet } from "lucide-react";
import BottomSheet from "./BottomSheet";

interface MoreSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MoreSheet({ isOpen, onClose }: MoreSheetProps) {
  const t = useTranslations("MoreMenu");

  const links = [
    { icon: ChefHat, label: t("recipes"), href: "/recipes" },
    { icon: Search, label: t("foodDatabase"), href: "/foods" },
    { icon: Barcode, label: t("scanBarcode"), href: "/scan" },
    { icon: Droplet, label: t("bloodLevels"), href: "/blood-levels" },
    { icon: BookOpen, label: t("learn"), href: "/learn" },
    { icon: FileText, label: t("report"), href: "/report" },
    { icon: Trophy, label: t("achievements"), href: "/profile" },
    { icon: Settings, label: t("settings"), href: "/settings" },
  ];

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      <div className="grid grid-cols-3 gap-4">
        {links.map(({ icon: Icon, label, href }) => (
          <Link
            key={href}
            href={href as never}
            onClick={onClose}
            className="flex flex-col items-center gap-2 p-3 rounded-xl active:bg-gray-100 dark:active:bg-gray-800 transition-colors"
          >
            <span className="flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
              <Icon className="w-5 h-5" />
            </span>
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300 text-center leading-tight">
              {label}
            </span>
          </Link>
        ))}
      </div>
    </BottomSheet>
  );
}
