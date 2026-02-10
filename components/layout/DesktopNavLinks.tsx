"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import {
  Home,
  Camera,
  ClipboardList,
  ChefHat,
  Search,
  Barcode,
  Droplet,
  BookOpen,
  FileText,
  Trophy,
  Settings,
  Menu,
} from "lucide-react";

const DROPDOWN_LINKS = [
  { href: "/", icon: Home, labelKey: "home", ns: "BottomNav" as const },
  { href: "/analyze?mode=live", icon: Camera, labelKey: "record", ns: "BottomNav" as const },
  { href: "/history", icon: ClipboardList, labelKey: "history", ns: "BottomNav" as const },
  { href: "/recipes", icon: ChefHat, labelKey: "recipes", ns: "MoreMenu" as const },
  { href: "/foods", icon: Search, labelKey: "foodDatabase", ns: "MoreMenu" as const },
  { href: "/scan", icon: Barcode, labelKey: "scanBarcode", ns: "MoreMenu" as const },
  { href: "/blood-levels", icon: Droplet, labelKey: "bloodLevels", ns: "MoreMenu" as const },
  { href: "/learn", icon: BookOpen, labelKey: "learn", ns: "MoreMenu" as const },
  { href: "/report", icon: FileText, labelKey: "report", ns: "MoreMenu" as const },
  { href: "/profile", icon: Trophy, labelKey: "achievements", ns: "MoreMenu" as const },
  { href: "/settings", icon: Settings, labelKey: "settings", ns: "MoreMenu" as const },
];

export default function DesktopNavLinks() {
  const tNav = useTranslations("BottomNav");
  const tMore = useTranslations("MoreMenu");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Click outside 닫기
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // Escape 키 닫기
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  // 라우트 변경 시 자동 닫기 (뒤로가기/앞으로 포함)
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div ref={containerRef} className="relative hidden md:flex">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`
          flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium
          transition-colors duration-200
          ${open
            ? "text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30"
            : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
          }
        `}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Menu className="w-5 h-5" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 min-w-[200px] py-2 rounded-xl glass border border-gray-200/50 dark:border-gray-700/50 shadow-elevated z-50">
          {DROPDOWN_LINKS.map(({ href, icon: Icon, labelKey, ns }) => {
            const basePath = href.split("?")[0];
            const isActive =
              basePath === "/" ? pathname === "/" : pathname.startsWith(basePath);
            const label = ns === "BottomNav" ? tNav(labelKey) : tMore(labelKey);

            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={`
                  flex items-center gap-3 px-4 py-2.5 text-sm font-medium
                  transition-colors duration-150
                  ${
                    isActive
                      ? "text-primary-600 dark:text-primary-400 bg-primary-50/50 dark:bg-primary-900/20"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  }
                `}
              >
                <Icon className={`w-4 h-4 ${isActive ? "stroke-[2.5]" : "stroke-[1.5]"}`} />
                <span>{label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
