"use client";

import { useTranslations } from "next-intl";
import { Card } from "@/components/ui";
import { Dna, Brain, Apple, TestTubes } from "lucide-react";
import AccordionItem from "@/components/learn/AccordionItem";

export default function WhatIsPKU() {
  const t = useTranslations("Learn");

  return (
    <Card className="p-4">
      <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">
        {t("whatIsPkuTitle")}
      </h2>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
        {t("whatIsPkuSubtitle")}
      </p>

      <AccordionItem
        title={t("whatIsPku")}
        icon={<Dna className="w-4 h-4 text-primary-500" />}
        defaultOpen={true}
      >
        <p>{t("whatIsPkuContent1")}</p>
        <p>{t("whatIsPkuContent2")}</p>
      </AccordionItem>

      <AccordionItem
        title={t("whatIsPhe")}
        icon={<Apple className="w-4 h-4 text-primary-500" />}
      >
        <p>{t("whatIsPheContent1")}</p>
        <p>{t("whatIsPheContent2")}</p>
      </AccordionItem>

      <AccordionItem
        title={t("howPkuAffects")}
        icon={<Brain className="w-4 h-4 text-primary-500" />}
      >
        <p>{t("howPkuAffectsContent1")}</p>
        <p>{t("howPkuAffectsContent2")}</p>
      </AccordionItem>

      <AccordionItem
        title={t("understandingLevels")}
        icon={<TestTubes className="w-4 h-4 text-primary-500" />}
      >
        <p>{t("understandingLevelsContent1")}</p>
        <div className="mt-2 bg-gray-50 dark:bg-gray-800 rounded-lg p-3 space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
            <span className="text-xs">{t("levelNormal")}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
            <span className="text-xs">{t("levelElevated")}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span className="text-xs">{t("levelHigh")}</span>
          </div>
        </div>
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 italic">
          {t("levelDisclaimer")}
        </p>
      </AccordionItem>
    </Card>
  );
}
