"use client";

import { useTranslations } from "next-intl";
import { Block } from "@/components/ui";

export default function Disclaimer() {
  const t = useTranslations("Disclaimer");

  return (
    <Block className="!mt-6 !p-0">
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
        <p className="font-semibold text-gray-600 dark:text-gray-300 mb-1">{t("title")}</p>
        <p>{t("content")}</p>
      </div>
    </Block>
  );
}
