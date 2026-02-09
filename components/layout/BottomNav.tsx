"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { Home, Camera, BookOpen, Settings } from "lucide-react";

const HIDDEN_ROUTES = ["/onboarding", "/auth", "/invite", "/~offline"];

interface NavItem {
  href: "/" | "/analyze" | "/recipes" | "/settings";
  icon: typeof Home;
  labelKey: "home" | "record" | "recipes" | "settings";
}

const NAV_ITEMS: NavItem[] = [
  { href: "/", icon: Home, labelKey: "home" },
  { href: "/analyze", icon: Camera, labelKey: "record" },
  { href: "/recipes", icon: BookOpen, labelKey: "recipes" },
  { href: "/settings", icon: Settings, labelKey: "settings" },
];

export default function BottomNav() {
  const t = useTranslations("BottomNav");
  const pathname = usePathname();

  // 특정 페이지에서는 숨김
  if (HIDDEN_ROUTES.some((route) => pathname.startsWith(route))) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-nav md:hidden">
      <div className="glass border-t border-gray-200/50 dark:border-gray-700/50 pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-2xl mx-auto flex items-center justify-around">
          {NAV_ITEMS.map(({ href, icon: Icon, labelKey }) => {
            const isActive =
              href === "/"
                ? pathname === "/"
                : pathname.startsWith(href);

            return (
              <Link
                key={href}
                href={href}
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
  );
}
