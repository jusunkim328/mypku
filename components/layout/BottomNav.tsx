"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { Home, Camera, Plus, ClipboardList, MoreHorizontal } from "lucide-react";
import QuickActionSheet from "./QuickActionSheet";
import MoreSheet from "./MoreSheet";

const HIDDEN_ROUTES = ["/onboarding", "/auth", "/invite", "/~offline"];

interface NavItem {
  type: "link";
  href: string;
  icon: typeof Home;
  labelKey: "home" | "record" | "history";
}

interface NavAction {
  type: "fab" | "more";
  icon: typeof Plus;
  labelKey: "quickActions" | "more";
}

type NavEntry = NavItem | NavAction;

const NAV_ENTRIES: NavEntry[] = [
  { type: "link", href: "/", icon: Home, labelKey: "home" },
  { type: "link", href: "/analyze?mode=live", icon: Camera, labelKey: "record" },
  { type: "fab", icon: Plus, labelKey: "quickActions" },
  { type: "link", href: "/history", icon: ClipboardList, labelKey: "history" },
  { type: "more", icon: MoreHorizontal, labelKey: "more" },
];

export default function BottomNav() {
  const t = useTranslations("BottomNav");
  const pathname = usePathname();
  const [quickActionOpen, setQuickActionOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  // 특정 페이지에서는 숨김
  if (HIDDEN_ROUTES.some((route) => pathname.startsWith(route))) {
    return null;
  }

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-nav md:hidden">
        <div className="glass border-t border-gray-200/50 dark:border-gray-700/50 pb-[env(safe-area-inset-bottom)]">
          <div className="max-w-2xl mx-auto flex items-center justify-around">
            {NAV_ENTRIES.map((entry) => {
              if (entry.type === "fab") {
                const Icon = entry.icon;
                return (
                  <button
                    key="fab"
                    type="button"
                    onClick={() => setQuickActionOpen((prev) => !prev)}
                    className="flex flex-col items-center justify-center -translate-y-3"
                    aria-label={t(entry.labelKey)}
                  >
                    <span className="flex items-center justify-center w-12 h-12 rounded-full bg-primary-600 text-white shadow-lg active:scale-95 transition-transform">
                      <Icon className="w-6 h-6 stroke-[2]" />
                    </span>
                  </button>
                );
              }

              if (entry.type === "more") {
                const Icon = entry.icon;
                return (
                  <button
                    key="more"
                    type="button"
                    onClick={() => setMoreOpen((prev) => !prev)}
                    className={`
                      flex flex-col items-center justify-center gap-0.5
                      min-w-[64px] min-h-[48px] py-2 px-3
                      transition-colors duration-200
                      text-gray-400 dark:text-gray-500 active:text-gray-600 dark:active:text-gray-300
                    `}
                    aria-label={t(entry.labelKey)}
                  >
                    <Icon className="w-5 h-5 stroke-[1.5]" />
                    <span className="text-[10px] font-medium leading-tight">
                      {t(entry.labelKey)}
                    </span>
                  </button>
                );
              }

              // type === "link"
              const { href, icon: Icon, labelKey } = entry as NavItem;
              const basePath = href.split("?")[0];
              const isActive =
                basePath === "/"
                  ? pathname === "/"
                  : pathname.startsWith(basePath);

              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={isActive ? "page" : undefined}
                  className={`
                    flex flex-col items-center justify-center gap-0.5
                    min-w-[64px] min-h-[48px] py-2 px-3
                    transition-colors duration-200
                    ${
                      isActive
                        ? "text-primary-600 dark:text-primary-400"
                        : "text-gray-400 dark:text-gray-500 active:text-gray-600 dark:active:text-gray-300"
                    }
                  `}
                >
                  <Icon
                    className={`w-5 h-5 ${isActive ? "stroke-[2.5]" : "stroke-[1.5]"}`}
                  />
                  <span className="text-[10px] font-medium leading-tight">
                    {t(labelKey)}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      <QuickActionSheet
        isOpen={quickActionOpen}
        onClose={() => setQuickActionOpen(false)}
      />
      <MoreSheet
        isOpen={moreOpen}
        onClose={() => setMoreOpen(false)}
      />
    </>
  );
}
