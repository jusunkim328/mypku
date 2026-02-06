"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui";
import { HelpCircle, ChevronDown } from "lucide-react";

const FAQ_ITEMS = [
  "eatNormally",
  "highPheFoods",
  "whatIsFormula",
  "testFrequency",
  "canBeCured",
  "highLevelsEffect",
  "isHereditary",
] as const;

export default function FAQ() {
  const t = useTranslations("Learn");
  const [openItem, setOpenItem] = useState<string | null>(null);

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <HelpCircle className="w-5 h-5 text-blue-500" />
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
          {t("faqTitle")}
        </h2>
      </div>

      <div className="space-y-0.5">
        {FAQ_ITEMS.map((item) => (
          <div
            key={item}
            className="border-b border-gray-100 dark:border-gray-700/50 last:border-b-0"
          >
            <button
              onClick={() => setOpenItem(openItem === item ? null : item)}
              className="w-full flex items-center gap-2 py-3 text-left"
            >
              <span className="flex-1 text-sm font-medium text-gray-900 dark:text-gray-100">
                {t(`faq_${item}_q`)}
              </span>
              <ChevronDown
                className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${
                  openItem === item ? "rotate-180" : ""
                }`}
              />
            </button>
            {openItem === item && (
              <div className="pb-3 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                {t(`faq_${item}_a`)}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
          {t("faqDisclaimer")}
        </p>
      </div>
    </Card>
  );
}
